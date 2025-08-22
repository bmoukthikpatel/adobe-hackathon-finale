import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PDFDocument } from '../context/PDFContext';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, Sparkles, X, Loader2, Copy, Search, MessageCircle, Minus, Plus } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { openDB } from 'idb';

interface PDFJSViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
  onTextSelection?: (text: string, page: number) => void;
}

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// IndexedDB functions for annotations
async function getDb() {
  return openDB("pdf-annotations", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("annotations")) {
        const store = db.createObjectStore("annotations", { keyPath: "id" });
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

const PDFJSViewer: React.FC<PDFJSViewerProps> = ({ document, onPageChange, onTextSelection }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [selectionState, setSelectionState] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showGeminiTooltip, setShowGeminiTooltip] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState<string>('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  // Load PDF
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    const loadingTask = pdfjsLib.getDocument(document.url);
    loadingTask.promise.then(async (pdf: any) => {
      if (canceled) return;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      await renderPage(pageNum, pdf, scale);
      generateThumbnails(pdf);
      const ann = await loadAllAnnotations(document.id);
      setAnnotations(ann);
      setLoading(false);
    }).catch((err: any) => {
      console.error(err);
      setLoading(false);
    });
    return () => { canceled = true; };
  }, [document.url]);

  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(pageNum, pdfDoc, scale);
  }, [pageNum, scale]);

  // Render page to canvas + create text layer
  async function renderPage(num: number, pdf: any, scaleVal: number) {
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: scaleVal });
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    // render canvas
    const renderContext = { canvasContext: context, viewport };
    await page.render(renderContext).promise;

    // text layer
    const textContent = await page.getTextContent();
    const textLayerDiv = textLayerRef.current;
    if (!textLayerDiv) return;

    textLayerDiv.innerHTML = "";
    pdfjsLib.renderTextLayer({
      textContent,
      container: textLayerDiv,
      viewport,
      textDivs: [],
    });
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;
    drawAnnotationsForPage(num);
  }

  // Thumbnails
  async function generateThumbnails(pdf: any) {
    const thumbs: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 0.18 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      thumbs.push(canvas.toDataURL());
    }
    setThumbnails(thumbs);
  }

  // Navigation
  function go(delta: number) {
    const target = Math.min(Math.max(1, pageNum + delta), numPages);
    setPageNum(target);
    onPageChange(target);
  }

  function jumpTo(p: number) {
    setPageNum(p);
    onPageChange(p);
  }

  function zoom(delta: number) {
    const next = Math.min(Math.max(0.6, +(scale + delta).toFixed(2)), 3.0);
    setScale(next);
  }

  // Navigation functions
  const goToPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;
    
    setCurrentPage(pageNum);
    onPageChange(pageNum);
    await renderPage(pdfDoc, pageNum);
  }, [pdfDoc, totalPages, onPageChange, scale, rotation]);

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // Zoom functions
  const zoomIn = useCallback(async () => {
    const newScale = Math.min(scale * 1.2, 3.0);
    setScale(newScale);
    if (pdfDoc) await renderPage(pdfDoc, currentPage);
  }, [scale, pdfDoc, currentPage]);

  const zoomOut = useCallback(async () => {
    const newScale = Math.max(scale / 1.2, 0.5);
    setScale(newScale);
    if (pdfDoc) await renderPage(pdfDoc, currentPage);
  }, [scale, pdfDoc, currentPage]);

  // Rotation function
  const rotate = useCallback(async () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    if (pdfDoc) await renderPage(pdfDoc, currentPage);
  }, [rotation, pdfDoc, currentPage]);

  // Ask Gemini about selected text
  const handleAskGemini = useCallback(async () => {
    if (!selectedText || !document.id) return;
    
    setIsGeminiLoading(true);
    
    try {
      const response = await fetch('/api/ask-gemini-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: document.id,
          selected_text: selectedText,
          page: currentPage,
          context_chars: 500
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get Gemini response');
      }

      const data = await response.json();
      setGeminiResponse(data.explanation || 'No explanation available');
    } catch (error) {
      console.error('Failed to ask Gemini:', error);
      setGeminiResponse('Sorry, I could not analyze this text at the moment. Please try again.');
    } finally {
      setIsGeminiLoading(false);
    }
  }, [selectedText, document.id, currentPage]);

  // Close text selection tooltip
  const handleCloseSelection = useCallback(() => {
    setSelectedText('');
    setShowGeminiTooltip(false);
    setGeminiResponse('');
    setIsGeminiLoading(false);
    // Clear text selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  // Re-render when scale or rotation changes
  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(pdfDoc, currentPage);
    }
  }, [scale, rotation]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-white">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️ Error</div>
          <div className="text-sm text-slate-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">PDF.js Viewer</span>
          <span className="text-xs text-slate-400">(Offline Mode)</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Navigation */}
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="p-2 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-sm px-2">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="p-2 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* Zoom */}
          <div className="border-l border-slate-600 ml-2 pl-2 flex items-center gap-1">
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-slate-700 rounded"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            
            <span className="text-xs px-2 min-w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-slate-700 rounded"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          
          {/* Rotate */}
          <button
            onClick={rotate}
            className="p-2 hover:bg-slate-700 rounded"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          
          {/* Download */}
          <button
            onClick={() => window.open(document.url, '_blank')}
            className="p-2 hover:bg-slate-700 rounded"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-slate-800 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
              <div className="text-sm text-slate-400">Loading PDF...</div>
            </div>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="relative inline-block mx-auto bg-white shadow-lg"
            style={{ minHeight: '600px' }}
          >
            <canvas 
              ref={canvasRef}
              className="block"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        )}
      </div>

      {/* Gemini Text Selection Tooltip */}
      {showGeminiTooltip && selectedText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-slate-900/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-lg font-medium text-white">Ask Gemini</span>
              </div>
              <button
                onClick={handleCloseSelection}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-slate-400 mb-2">Selected Text:</div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-300 max-h-20 overflow-y-auto">
                "{selectedText}"
              </div>
            </div>

            {!geminiResponse ? (
              <div className="flex gap-3">
                <button
                  onClick={handleAskGemini}
                  disabled={isGeminiLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGeminiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Explain This
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(selectedText)}
                  className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            ) : (
              <div>
                <div className="text-sm text-slate-400 mb-2">Gemini Explanation:</div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300 leading-relaxed max-h-60 overflow-y-auto">
                  {geminiResponse}
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700">
                  <span className="text-xs text-slate-400">Powered by Gemini AI</span>
                  <button
                    onClick={handleCloseSelection}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFJSViewer;
