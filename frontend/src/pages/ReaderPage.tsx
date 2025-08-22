import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Volume2, Wifi, WifiOff } from 'lucide-react';
import { usePDF } from '../context/PDFContext';
import SmartPDFViewer from '../components/SmartPDFViewer';
import RecommendationsPanel from '../components/RecommendationsPanel';
import FloatingInsightsPanel from '../components/FloatingInsightsPanel';
import InsightsNotification from '../components/InsightsNotification';
import TextSelectionTooltip from '../components/TextSelectionTooltip';
import PodcastModal from '../components/PodcastModal';

const ReaderPage: React.FC = () => {
  const { pdfId } = useParams<{ pdfId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { documents, currentDocument, setCurrentDocument, getRelatedSections, getInsights, insights, isOnline } = usePDF();
  const [currentPage, setCurrentPage] = useState(1);
  const [showFloatingInsights, setShowFloatingInsights] = useState(false);
  const [showPodcast, setShowPodcast] = useState(false);
  const [showInsightsNotification, setShowInsightsNotification] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentPersona, setCurrentPersona] = useState<string>('');
  const [currentJob, setCurrentJob] = useState<string>('');
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pdfId) {
      const doc = documents.find(d => d.id === pdfId);
      if (doc) {
        console.log('Found document for reader:', doc);
        setCurrentDocument(doc);
        // Load related sections and insights
        getRelatedSections(pdfId, 1);
        if (isOnline) {
          getInsights(pdfId, 1);
        }
      } else {
        console.log('Document not found yet for ID:', pdfId, 'Available documents:', documents.length);
      }
    }
  }, [pdfId, documents]); // Removed function dependencies to prevent infinite loop

  // Load saved persona and job only once on mount
  useEffect(() => {
    const savedPersona = localStorage.getItem('lastPersona');
    const savedJob = localStorage.getItem('lastJob');
    if (savedPersona) setCurrentPersona(savedPersona);
    if (savedJob) setCurrentJob(savedJob);
  }, []); // Only run once on mount

  // Handle URL parameters for auto-opening features
  useEffect(() => {
    const insights = searchParams.get('insights');
    const podcast = searchParams.get('podcast');

    if (insights === 'true' && isOnline) {
      setShowFloatingInsights(true);
    }

    if (podcast === 'true' && isOnline) {
      // Small delay to ensure document is loaded
      setTimeout(() => {
        setShowPodcast(true);
      }, 1000);
    }
  }, [searchParams, isOnline]);

  // Show notification when insights are available
  useEffect(() => {
    if (insights && insights.length > 0 && !showFloatingInsights) {
      setShowInsightsNotification(true);
    }
  }, [insights, showFloatingInsights]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedText(selection.toString());
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (currentDocument) {
      getRelatedSections(currentDocument.id, page);
      if (isOnline) {
        getInsights(currentDocument.id, page);
      }
    }
  };

  if (!currentDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center p-8 bg-slate-800 rounded-lg border border-slate-700">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg mb-4">Loading document...</p>
          <div className="text-left bg-slate-900 p-4 rounded border text-xs font-mono">
            <p className="text-cyan-400">🔍 Debug Info:</p>
            <p className="text-slate-300">Looking for document ID: <span className="text-yellow-400">{pdfId}</span></p>
            <p className="text-slate-300">Available documents: <span className="text-green-400">{documents.length}</span></p>
            {documents.length > 0 && (
              <div className="mt-2">
                <p className="text-slate-300">Document IDs:</p>
                {documents.map(d => (
                  <p key={d.id} className="text-blue-400 ml-2">• {d.id} ({d.name})</p>
                ))}
              </div>
            )}
            {documents.length === 0 && (
              <p className="text-red-400 mt-2">⚠️ No documents found in state</p>
            )}
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Debug: Log when reader renders (removed to prevent re-render loops)
  // console.log('🎯 Reader rendering with document:', currentDocument?.name, 'ID:', currentDocument?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950" ref={readerRef}>
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white truncate max-w-md">
                {currentDocument.name}
              </h1>
              <p className="text-sm text-slate-400">Page {currentPage}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Online/Offline Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              isOnline 
                ? 'bg-green-400/10 text-green-400 border border-green-400/20' 
                : 'bg-orange-400/10 text-orange-400 border border-orange-400/20'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>


          </div>
        </div>
      </header>

      {/* Main Content - Integrated PDF Viewer with Built-in Recommendations */}
      <div className="flex-1 h-[calc(100vh-80px)] p-6">
        <SmartPDFViewer
          document={currentDocument}
          onPageChange={handlePageChange}
          onTextSelection={(text, page) => {
            setSelectedText(text);
            // Set position for tooltip (you can enhance this with actual mouse position)
            setSelectionPosition({ x: 100, y: 100 });
          }}
          onOpenInsights={() => setShowFloatingInsights(true)}
          onOpenPodcast={() => setShowPodcast(true)}
        />

        {/* Text Selection Tooltip */}
        {selectedText && selectionPosition && (
          <TextSelectionTooltip
            text={selectedText}
            position={selectionPosition}
            isOnline={isOnline}
            documentId={currentDocument?.id}
            currentPage={currentPage}
            onClose={() => {
              setSelectedText('');
              setSelectionPosition(null);
            }}
          />
        )}
      </div>



      {/* Insights Notification */}
      <InsightsNotification
        isVisible={showInsightsNotification}
        onOpenInsights={() => {
          setShowFloatingInsights(true);
          setShowInsightsNotification(false);
        }}
        onDismiss={() => setShowInsightsNotification(false)}
        insightCount={insights?.length || 0}
      />

      {/* Floating Insights Panel */}
      <FloatingInsightsPanel
        isVisible={showFloatingInsights}
        onClose={() => setShowFloatingInsights(false)}
        position={{ x: 100, y: 100 }}
      />

      {/* Podcast Modal */}
      <PodcastModal
        isVisible={showPodcast}
        onClose={() => setShowPodcast(false)}
        documentId={currentDocument?.id || ''}
        currentPage={currentPage}
        persona={currentPersona}
        job={currentJob}
      />
    </div>
  );
};

export default ReaderPage;