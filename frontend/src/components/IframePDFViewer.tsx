import React, { useState } from 'react';
import { PDFDocument } from '../context/PDFContext';

interface IframePDFViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
}

const IframePDFViewer: React.FC<IframePDFViewerProps> = ({ document, onPageChange }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
    onPageChange(1); // Default to page 1
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load PDF. The file might be corrupted or inaccessible.');
  };

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-700 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading PDF...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">PDF Load Error</h3>
            <p className="text-slate-400 mb-4">{error}</p>
            <div className="space-x-2">
              <a 
                href={document.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
              >
                Open in New Tab
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
      )}

      <iframe
        src={document.url}
        title={document.name}
        className="w-full h-full rounded-lg"
        onLoad={handleLoad}
        onError={handleError}
        style={{ minHeight: '600px' }}
      />

      {/* PDF Info Overlay */}
      <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg px-3 py-2 border border-slate-600">
        <p className="text-white text-sm font-medium">{document.name}</p>
        <p className="text-slate-400 text-xs">{(document.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur rounded-lg px-3 py-2 border border-slate-600">
        <div className="flex items-center space-x-2">
          <a 
            href={document.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Open in new tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button 
            onClick={() => window.print()}
            className="text-slate-400 hover:text-slate-300 transition-colors"
            title="Print"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IframePDFViewer;
