import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument } from '../context/PDFContext';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertTriangle } from 'lucide-react';

interface SimplePDFJSViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
  onTextSelection?: (text: string, page: number) => void;
}

const SimplePDFJSViewer: React.FC<SimplePDFJSViewerProps> = ({ 
  document, 
  onPageChange, 
  onTextSelection 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderingPage, setRenderingPage] = useState(false);

  // Load PDF.js - Fixed to prevent infinite re-renders
  useEffect(() => {
    if (!document?.url) {
      console.log('❌ No document URL provided');
      setError('No document URL provided');
      setLoading(false);
      return;
    }

    const loadPDFJS = async () => {
      try {
        console.log('🔄 Loading PDF.js...');
        console.log('📄 Document:', document.name);
        console.log('📄 Document URL:', document.url);
        setLoading(true);
        setError(null);

        // Try to load PDF.js from CDN first
        let pdfjsLib: any;
        
        try {
          // Load from CDN
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
            setTimeout(() => reject(new Error('CDN timeout')), 10000);
          });
          
          pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          console.log('✅ PDF.js loaded from CDN');
          
        } catch (cdnError) {
          console.warn('⚠️ CDN failed, trying local files...', cdnError);
          
          // Try local files
          try {
            const script = document.createElement('script');
            script.src = '/pdf.min.js';
            
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
              setTimeout(() => reject(new Error('Local timeout')), 5000);
            });
            
            pdfjsLib = (window as any).pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
            console.log('✅ PDF.js loaded from local files');
            
          } catch (localError) {
            console.error('❌ Both CDN and local PDF.js failed', localError);
            throw new Error('PDF.js could not be loaded from CDN or local files');
          }
        }

        if (!pdfjsLib) {
          throw new Error('PDF.js library not available');
        }

        // Load the PDF document
        console.log('🔄 Loading PDF document:', document.url);
        
        const loadingTask = pdfjsLib.getDocument({
          url: document.url,
          verbosity: 0,
        });

        const pdf = await loadingTask.promise;
        console.log('✅ PDF loaded successfully:', pdf.numPages, 'pages');
        
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
        
        // Render first page
        await renderPage(1, pdf, scale);
        
      } catch (err) {
        console.error('❌ PDF loading failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    loadPDFJS();
  }, [document?.url]); // Only re-run when document URL changes

  // Render a specific page
  const renderPage = async (pageNumber: number, pdf: any, currentScale: number) => {
    if (!pdf || !canvasRef.current) return;

    try {
      setRenderingPage(true);
      console.log('🎨 Rendering page', pageNumber);
      
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
      console.log('✅ Page', pageNumber, 'rendered successfully');
      
      setRenderingPage(false);
      
    } catch (renderError) {
      console.error('❌ Page rendering failed:', renderError);
      setRenderingPage(false);
      setError(`Failed to render page ${pageNumber}: ${renderError}`);
    }
  };

  // Navigation functions
  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages && pdfDoc && !renderingPage) {
      setPageNum(page);
      onPageChange(page);
      renderPage(page, pdfDoc, scale);
    }
  };

  const changeScale = (newScale: number) => {
    const clampedScale = Math.max(0.5, Math.min(3.0, newScale));
    setScale(clampedScale);
    if (pdfDoc && !renderingPage) {
      renderPage(pageNum, pdfDoc, clampedScale);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading PDF...</h3>
          <p className="text-slate-400">Simple PDF.js Viewer</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>

          <h3 className="text-lg font-semibold mb-2">PDF Loading Failed</h3>
          <p className="text-slate-400 mb-4">{error}</p>

          <div className="bg-slate-800 rounded p-3 mb-4 text-left text-xs">
            <div><strong>Document:</strong> {document.name}</div>
            <div><strong>URL:</strong> {document.url}</div>
            <div><strong>ID:</strong> {document.id}</div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Retry
            </button>
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Open PDF Directly
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Main viewer
  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(pageNum - 1)}
              disabled={pageNum <= 1 || renderingPage}
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
                disabled={renderingPage}
              />
              <span className="text-sm text-slate-400">/ {numPages}</span>
            </div>
            
            <button
              onClick={() => goToPage(pageNum + 1)}
              disabled={pageNum >= numPages || renderingPage}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeScale(scale - 0.2)}
              disabled={renderingPage}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            
            <span className="text-sm text-slate-400 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={() => changeScale(scale + 0.2)}
              disabled={renderingPage}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-400">
          Simple PDF.js Viewer
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-slate-900" ref={containerRef}>
        <div className="flex justify-center p-4">
          <div className="relative bg-white shadow-2xl">
            {renderingPage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="block max-w-full h-auto"
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Simple PDF.js Viewer</span>
          {renderingPage && <span>🎨 Rendering...</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>{document.name}</span>
          <span>Page {pageNum} of {numPages}</span>
        </div>
      </div>
    </div>
  );
};

export default SimplePDFJSViewer;
