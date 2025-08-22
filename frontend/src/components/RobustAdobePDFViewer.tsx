import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument } from '../context/PDFContext';

interface RobustAdobePDFViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
}

declare global {
  interface Window {
    AdobeDC: any;
  }
}

const RobustAdobePDFViewer: React.FC<RobustAdobePDFViewerProps> = ({ document, onPageChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);

  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    let mounted = true;
    let viewerInstance: any = null;

    const initializeViewer = async () => {
      try {
        addDebug('🚀 Starting Adobe PDF Viewer initialization');
        
        // Step 1: Check if container exists
        if (!containerRef.current) {
          throw new Error('Container ref not available');
        }
        addDebug('✅ Container ref available');

        // Step 2: Wait for Adobe DC to be available with timeout
        addDebug('⏳ Waiting for Adobe DC API...');
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds
        
        while (!window.AdobeDC && attempts < maxAttempts && mounted) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
          if (attempts % 5 === 0) {
            addDebug(`⏳ Still waiting for Adobe DC API... (${attempts}/${maxAttempts})`);
          }
        }

        if (!window.AdobeDC) {
          throw new Error(`Adobe DC API not available after ${maxAttempts * 0.5} seconds`);
        }
        addDebug('✅ Adobe DC API is available');

        // Step 3: Test PDF URL accessibility
        addDebug('🔗 Testing PDF URL accessibility...');
        try {
          const response = await fetch(document.url, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`PDF URL not accessible: ${response.status} ${response.statusText}`);
          }
          addDebug(`✅ PDF URL accessible (${response.status})`);
        } catch (urlError) {
          addDebug(`❌ PDF URL test failed: ${urlError}`);
          throw new Error(`PDF URL not accessible: ${urlError}`);
        }

        // Step 4: Clear container and set up
        containerRef.current.innerHTML = '';
        const viewerId = `adobe-viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        containerRef.current.id = viewerId;
        
        addDebug(`📋 Created viewer container with ID: ${viewerId}`);

        // Step 5: Initialize Adobe DC View
        addDebug('🔧 Creating Adobe DC View instance...');
        const clientId = '58fd98c1606c492da905f93b81d8d0cf';
        
        viewerInstance = new window.AdobeDC.View({
          clientId: clientId,
          divId: viewerId,
        });
        addDebug('✅ Adobe DC View instance created');

        // Step 6: Configure and load PDF
        addDebug('📄 Loading PDF file...');
        const fileName = document.name || 'document.pdf';
        
        const previewConfig = {
          embedMode: "SIZED_CONTAINER",
          defaultViewMode: "FIT_PAGE",
          showAnnotationTools: false,
          showLeftHandPanel: false,
          showDownloadPDF: false,
          showPrintPDF: false,
          showBookmarks: false,
        };

        await viewerInstance.previewFile(
          {
            content: { location: { url: document.url } },
            metaData: { fileName: fileName },
          },
          previewConfig
        );

        addDebug('✅ PDF preview file called');

        // Step 7: Register callbacks
        if (window.AdobeDC.View.Enum && window.AdobeDC.View.Enum.CallbackType) {
          viewerInstance.registerCallback(
            window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
            (event: any) => {
              addDebug(`📄 Adobe Event: ${event.type}`);
              if (event.type === "PAGE_VIEW" && event.data && event.data.pageNumber) {
                onPageChange(event.data.pageNumber);
              }
            }
          );
          addDebug('✅ Event callbacks registered');
        }

        // Step 8: Set success state
        if (mounted) {
          setIsLoading(false);
          setError(null);
          addDebug('🎉 Adobe PDF Viewer successfully initialized!');
          
          // Hide debug after successful load
          setTimeout(() => {
            if (mounted) setShowDebug(false);
          }, 5000);
        }

      } catch (err) {
        addDebug(`❌ Error: ${err}`);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
          setIsLoading(false);
        }
      }
    };

    // Start initialization
    initializeViewer();

    // Cleanup
    return () => {
      mounted = false;
      if (viewerInstance) {
        try {
          // Clear the container
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
      }
    };
  }, [document.url, document.name, onPageChange]);

  if (error) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-700 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">Adobe PDF Viewer Error</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          
          {/* Debug Information */}
          <div className="bg-slate-800 rounded-lg p-4 mb-4 text-left">
            <h4 className="text-white text-sm font-semibold mb-2">Debug Information:</h4>
            <div className="text-xs text-slate-300 space-y-1 max-h-40 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="font-mono">{info}</div>
              ))}
            </div>
          </div>

          <div className="space-x-2">
            <a 
              href={document.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
            >
              Open PDF Directly
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
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/95 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white text-lg mb-2">Loading Adobe PDF Viewer...</p>
            <p className="text-slate-400 text-sm mb-4">{document.name}</p>
            
            {/* Debug Panel */}
            {showDebug && (
              <div className="bg-slate-800 rounded-lg p-4 text-left max-w-md">
                <h4 className="text-white text-sm font-semibold mb-2">Debug Log:</h4>
                <div className="text-xs text-slate-300 space-y-1 max-h-32 overflow-y-auto">
                  {debugInfo.slice(-8).map((info, index) => (
                    <div key={index} className="font-mono">{info}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adobe PDF Container */}
      <div 
        ref={containerRef}
        className="w-full h-full rounded-lg"
        style={{ 
          minHeight: '600px',
          height: '100%',
          width: '100%'
        }}
      />

      {/* Info Overlay */}
      {!isLoading && !error && (
        <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg px-3 py-2 border border-slate-600 z-10">
          <p className="text-white text-sm font-medium">{document.name}</p>
          <p className="text-slate-400 text-xs">{(document.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}
    </div>
  );
};

export default RobustAdobePDFViewer;
