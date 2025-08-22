import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PDFDocument } from '../context/PDFContext';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, MessageCircle, Minus, Plus, Sparkles, X, Loader2, Copy, AlertTriangle, RefreshCw } from 'lucide-react';
import { openDB } from 'idb';
import { initializePDFJS, loadPDFDocument, isPDFJSReady } from '../utils/pdfJsInitializer';

interface RobustPDFJSViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
  onTextSelection?: (text: string, page: number) => void;
}

// Import PDF loading strategies from utility
import { PDF_LOADING_STRATEGIES } from '../utils/pdfJsInitializer';

// Enhanced error types
interface PDFError {
  type: 'NETWORK' | 'WORKER' | 'PARSING' | 'RENDERING' | 'UNKNOWN';
  message: string;
  details?: any;
  recoverable: boolean;
}

// IndexedDB functions for annotations
async function getDb() {
  return openDB("pdf-annotations", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("annotations")) {
        db.createObjectStore("annotations", { keyPath: "id" });
      }
    },
  });
}

async function saveAnnotation(annotation: any) {
  const db = await getDb();
  await db.put("annotations", annotation);
}

async function deleteAnnotation(id: string) {
  const db = await getDb();
  await db.delete("annotations", id);
}

async function loadAllAnnotations(fileId: string) {
  const db = await getDb();
  const all = await db.getAll("annotations");
  return all.filter((a: any) => a.fileId === fileId);
}

const RobustPDFJSViewer: React.FC<RobustPDFJSViewerProps> = ({ document, onPageChange, onTextSelection }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PDFError | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [showAskGemini, setShowAskGemini] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // Debug logging
  const addDebug = useCallback((message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  // Enhanced PDF.js initialization using the new utility
  const initializePDFJSLib = useCallback(async (): Promise<any> => {
    try {
      const result = await initializePDFJS(
        undefined, // No preferred strategy
        (strategy, status) => {
          addDebug(`🔄 ${strategy}: ${status}`);
        }
      );

      if (result.success) {
        addDebug(`✅ PDF.js initialized with ${result.strategy}`);
        return result.pdfjsLib;
      } else {
        throw new Error(result.error || 'PDF.js initialization failed');
      }
    } catch (error) {
      addDebug(`❌ PDF.js initialization failed: ${error}`);
      throw error;
    }
  }, [addDebug]);

  // Enhanced error classification
  const classifyError = useCallback((error: any): PDFError => {
    const message = error?.message || error?.toString() || 'Unknown error';
    
    if (message.includes('NetworkError') || message.includes('fetch')) {
      return {
        type: 'NETWORK',
        message: 'Network connection failed. Check your internet connection.',
        details: error,
        recoverable: true
      };
    }
    
    if (message.includes('worker') || message.includes('Worker')) {
      return {
        type: 'WORKER',
        message: 'PDF worker failed to load. Trying alternative loading method.',
        details: error,
        recoverable: true
      };
    }
    
    if (message.includes('Invalid PDF') || message.includes('corrupted')) {
      return {
        type: 'PARSING',
        message: 'PDF file appears to be corrupted or invalid.',
        details: error,
        recoverable: false
      };
    }
    
    if (message.includes('canvas') || message.includes('render')) {
      return {
        type: 'RENDERING',
        message: 'Failed to render PDF page. Trying different approach.',
        details: error,
        recoverable: true
      };
    }
    
    return {
      type: 'UNKNOWN',
      message: `Unexpected error: ${message}`,
      details: error,
      recoverable: true
    };
  }, []);

  // Enhanced PDF loading with comprehensive error handling
  const loadPDF = useCallback(async (forceRetry: boolean = false) => {
    if (!document?.url) {
      setError({
        type: 'UNKNOWN',
        message: 'No document URL provided',
        recoverable: false
      });
      return;
    }

    setLoading(true);
    setError(null);

    if (forceRetry) {
      setRetryCount(prev => prev + 1);
    }

    try {
      addDebug(`🔄 Starting PDF load process`);

      // Initialize PDF.js with comprehensive fallback
      const pdfjsLib = await initializePDFJSLib();

      if (!isPDFJSReady(pdfjsLib)) {
        throw new Error('PDF.js not properly initialized');
      }

      addDebug(`🔄 Loading PDF document: ${document.url}`);

      // Load PDF document with enhanced error handling
      const pdf = await loadPDFDocument(
        document.url,
        pdfjsLib,
        {
          verbosity: 0, // Reduce console noise
          disableAutoFetch: false,
          disableStream: false,
          disableRange: false,
        },
        3 // Max retries
      );

      addDebug(`✅ PDF loaded successfully: ${pdf.numPages} pages`);

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setLoading(false);
      setError(null);

      // Render first page and generate thumbnails
      await renderPage(1, pdf, scale);
      generateThumbnails(pdf);

      // Load annotations
      const ann = await loadAllAnnotations(document.id);
      setAnnotations(ann);

    } catch (err) {
      const pdfError = classifyError(err);
      addDebug(`❌ PDF loading failed: ${pdfError.message}`);

      setError(pdfError);
      setLoading(false);
    }
  }, [document?.url, document?.id, addDebug, initializePDFJSLib, classifyError, scale]);

  // Enhanced page rendering with error recovery
  const renderPage = useCallback(async (pageNumber: number, pdf: any, currentScale: number) => {
    if (!pdf || !canvasRef.current) return;

    try {
      addDebug(`🎨 Rendering page ${pageNumber}`);
      
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: currentScale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Canvas context not available');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Clear previous content
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      
      // Render text layer for selection
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = '';
        textLayerRef.current.style.width = `${viewport.width}px`;
        textLayerRef.current.style.height = `${viewport.height}px`;
        
        try {
          const textContent = await page.getTextContent();
          
          // Simple text layer rendering
          textContent.items.forEach((item: any, index: number) => {
            if (item.str) {
              const textDiv = document.createElement('div');
              textDiv.textContent = item.str;
              textDiv.style.position = 'absolute';
              textDiv.style.left = `${item.transform[4]}px`;
              textDiv.style.top = `${viewport.height - item.transform[5]}px`;
              textDiv.style.fontSize = `${item.transform[0]}px`;
              textDiv.style.fontFamily = item.fontName || 'sans-serif';
              textDiv.style.color = 'transparent';
              textDiv.style.cursor = 'text';
              textDiv.className = 'pdf-text-item';
              
              textLayerRef.current?.appendChild(textDiv);
            }
          });
          
          addDebug(`✅ Text layer rendered with ${textContent.items.length} items`);
        } catch (textError) {
          addDebug(`⚠️ Text layer rendering failed: ${textError}`);
        }
      }
      
      addDebug(`✅ Page ${pageNumber} rendered successfully`);
      
    } catch (renderError) {
      addDebug(`❌ Page rendering failed: ${renderError}`);
      
      // Try fallback rendering without text layer
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: currentScale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        
        if (canvas && context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
          
          addDebug(`✅ Fallback rendering successful for page ${pageNumber}`);
        }
      } catch (fallbackError) {
        addDebug(`❌ Fallback rendering also failed: ${fallbackError}`);
        throw renderError;
      }
    }
  }, [addDebug]);

  // Enhanced thumbnail generation
  const generateThumbnails = useCallback(async (pdf: any) => {
    if (!pdf || !thumbnailsRef.current) return;

    try {
      addDebug(`🖼️ Generating thumbnails for ${pdf.numPages} pages`);
      const thumbnailPromises = [];

      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) { // Limit to 20 thumbnails
        thumbnailPromises.push(generateThumbnail(pdf, i));
      }

      const thumbnailResults = await Promise.allSettled(thumbnailPromises);
      const validThumbnails = thumbnailResults
        .map((result, index) => result.status === 'fulfilled' ? result.value : null)
        .filter(Boolean);

      setThumbnails(validThumbnails);
      addDebug(`✅ Generated ${validThumbnails.length} thumbnails`);

    } catch (error) {
      addDebug(`⚠️ Thumbnail generation failed: ${error}`);
    }
  }, [addDebug]);

  const generateThumbnail = async (pdf: any, pageNumber: number): Promise<string> => {
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.2 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Canvas context not available');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.warn(`Failed to generate thumbnail for page ${pageNumber}:`, error);
      return '';
    }
  };

  // Text selection handling
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      setSelectedText(selectedText);
      setShowAskGemini(true);

      if (onTextSelection) {
        onTextSelection(selectedText, pageNum);
      }

      addDebug(`📝 Text selected: "${selectedText.substring(0, 50)}..."`);
    }
  }, [pageNum, onTextSelection, addDebug]);

  // Search functionality
  const performSearch = useCallback(async (term: string) => {
    if (!pdfDoc || !term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      addDebug(`🔍 Searching for: "${term}"`);
      const results = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');

        const regex = new RegExp(term, 'gi');
        let match;
        while ((match = regex.exec(pageText)) !== null) {
          results.push({
            page: i,
            text: pageText.substring(Math.max(0, match.index - 50), match.index + 50),
            index: match.index
          });
        }
      }

      setSearchResults(results);
      setCurrentSearchIndex(0);
      addDebug(`✅ Found ${results.length} search results`);

    } catch (error) {
      addDebug(`❌ Search failed: ${error}`);
    }
  }, [pdfDoc, addDebug]);

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= numPages && pdfDoc) {
      setPageNum(page);
      onPageChange(page);
      renderPage(page, pdfDoc, scale);
      addDebug(`📄 Navigated to page ${page}`);
    }
  }, [numPages, pdfDoc, scale, onPageChange, renderPage, addDebug]);

  const changeScale = useCallback((newScale: number) => {
    const clampedScale = Math.max(0.5, Math.min(3.0, newScale));
    setScale(clampedScale);
    if (pdfDoc) {
      renderPage(pageNum, pdfDoc, clampedScale);
    }
    addDebug(`🔍 Scale changed to ${clampedScale}`);
  }, [pdfDoc, pageNum, renderPage, addDebug]);

  // Effect hooks
  useEffect(() => {
    loadPDF();
  }, [loadPDF]);

  useEffect(() => {
    const handleSelectionChange = () => {
      setTimeout(handleTextSelection, 100);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleTextSelection]);

  // Retry function
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setLoadingStrategy(0);
    loadPDF(true);
  }, [loadPDF]);

  // Render loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900/50 text-white">
        <div className="text-center max-w-md">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading PDF...</h3>
          <p className="text-slate-400 mb-4">
            Initializing robust PDF viewer...
          </p>
          {retryCount > 0 && (
            <p className="text-yellow-400 text-sm">
              Retry attempt: {retryCount}
            </p>
          )}

          {debugInfo.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>

              {showDebug && (
                <div className="mt-2 bg-slate-800 rounded p-2 text-xs text-left max-h-32 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index} className="text-slate-300 font-mono">
                      {info}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900/50 text-white p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>

          <h3 className="text-lg font-semibold mb-2">PDF Loading Failed</h3>
          <p className="text-slate-400 mb-4">{error.message}</p>

          <div className="space-y-2 mb-4">
            <div className="text-xs text-slate-500">
              Error Type: {error.type}
            </div>
            {retryCount > 0 && (
              <div className="text-xs text-yellow-400">
                Attempts made: {retryCount}
              </div>
            )}
          </div>

          {error.recoverable && (
            <div className="space-x-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Loading
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          )}

          {debugInfo.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>

              {showDebug && (
                <div className="mt-2 bg-slate-800 rounded p-2 text-xs text-left max-h-32 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index} className="text-slate-300 font-mono">
                      {info}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main UI render
  return (
    <div className="h-full flex flex-col bg-slate-900 text-white relative">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(pageNum - 1)}
              disabled={pageNum <= 1}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={pageNum}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 bg-slate-700 rounded text-center text-sm"
                min="1"
                max={numPages}
              />
              <span className="text-sm text-slate-400">/ {numPages}</span>
            </div>

            <button
              onClick={() => goToPage(pageNum + 1)}
              disabled={pageNum >= numPages}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeScale(scale - 0.2)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="text-sm text-slate-400 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={() => changeScale(scale + 0.2)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search in PDF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && performSearch(searchTerm)}
              className="pl-8 pr-4 py-2 bg-slate-700 rounded-lg text-sm w-64"
            />
            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
          </div>

          <button
            onClick={() => performSearch(searchTerm)}
            className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-700"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Debug Toggle */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs"
        >
          Debug
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-slate-800 border-b border-slate-700 p-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {searchResults.length} results found
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
                  setCurrentSearchIndex(newIndex);
                  goToPage(searchResults[newIndex].page);
                }}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-xs">
                {currentSearchIndex + 1} / {searchResults.length}
              </span>
              <button
                onClick={() => {
                  const newIndex = (currentSearchIndex + 1) % searchResults.length;
                  setCurrentSearchIndex(newIndex);
                  goToPage(searchResults[newIndex].page);
                }}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {showDebug && debugInfo.length > 0 && (
        <div className="bg-slate-800 border-b border-slate-700 p-2">
          <div className="text-xs text-slate-300 font-mono max-h-24 overflow-y-auto">
            {debugInfo.slice(-5).map((info, index) => (
              <div key={index}>{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        <div className="w-48 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Pages</h3>
            <div ref={thumbnailsRef} className="space-y-2">
              {thumbnails.map((thumbnail, index) => (
                <div
                  key={index}
                  onClick={() => goToPage(index + 1)}
                  className={`cursor-pointer rounded border-2 transition-colors ${
                    pageNum === index + 1
                      ? 'border-cyan-400'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={`Page ${index + 1}`}
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="w-full h-24 bg-slate-700 flex items-center justify-center">
                      <span className="text-xs text-slate-400">Page {index + 1}</span>
                    </div>
                  )}
                  <div className="text-xs text-center py-1 text-slate-400">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-slate-900" ref={containerRef}>
          <div className="flex justify-center p-4">
            <div className="relative bg-white shadow-2xl">
              <canvas
                ref={canvasRef}
                className="block max-w-full h-auto"
              />
              <div
                ref={textLayerRef}
                className="absolute top-0 left-0 overflow-hidden opacity-0 hover:opacity-100 transition-opacity"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ask Gemini Modal */}
      {showAskGemini && selectedText && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Ask AI about this text
              </h3>
              <button
                onClick={() => setShowAskGemini(false)}
                className="p-1 rounded hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-700 rounded p-3 mb-4 max-h-32 overflow-y-auto">
              <p className="text-sm text-slate-300">{selectedText}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onTextSelection) {
                    onTextSelection(selectedText, pageNum);
                  }
                  setShowAskGemini(false);
                }}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Ask AI
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedText);
                  setShowAskGemini(false);
                }}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Robust PDF.js Viewer</span>
          {retryCount > 0 && <span>Retries: {retryCount}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>{document.name}</span>
          <span>Page {pageNum} of {numPages}</span>
        </div>
      </div>
    </div>
  );
};

export default RobustPDFJSViewer;
