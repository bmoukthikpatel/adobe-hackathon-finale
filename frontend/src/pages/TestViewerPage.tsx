import React, { useState } from 'react';
import TestPDFJSViewer from '../components/TestPDFJSViewer';
import PDFViewer from '../components/PDFViewer';
import { PDFDocument } from '../context/PDFContext';

const TestViewerPage: React.FC = () => {
  const [selectedViewer, setSelectedViewer] = useState<'pdfjs' | 'adobe'>('pdfjs');
  const [selectedText, setSelectedText] = useState<string>('');
  
  // Sample PDF URLs for testing
  const testPDFs = [
    {
      name: 'Mozilla TracemonKey PDF (PDF.js test)',
      url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
    },
    {
      name: 'Simple Test PDF',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      name: 'React Handbook PDF',
      url: 'https://flaviocopes.com/page/react-handbook/react-handbook.pdf'
    }
  ];

  const [selectedPDF, setSelectedPDF] = useState(testPDFs[0].url);

  // Mock document for Adobe viewer (if needed)
  const mockDocument: PDFDocument = {
    id: 'test-pdf',
    name: 'Test PDF',
    url: selectedPDF,
    uploadDate: new Date().toISOString(),
    size: 0,
    pages: 0
  };

  const handleTextSelection = (text: string) => {
    setSelectedText(text);
    console.log('🔍 Text selected:', text);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            PDF Viewer Comparison Test
          </h1>
          
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Viewer Selection */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Viewer:</label>
              <select
                value={selectedViewer}
                onChange={(e) => setSelectedViewer(e.target.value as 'pdfjs' | 'adobe')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="pdfjs">PDF.js Viewer (New)</option>
                <option value="adobe">Adobe PDF Embed API (Current)</option>
              </select>
            </div>

            {/* PDF Selection */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Test PDF:</label>
              <select
                value={selectedPDF}
                onChange={(e) => setSelectedPDF(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm max-w-xs"
              >
                {testPDFs.map((pdf, index) => (
                  <option key={index} value={pdf.url}>
                    {pdf.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="text-sm text-gray-600">
              Current: <span className="font-medium">{selectedViewer === 'pdfjs' ? 'PDF.js' : 'Adobe'}</span>
            </div>
          </div>

          {/* Selected Text Display */}
          {selectedText && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-1">Selected Text:</h3>
              <p className="text-sm text-blue-800">"{selectedText}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Viewer Container */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          {selectedViewer === 'pdfjs' ? (
            <TestPDFJSViewer 
              pdfUrl={selectedPDF}
              onTextSelection={handleTextSelection}
            />
          ) : (
            <PDFViewer 
              document={mockDocument}
              onPageChange={(page) => console.log('Page changed:', page)}
            />
          )}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Comparison</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* PDF.js Features */}
            <div>
              <h3 className="font-medium text-green-900 mb-3">✅ PDF.js Viewer Features</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Full zoom and pan controls</li>
                <li>• Page navigation with thumbnails</li>
                <li>• Search functionality</li>
                <li>• Print and download support</li>
                <li>• Rotation controls</li>
                <li>• Multiple view modes (fit width, fit page, actual size)</li>
                <li>• Text selection support</li>
                <li>• File upload capability</li>
                <li>• Fullscreen mode</li>
                <li>• No external dependencies</li>
                <li>• Cross-browser compatibility</li>
                <li>• Customizable toolbar</li>
              </ul>
            </div>

            {/* Adobe PDF Embed API Features */}
            <div>
              <h3 className="font-medium text-blue-900 mb-3">📋 Adobe PDF Embed API Features</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• High-fidelity PDF rendering</li>
                <li>• Professional PDF viewer experience</li>
                <li>• Built-in annotation tools</li>
                <li>• Advanced text selection</li>
                <li>• Form filling support</li>
                <li>• Adobe branding and reliability</li>
                <li>• Optimized for large documents</li>
                <li>• Advanced security features</li>
                <li>• Analytics and tracking</li>
                <li>⚠️ Requires internet connection</li>
                <li>⚠️ External API dependency</li>
                <li>⚠️ Limited customization</li>
              </ul>
            </div>
          </div>

          {/* Test Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium text-gray-900 mb-2">Testing Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Switch between viewers using the dropdown above</li>
              <li>Test different PDF files from the selection</li>
              <li>Try various features: zoom, navigation, search, text selection</li>
              <li>Compare performance and user experience</li>
              <li>Test text selection - selected text will appear in the blue box</li>
              <li>Check browser console for any errors or warnings</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestViewerPage;
