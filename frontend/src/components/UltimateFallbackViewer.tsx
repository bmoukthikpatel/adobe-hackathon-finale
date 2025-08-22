import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument } from '../context/PDFContext';
import { Download, ExternalLink, FileText, AlertCircle, RefreshCw, Eye } from 'lucide-react';

interface UltimateFallbackViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
  onTextSelection?: (text: string, page: number) => void;
}

const UltimateFallbackViewer: React.FC<UltimateFallbackViewerProps> = ({ 
  document, 
  onPageChange, 
  onTextSelection 
}) => {
  const [viewMode, setViewMode] = useState<'embed' | 'iframe' | 'download'>('embed');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Try to get PDF information
  useEffect(() => {
    const getPDFInfo = async () => {
      try {
        const response = await fetch(document.url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');
        
        setPdfInfo({
          size: contentLength ? parseInt(contentLength) : null,
          type: contentType,
          url: document.url,
          accessible: response.ok
        });
        
        setIsLoading(false);
      } catch (err) {
        setError('Failed to access PDF file');
        setIsLoading(false);
      }
    };

    getPDFInfo();
  }, [document.url]);

  // Format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setError('Failed to load PDF in iframe');
    setViewMode('download');
  };

  // Render different view modes
  const renderViewer = () => {
    switch (viewMode) {
      case 'embed':
        return (
          <div className="h-full w-full">
            <embed
              src={`${document.url}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
              type="application/pdf"
              width="100%"
              height="100%"
              className="border-0"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError('Embed failed, trying iframe...');
                setViewMode('iframe');
              }}
            />
          </div>
        );

      case 'iframe':
        return (
          <div className="h-full w-full">
            <iframe
              ref={iframeRef}
              src={`${document.url}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
              width="100%"
              height="100%"
              className="border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={`PDF Viewer - ${document.name}`}
            />
          </div>
        );

      case 'download':
        return (
          <div className="h-full flex items-center justify-center bg-slate-900 text-white">
            <div className="text-center max-w-md p-8">
              <div className="w-20 h-20 bg-red-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                <FileText className="w-10 h-10 text-red-400" />
              </div>
              
              <h2 className="text-2xl font-bold mb-4">PDF Viewer Unavailable</h2>
              <p className="text-slate-400 mb-6">
                This PDF cannot be displayed in the browser. You can download it to view with your preferred PDF reader.
              </p>
              
              {pdfInfo && (
                <div className="bg-slate-800 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold mb-2">File Information</h3>
                  <div className="space-y-1 text-sm text-slate-300">
                    <div>Name: {document.name}</div>
                    <div>Size: {formatFileSize(pdfInfo.size)}</div>
                    <div>Type: {pdfInfo.type || 'application/pdf'}</div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <a
                  href={document.url}
                  download={document.name}
                  className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </a>
                
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open in New Tab
                </a>
                
                <button
                  onClick={() => {
                    setViewMode('embed');
                    setError(null);
                    setIsLoading(true);
                  }}
                  className="w-full px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading PDF...</p>
          <p className="text-xs text-slate-500 mt-2">Using fallback viewer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Top Bar */}
      <div className="bg-slate-800 border-b border-slate-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-white font-medium">{document.name}</h3>
              <p className="text-xs text-slate-400">Fallback PDF Viewer</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value as any);
                setError(null);
                setIsLoading(true);
              }}
              className="px-3 py-1 bg-slate-700 text-white rounded text-sm"
            >
              <option value="embed">Embed</option>
              <option value="iframe">Iframe</option>
              <option value="download">Download</option>
            </select>
            
            <a
              href={document.url}
              download={document.name}
              className="px-3 py-1 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700 transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          </div>
        </div>
        
        {error && (
          <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Viewer Content */}
      <div className="flex-1 overflow-hidden">
        {renderViewer()}
      </div>

      {/* Bottom Status */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>Ultimate Fallback Viewer - Mode: {viewMode}</span>
          {pdfInfo && (
            <span>{formatFileSize(pdfInfo.size)} • {document.name}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UltimateFallbackViewer;
