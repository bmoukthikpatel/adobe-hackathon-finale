import React, { useState, useEffect } from 'react';
import { PDFDocument } from '../context/PDFContext';
import IntegratedAdobePDFViewer from './IntegratedAdobePDFViewer';
import { RefreshCw } from 'lucide-react';

interface SmartPDFViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
  onTextSelection?: (text: string, page: number) => void;
  onOpenInsights?: () => void;
  onOpenPodcast?: () => void;
}

const SmartPDFViewer: React.FC<SmartPDFViewerProps> = ({
  document,
  onPageChange,
  onTextSelection,
  onOpenInsights,
  onOpenPodcast
}) => {
  const [viewerMode, setViewerMode] = useState<'adobe' | 'loading'>('loading');
  const [pdfLoadError, setPdfLoadError] = useState(false);

  // Use Adobe PDF Embed API exclusively
  useEffect(() => {
    console.log('🌐 Initializing Adobe PDF Embed API viewer');
    setViewerMode('adobe');
  }, []);

  // Handle Adobe PDF Embed API errors
  const handleViewerFailure = (error: string) => {
    console.error('📄 Adobe PDF Embed API error:', error);
    setPdfLoadError(true);
  };

  // Reset viewer when document changes
  useEffect(() => {
    setPdfLoadError(false);
  }, [document.id]);



  if (viewerMode === 'loading') {
    return (
      <div className="flex flex-col h-full bg-slate-900 text-white">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
            <div className="text-lg font-medium mb-2">Loading Adobe PDF Viewer</div>
            <div className="text-sm text-slate-400">Initializing PDF display...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Adobe PDF Embed API Viewer */}
      <IntegratedAdobePDFViewer
        document={document}
        onPageChange={onPageChange}
        onError={handleViewerFailure}
        onOpenInsights={onOpenInsights}
        onOpenPodcast={onOpenPodcast}
      />
    </div>
  );
};

export default SmartPDFViewer;
