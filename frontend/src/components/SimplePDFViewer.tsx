import React from 'react';
import { PDFDocument } from '../context/PDFContext';

interface SimplePDFViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
}

const SimplePDFViewer: React.FC<SimplePDFViewerProps> = ({ document, onPageChange }) => {
  console.log('🔍 SimplePDFViewer rendering for:', document.name);

  return (
    <div className="w-full h-full bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">{document.name}</h3>
        <p className="text-slate-400 mb-4">PDF Viewer (Simplified Mode)</p>
        <div className="bg-slate-900 p-4 rounded border text-xs font-mono text-left">
          <p className="text-cyan-400">📄 Document Info:</p>
          <p className="text-slate-300">ID: {document.id}</p>
          <p className="text-slate-300">Name: {document.name}</p>
          <p className="text-slate-300">URL: {document.url}</p>
          <p className="text-slate-300">Size: {(document.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <div className="mt-4 space-x-2">
          <a 
            href={document.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
          >
            Open PDF in New Tab
          </a>
          <button 
            onClick={() => onPageChange(1)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Test Page Change
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplePDFViewer;
