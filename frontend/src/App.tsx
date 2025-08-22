import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ReaderPage from './pages/ReaderPage';
import TestViewerPage from './pages/TestViewerPage';
import { PDFProvider } from './context/PDFContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <PDFProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/reader/:pdfId" element={<ReaderPage />} />
              <Route path="/test-viewer" element={<TestViewerPage />} />
            </Routes>
          </div>
        </Router>
      </PDFProvider>
    </ErrorBoundary>
  );
}

export default App;