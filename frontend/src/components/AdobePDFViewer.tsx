import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument } from '../context/PDFContext';

interface AdobePDFViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
}

declare global {
  interface Window {
    AdobeDC: any;
  }
}

const AdobePDFViewer: React.FC<AdobePDFViewerProps> = ({ document, onPageChange }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Adobe Client ID
  const ADOBE_CLIENT_ID = '58fd98c1606c492da905f93b81d8d0cf';

  useEffect(() => {
    console.log('🔍 Adobe PDF Viewer useEffect triggered');
    console.log('📊 window.AdobeDC available:', !!window.AdobeDC);
    console.log('📊 viewerRef.current:', !!viewerRef.current);

    if (!window.AdobeDC) {
      console.error('❌ Adobe PDF Embed API not loaded');
      setError('Adobe PDF Embed API not loaded. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    if (!viewerRef.current) {
      console.error('❌ Viewer ref not available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Initializing Adobe PDF Viewer for:', document.name);
      console.log('🔑 Using Adobe Client ID:', ADOBE_CLIENT_ID);

      // Create unique div ID for this instance
      const viewerId = `adobe-dc-view-${document.id}`;

      // Set the ID on the ref element
      viewerRef.current.id = viewerId;
      console.log('📋 Set viewer ID:', viewerId);

      // Initialize Adobe DC View
      console.log('🚀 Creating Adobe DC View...');
      const adobeDCView = new window.AdobeDC.View({
        clientId: ADOBE_CLIENT_ID,
        divId: viewerId,
      });

      console.log('📄 Loading PDF from:', document.url);

      // Load the PDF with configuration
      adobeDCView.previewFile(
        {
          content: { location: { url: document.url } },
          metaData: { fileName: document.name },
        },
        {
          embedMode: "SIZED_CONTAINER",
          defaultViewMode: "FIT_PAGE",
        }
      );

      // Register page change events
      adobeDCView.registerCallback(
        window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
        (event: any) => {
          console.log('📄 Adobe PDF Event:', event.type, event.data);
          if (event.type === "PAGE_VIEW") {
            const pageNumber = event.data.pageNumber;
            setCurrentPage(pageNumber);
            onPageChange(pageNumber);
          }
        }
      );

      // Set a timeout to hide loading after a reasonable time
      setTimeout(() => {
        setIsLoading(false);
        console.log('✅ Adobe PDF Viewer loading timeout completed');
      }, 3000);

      console.log('✅ Adobe PDF Viewer initialization completed');

    } catch (err) {
      console.error('❌ Adobe PDF Viewer error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize PDF viewer');
      setIsLoading(false);
    }
  }, [document.url, document.id]);

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clear the container on unmount
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg mb-2">Loading Adobe PDF Viewer...</p>
          <p className="text-slate-400 text-sm">{document.name}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">Adobe PDF Viewer Error</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <div className="space-x-2">
            <a 
              href={document.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
            >
              Open PDF in New Tab
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-700 relative">
      {/* Adobe PDF Viewer Container - Following your working pattern */}
      <div
        ref={viewerRef}
        className="w-full h-full rounded-lg"
        style={{ height: "100vh", width: "100%" }}
      />

      {/* PDF Info Overlay */}
      <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg px-3 py-2 border border-slate-600 z-10">
        <p className="text-white text-sm font-medium">{document.name}</p>
        <p className="text-slate-400 text-xs">
          Page {currentPage} • {(document.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    </div>
  );
};

export default AdobePDFViewer;
