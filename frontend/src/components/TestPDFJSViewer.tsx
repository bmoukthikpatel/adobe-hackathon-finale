import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Search, 
  Download, 
  Printer, 
  FileText,
  Maximize2,
  Minimize2,
  BookOpen,
  Settings,
  Eye,
  EyeOff,
  MousePointer,
  Edit3,
  Highlighter
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker - use local worker file that matches our PDF.js version
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface TestPDFJSViewerProps {
  pdfUrl?: string;
  onTextSelection?: (selectedText: string) => void;
}

const TestPDFJSViewer: React.FC<TestPDFJSViewerProps> = ({ 
  pdfUrl: propPdfUrl,
  onTextSelection 
}) => {
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('fit-width'); // fit-width, fit-page, actual-size
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [currentTool, setCurrentTool] = useState('cursor'); // cursor, highlight, text
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default PDF URL - you can replace with your PDF
  const [pdfUrl, setPdfUrl] = useState(propPdfUrl || 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');

  // Load PDF document
  const loadPDF = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔄 Loading PDF with PDF.js:', url);
      const loadingTask = pdfjs.getDocument(url);
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      await renderPage(pdf, 1);
      console.log('✅ PDF loaded successfully:', pdf.numPages, 'pages');
    } catch (err: any) {
      console.error('❌ PDF loading error:', err);
      setError('Failed to load PDF: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Render PDF page
  const renderPage = async (pdf: any, pageNum: number) => {
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Calculate scale based on view mode
      let renderScale = scale;
      if (viewMode === 'fit-width' && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40;
        const viewport = page.getViewport({ scale: 1, rotation });
        renderScale = containerWidth / viewport.width;
      } else if (viewMode === 'fit-page' && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40;
        const containerHeight = containerRef.current.clientHeight - 100;
        const viewport = page.getViewport({ scale: 1, rotation });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        renderScale = Math.min(scaleX, scaleY);
      }

      const viewport = page.getViewport({ scale: renderScale, rotation });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      setScale(renderScale);
    } catch (err: any) {
      console.error('❌ Page render error:', err);
      setError('Failed to render page: ' + err.message);
    }
  };

  // Navigation functions
  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      if (pdfDocument) {
        renderPage(pdfDocument, pageNum);
      }
    }
  };

  const prevPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);

  // Zoom functions
  const zoomIn = () => {
    const newScale = Math.min(scale * 1.25, 5.0);
    setScale(newScale);
    setViewMode('actual-size');
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  const zoomOut = () => {
    const newScale = Math.max(scale * 0.8, 0.25);
    setScale(newScale);
    setViewMode('actual-size');
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  // Rotation
  const rotatePage = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  // Search functionality
  const searchPDF = async (term: string) => {
    if (!pdfDocument || !term) {
      setSearchResults([]);
      return;
    }

    const results: any[] = [];
    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        
        const regex = new RegExp(term, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          results.push({
            page: i,
            index: match.index,
            text: match[0]
          });
        }
      } catch (err) {
        console.error(`Error searching page ${i}:`, err);
      }
    }

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  };

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  // Download PDF
  const downloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'document.pdf';
      link.click();
    }
  };

  // Print PDF
  const printPDF = () => {
    if (canvasRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Print PDF</title></head>
            <body style="margin:0;">
              <img src="${canvasRef.current.toDataURL()}" style="max-width:100%;" />
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // View mode handlers
  const setFitWidth = () => {
    setViewMode('fit-width');
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  const setFitPage = () => {
    setViewMode('fit-page');
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  const setActualSize = () => {
    setViewMode('actual-size');
    setScale(1.0);
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && onTextSelection) {
      onTextSelection(selection.toString().trim());
    }
  };

  // Load PDF when URL changes
  useEffect(() => {
    if (pdfUrl) {
      loadPDF(pdfUrl);
    }
  }, [pdfUrl]);

  // Re-render when container size changes
  useEffect(() => {
    const handleResize = () => {
      if (pdfDocument && (viewMode === 'fit-width' || viewMode === 'fit-page')) {
        renderPage(pdfDocument, currentPage);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDocument, currentPage, viewMode]);

  return (
    <div 
      ref={containerRef}
      className={`bg-gray-100 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} flex flex-col`}
    >
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-300 p-2 flex items-center justify-between shadow-sm">
        {/* Left Section - File Operations */}
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <FileText size={16} />
            <span>Open</span>
          </button>
          <button
            onClick={downloadPDF}
            className="p-2 hover:bg-gray-100 rounded"
            title="Download"
          >
            <Download size={18} />
          </button>
          <button
            onClick={printPDF}
            className="p-2 hover:bg-gray-100 rounded"
            title="Print"
          >
            <Printer size={18} />
          </button>
        </div>

        {/* Center Section - Navigation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-center text-sm"
                min="1"
                max={totalPages}
              />
              <span className="text-sm text-gray-600">/ {totalPages}</span>
            </div>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={zoomOut}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm text-gray-600 min-w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <button
            onClick={rotatePage}
            className="p-1 hover:bg-gray-100 rounded"
            title="Rotate"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* Right Section - View Options */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="flex items-center space-x-1">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPDF(searchTerm)}
              className="px-2 py-1 border rounded text-sm w-32"
            />
            <button
              onClick={() => searchPDF(searchTerm)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Search"
            >
              <Search size={16} />
            </button>
          </div>

          {/* View Mode Buttons */}
          <select 
            value={viewMode}
            onChange={(e) => {
              const mode = e.target.value;
              if (mode === 'fit-width') setFitWidth();
              else if (mode === 'fit-page') setFitPage();
              else if (mode === 'actual-size') setActualSize();
            }}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="fit-width">Fit Width</option>
            <option value="fit-page">Fit Page</option>
            <option value="actual-size">Actual Size</option>
          </select>

          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1 rounded ${showThumbnails ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            title="Toggle Thumbnails"
          >
            <BookOpen size={18} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1 hover:bg-gray-100 rounded"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Search Results Bar */}
      {searchResults.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm">
          <span>
            Found {searchResults.length} results for "{searchTerm}"
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
                setCurrentSearchIndex(newIndex);
                goToPage(searchResults[newIndex].page);
              }}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-50"
            >
              Previous
            </button>
            <span>{currentSearchIndex + 1} / {searchResults.length}</span>
            <button
              onClick={() => {
                const newIndex = (currentSearchIndex + 1) % searchResults.length;
                setCurrentSearchIndex(newIndex);
                goToPage(searchResults[newIndex].page);
              }}
              className="px-2 py-1 bg-white border rounded hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-48 bg-white border-r border-gray-300 overflow-y-auto">
            <div className="p-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Pages</h3>
              <div className="space-y-2">
                {[...Array(totalPages)].map((_, i) => (
                  <div
                    key={i + 1}
                    onClick={() => goToPage(i + 1)}
                    className={`cursor-pointer p-2 border rounded ${
                      currentPage === i + 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="bg-gray-100 aspect-[3/4] rounded mb-1 flex items-center justify-center text-xs text-gray-500">
                      Page {i + 1}
                    </div>
                    <div className="text-xs text-center text-gray-600">{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PDF Canvas Area */}
        <div className="flex-1 overflow-auto bg-gray-200 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-600">Loading PDF...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-600 text-center">
                <p className="mb-2">Error loading PDF</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="bg-white shadow-lg">
                <canvas
                  ref={canvasRef}
                  className="max-w-full"
                  style={{
                    cursor: currentTool === 'highlight' ? 'text' : 'default'
                  }}
                  onMouseUp={handleTextSelection}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-white border-t border-gray-300 px-4 py-2 flex items-center justify-between text-sm text-gray-600">
        <div>
          {pdfDocument && `Page ${currentPage} of ${totalPages} • ${Math.round(scale * 100)}% zoom`}
        </div>
        <div className="flex items-center space-x-4">
          <span>Ready - PDF.js Viewer</span>
        </div>
      </div>
    </div>
  );
};

export default TestPDFJSViewer;
