import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument, usePDF } from '../context/PDFContext';

interface PDFViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ document, onPageChange }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlights, setHighlights] = useState<any[]>([]);
  const { relatedSections } = usePDF();

  // console.log('🔍 PDFViewer rendering for document:', document.name); // Removed to prevent re-render loops

  const loadHighlights = async (documentId: string, page: number) => {
    try {
      const BACKEND_URL = 'http://127.0.0.1:8080';
      const response = await fetch(`${BACKEND_URL}/api/highlights/${documentId}?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setHighlights(data.highlights || []);
      }
    } catch (error) {
      console.error('Error loading highlights:', error);
    }
  };

  useEffect(() => {
    const loadPDF = async () => {
      if (!viewerRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log('🔍 Attempting to load Adobe PDF API...');

        // Wait for Adobe PDF Embed API to be available
        let attempts = 0;
        const maxAttempts = 10;

        while (!(window as any).AdobeDC && attempts < maxAttempts) {
          console.log(`⏳ Waiting for Adobe PDF API... (${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (!(window as any).AdobeDC) {
          throw new Error('Adobe PDF Embed API failed to load after 5 seconds');
        }

        console.log('✅ Adobe PDF API loaded, initializing viewer...');

        // Initialize Adobe PDF Embed API
        const adobeDCView = new (window as any).AdobeDC.View({
          clientId: 'a46749c05a8048448b7a9735e020a6f7',
          divId: 'pdf-viewer-container',
        });

        console.log('📄 Loading PDF:', document.url);

        // Load the PDF
        adobeDCView.previewFile({
          content: { location: { url: document.url } },
          metaData: { fileName: document.name }
        }, {
          embedMode: "SIZED_CONTAINER",
          showAnnotationTools: false,
          showLeftHandPanel: false,
          showDownloadPDF: false,
          showPrintPDF: false,
          showBookmarks: false,
        });

        console.log('✅ PDF viewer initialized successfully');
        setIsLoading(false);

      } catch (err) {
        console.error('❌ PDF loading error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setIsLoading(false);
      }
    };
    if (!(window as any).AdobeDC) {
      const script = document.createElement('script');
      script.src = 'https://acrobatservices.adobe.com/view-sdk/viewer.js';
      script.onload = loadPDF;
      document.head.appendChild(script);
    } else {
      loadPDF();
    }
  }, [document.url, document.id]); // Only depend on URL and ID to prevent infinite loop

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <p className="text-red-400 font-medium mb-2">Error Loading PDF</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <div 
        id="pdf-viewer-container" 
        ref={viewerRef}
        className="h-full w-full"
      />
      
      {/* Overlay for highlighting related sections */}
      <div className="absolute inset-0 pointer-events-none">
        {highlights.map((highlight, index) => (
          <div
            key={highlight.id || index}
            className="absolute pointer-events-auto cursor-pointer transition-all duration-200 hover:scale-105"
            style={{
              left: `${(highlight.coordinates?.x || 0) / 8}px`,
              top: `${(highlight.coordinates?.y || 0) / 8}px`,
              width: `${(highlight.coordinates?.width || 200) / 8}px`,
              height: `${(highlight.coordinates?.height || 20) / 8}px`,
              backgroundColor: `${highlight.color || '#00ff88'}20`,
              border: `2px solid ${highlight.color || '#00ff88'}`,
              borderRadius: '4px',
              opacity: highlight.opacity || 0.7
            }}
            title={`${highlight.title}: ${highlight.snippet}`}
            onClick={() => {
              // Handle click to jump to related section
              console.log('Clicked highlight:', highlight);
            }}
          >
            <div
              className="absolute -top-8 left-0 px-2 py-1 rounded text-xs font-medium text-slate-900 whitespace-nowrap"
              style={{ backgroundColor: highlight.color || '#00ff88' }}
            >
              {highlight.title || `Related Section #${index + 1}`}
            </div>
          </div>
        ))}

        {/* Fallback mock highlights if no real highlights available */}
        {highlights.length === 0 && relatedSections.length > 0 && (
          <>
            <div className="absolute top-1/4 left-1/4 w-64 h-8 bg-cyan-400/20 border-2 border-cyan-400 rounded animate-pulse pointer-events-auto cursor-pointer">
              <div className="absolute -top-8 left-0 bg-cyan-400 text-slate-900 px-2 py-1 rounded text-xs font-medium">
                {relatedSections[0]?.title || 'Related Section #1'}
              </div>
            </div>

            {relatedSections[1] && (
              <div className="absolute top-1/2 right-1/4 w-48 h-12 bg-purple-400/20 border-2 border-purple-400 rounded animate-pulse pointer-events-auto cursor-pointer">
                <div className="absolute -top-8 right-0 bg-purple-400 text-slate-900 px-2 py-1 rounded text-xs font-medium">
                  {relatedSections[1]?.title || 'Related Section #2'}
                </div>
              </div>
            )}

            {relatedSections[2] && (
              <div className="absolute bottom-1/3 left-1/3 w-56 h-6 bg-pink-400/20 border-2 border-pink-400 rounded animate-pulse pointer-events-auto cursor-pointer">
                <div className="absolute -top-8 left-0 bg-pink-400 text-slate-900 px-2 py-1 rounded text-xs font-medium">
                  {relatedSections[2]?.title || 'Related Section #3'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;