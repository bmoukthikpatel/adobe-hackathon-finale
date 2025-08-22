import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PDFDocument, usePDF } from '../context/PDFContext';
import CrossDocumentHighlights from './CrossDocumentHighlights';
import RecommendationsPanel from './RecommendationsPanel';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Loader2, Copy, Check, Volume2, Play, Pause, Download, MessageCircle, Send } from 'lucide-react';

interface IntegratedAdobePDFViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
  onOpenInsights?: () => void;
  onOpenPodcast?: () => void;
}

declare global {
  interface Window {
    AdobeDC: any;
  }
}

const IntegratedAdobePDFViewer: React.FC<IntegratedAdobePDFViewerProps> = ({ document, onPageChange, onOpenInsights, onOpenPodcast }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionData, setSelectionData] = useState<any>(null);
  const [showGeminiTooltip, setShowGeminiTooltip] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState<string>('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [cleanupTextSelection, setCleanupTextSelection] = useState<(() => void) | null>(null);

  // Podcast-related state
  const [isPodcastGenerating, setIsPodcastGenerating] = useState(false);
  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const podcastAudioRef = useRef<HTMLAudioElement>(null);

  // AI Panel states
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'summary'>('chat');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Get recommendations and insights from context
  const { relatedSections, insights, crossDocumentSections, getRelatedSections, getInsights } = usePDF();
  const navigate = useNavigate();

  // Handle text selection in Adobe PDF
  const handleTextSelection = useCallback((text: string, data: any) => {
    console.log('📝 Text selected:', text);
    setSelectedText(text);
    setSelectionData(data);
    setShowGeminiTooltip(true);
  }, []);

  // Chat functionality
  const sendChatMessage = async () => {
    if (!currentMessage.trim() || isChatLoading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setIsChatLoading(true);

    // Add user message to chat
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMessage }];
    setChatMessages(newMessages);

    try {
      const response = await fetch('/api/ask-gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_text: userMessage,
          context: `PDF: ${document.name}, Page: ${currentPage}`,
          persona: 'Student',
          job: 'Research'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      setChatMessages([...newMessages, { role: 'assistant' as const, content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages([...newMessages, {
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Generate summary
  const generateSummary = async () => {
    if (isSummaryLoading) return;

    setIsSummaryLoading(true);
    try {
      const response = await fetch('/api/ask-gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_text: `Please provide a comprehensive summary of this PDF document: ${document.name}`,
          context: `Current page: ${currentPage}`,
          persona: 'Student',
          job: 'Research'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.response);
    } catch (error) {
      console.error('Summary error:', error);
      setSummary('Sorry, I could not generate a summary at this time. Please try again.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Ask Gemini about selected text
  const handleAskGemini = useCallback(async () => {
    if (!selectedText || !document.id) return;

    setIsGeminiLoading(true);

    try {
      const response = await fetch('/api/ask-gemini-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: document.id,
          selected_text: selectedText,
          page: currentPage,
          context_chars: 500
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get Gemini response');
      }

      const data = await response.json();
      setGeminiResponse(data.explanation || 'No explanation available');
    } catch (error) {
      console.error('Failed to ask Gemini:', error);
      setGeminiResponse('Sorry, I could not analyze this text at the moment. Please try again.');
    } finally {
      setIsGeminiLoading(false);
    }
  }, [selectedText, document.id, currentPage]);

  // Generate podcast from selected text or full document
  const handleGeneratePodcast = useCallback(async (textContent?: string) => {
    setIsPodcastGenerating(true);
    setPodcastError(null);
    setPodcastAudioUrl(null);

    try {
      const BACKEND_URL = 'http://127.0.0.1:8080';

      // Use selected text if provided, otherwise generate for full document
      const requestBody = {
        document_id: document.id,
        page: currentPage,
        selected_text: textContent || selectedText || undefined,
        persona: 'Student', // Could be made configurable
        job: 'Learning and Research'
      };

      console.log('🎙️ Generating podcast with:', requestBody);

      const response = await fetch(`${BACKEND_URL}/api/generate-podcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate podcast: ${response.statusText}`);
      }

      const data = await response.json();
      const audioUrl = `${BACKEND_URL}${data.audioUrl}`;
      setPodcastAudioUrl(audioUrl);

      console.log('✅ Podcast generated:', audioUrl);
    } catch (err) {
      console.error('❌ Podcast generation failed:', err);
      setPodcastError(err instanceof Error ? err.message : 'Failed to generate podcast');
    } finally {
      setIsPodcastGenerating(false);
    }
  }, [document.id, currentPage, selectedText]);

  // Handle podcast playback
  const handlePodcastPlayPause = useCallback(() => {
    if (!podcastAudioRef.current || !podcastAudioUrl) return;

    if (isPodcastPlaying) {
      podcastAudioRef.current.pause();
      setIsPodcastPlaying(false);
    } else {
      podcastAudioRef.current.play();
      setIsPodcastPlaying(true);
    }
  }, [isPodcastPlaying, podcastAudioUrl]);

  // Handle podcast download
  const handlePodcastDownload = useCallback(() => {
    if (!podcastAudioUrl) return;

    const link = document.createElement('a');
    link.href = podcastAudioUrl;
    link.download = `podcast_${document.name}_page_${currentPage}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [podcastAudioUrl, document.name, currentPage]);

  // Close text selection tooltip
  const handleCloseSelection = useCallback(() => {
    setSelectedText('');
    setSelectionData(null);
    setShowGeminiTooltip(false);
    setGeminiResponse('');
    setIsGeminiLoading(false);
    // Reset podcast state when closing selection
    setPodcastAudioUrl(null);
    setIsPodcastPlaying(false);
    setPodcastError(null);
  }, []);

  // Setup text selection detection for Adobe PDF Embed API
  const setupTextSelectionDetection = useCallback((viewerId: string) => {
    const container = window.document.getElementById(viewerId);
    if (!container) {
      console.warn('PDF container not found for text selection setup');
      return;
    }

    console.log('🔧 Setting up enhanced text selection detection for Adobe PDF');

    let selectionCheckInterval: number;
    let lastSelectedText = '';

    // Function to check for text selection
    const checkTextSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const selectedText = selection.toString().trim();

        // Only trigger if text is different and substantial
        if (selectedText !== lastSelectedText && selectedText.length > 3) {
          console.log('📝 Text selected in Adobe PDF:', selectedText);
          lastSelectedText = selectedText;

          handleTextSelection(selectedText, {
            selection: selection,
            range: selection.rangeCount > 0 ? selection.getRangeAt(0) : null
          });
        }
      } else if (lastSelectedText) {
        // Selection was cleared
        lastSelectedText = '';
      }
    };

    // Multiple detection methods for Adobe PDF Embed API
    const handleMouseUp = () => {
      setTimeout(checkTextSelection, 150);
    };

    const handleSelectionChange = () => {
      setTimeout(checkTextSelection, 100);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Detect Ctrl+A or other selection shortcuts
      if (e.ctrlKey || e.metaKey) {
        setTimeout(checkTextSelection, 200);
      }
    };

    // Add event listeners to container and document
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleMouseUp);
    container.addEventListener('keyup', handleKeyUp);
    window.document.addEventListener('selectionchange', handleSelectionChange);

    // Also check periodically for selections (fallback)
    selectionCheckInterval = setInterval(checkTextSelection, 1000);

    // Enhanced detection for Adobe PDF iframe content
    const checkForIframe = () => {
      const iframe = container.querySelector('iframe');
      if (iframe) {
        console.log('🔍 Found Adobe PDF iframe, setting up iframe text selection');
        try {
          // Try to access iframe content (may be blocked by CORS)
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.addEventListener('mouseup', handleMouseUp);
            iframeDoc.addEventListener('selectionchange', handleSelectionChange);
            console.log('✅ Successfully attached to iframe events');
          }
        } catch (e) {
          console.log('⚠️ Cannot access iframe content (CORS), using fallback detection');
        }
      }
    };

    // Check for iframe after Adobe PDF loads
    setTimeout(checkForIframe, 3000);
    setTimeout(checkForIframe, 5000);

    // Store cleanup function
    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleMouseUp);
      container.removeEventListener('keyup', handleKeyUp);
      window.document.removeEventListener('selectionchange', handleSelectionChange);

      if (selectionCheckInterval) {
        clearInterval(selectionCheckInterval);
      }

      // Clean up iframe listeners if they exist
      const iframe = container.querySelector('iframe');
      if (iframe) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.removeEventListener('mouseup', handleMouseUp);
            iframeDoc.removeEventListener('selectionchange', handleSelectionChange);
          }
        } catch (e) {
          // Ignore CORS errors during cleanup
        }
      }
    };
  }, [handleTextSelection]);

  // Handle opening cross-document sections
  const handleOpenDocument = useCallback((documentId: string, page?: number) => {
    console.log('🔗 Opening cross-document:', documentId, 'page:', page);
    navigate(`/reader/${documentId}${page ? `?page=${page}` : ''}`);
  }, [navigate]);

  // Memoize the initialization function to prevent infinite loops
  const initializeViewer = useCallback(async () => {
    if (isInitialized || !containerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Initializing Adobe PDF Viewer for:', document.name);

      // Wait for Adobe DC to be available
      if (!window.AdobeDC) {
        let attempts = 0;
        while (!window.AdobeDC && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        if (!window.AdobeDC) {
          throw new Error('Adobe PDF Embed API not available');
        }
      }

      // Clear container and set unique ID
      containerRef.current.innerHTML = '';
      const viewerId = `adobe-viewer-${document.id}`;
      containerRef.current.id = viewerId;

      // Initialize Adobe DC View
      const adobeDCView = new window.AdobeDC.View({
        clientId: '58fd98c1606c492da905f93b81d8d0cf',
        divId: viewerId,
      });

      // Load PDF with full-width configuration to accommodate side panel
      await adobeDCView.previewFile(
        {
          content: { location: { url: document.url } },
          metaData: { fileName: document.name },
        },
        {
          embedMode: "SIZED_CONTAINER",
          defaultViewMode: "FIT_WIDTH", // Use FIT_WIDTH to work better with side panel
          showAnnotationTools: false,
          showLeftHandPanel: false,
          showDownloadPDF: false,
          showPrintPDF: false,
          showBookmarks: false,
        }
      );

      // Register page change events and text selection events
      adobeDCView.registerCallback(
        window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
        (event: any) => {
          console.log('🔔 Adobe PDF Event:', event.type, event.data);

          if (event.type === "PAGE_VIEW" && event.data?.pageNumber) {
            const pageNumber = event.data.pageNumber;
            console.log('📄 Page changed to:', pageNumber);
            setCurrentPage(pageNumber);
            onPageChange(pageNumber);
            // Load recommendations for the new page
            console.log('🔄 Loading recommendations for page:', pageNumber);
            getRelatedSections(document.id, pageNumber);
            console.log('🔄 Loading insights for page:', pageNumber);
            getInsights(document.id, pageNumber);
          }

          // Try to capture text selection events if available
          if (event.type === "TEXT_SELECTION" || event.type === "SELECTION_CHANGE") {
            console.log('📝 Adobe PDF text selection event:', event.data);
            if (event.data?.selectedText) {
              const selectedText = event.data.selectedText.trim();
              if (selectedText.length > 3) {
                console.log('📝 Text selected via Adobe API:', selectedText);
                handleTextSelection(selectedText, event.data);
              }
            }
          }
        }
      );

      // Try to register text selection callback if available
      try {
        if (window.AdobeDC.View.Enum.CallbackType.TEXT_SELECTION) {
          adobeDCView.registerCallback(
            window.AdobeDC.View.Enum.CallbackType.TEXT_SELECTION,
            (selectionData: any) => {
              console.log('📝 Adobe PDF text selection callback:', selectionData);
              if (selectionData?.selectedText) {
                const selectedText = selectionData.selectedText.trim();
                if (selectedText.length > 3) {
                  handleTextSelection(selectedText, selectionData);
                }
              }
            }
          );
          console.log('✅ Adobe PDF text selection callback registered');
        }
      } catch (e) {
        console.log('⚠️ Adobe PDF text selection callback not available:', e);
      }

      // Set up text selection detection using DOM events
      // Adobe PDF Embed API doesn't have direct text selection callbacks
      // We'll use DOM event listeners on the container instead
      setTimeout(() => {
        const cleanup = setupTextSelectionDetection(viewerId);
        setCleanupTextSelection(() => cleanup);
      }, 2000); // Wait for PDF to fully load

      setIsInitialized(true);
      setIsLoading(false);
      console.log('✅ Adobe PDF Viewer initialized successfully');

      // Load initial recommendations with debugging
      console.log('🔄 Loading initial recommendations for document:', document.id);
      getRelatedSections(document.id, 1);
      console.log('🔄 Loading initial insights for document:', document.id);
      getInsights(document.id, 1);

    } catch (err) {
      console.error('❌ Adobe PDF Viewer error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize PDF viewer');
      setIsLoading(false);
    }
  }, [document.id, document.name, document.url, isInitialized, getRelatedSections, getInsights, onPageChange]);

  // Global text selection detection for Adobe PDF
  useEffect(() => {
    let lastSelection = '';

    const handleGlobalSelectionChange = () => {
      // Only process if the Adobe PDF viewer is active
      if (!isInitialized || isLoading) return;

      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const selectedText = selection.toString().trim();

        // Check if selection is within our PDF container
        const container = containerRef.current;
        if (container && selectedText !== lastSelection && selectedText.length > 3) {
          const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          if (range) {
            // Check if the selection is within our PDF container
            const isWithinPDF = container.contains(range.commonAncestorContainer) ||
                               container.contains(range.startContainer) ||
                               container.contains(range.endContainer);

            if (isWithinPDF) {
              console.log('📝 Global text selection detected in Adobe PDF:', selectedText);
              lastSelection = selectedText;
              handleTextSelection(selectedText, {
                selection: selection,
                range: range
              });
            }
          }
        }
      } else {
        lastSelection = '';
      }
    };

    // Add global selection change listener
    window.document.addEventListener('selectionchange', handleGlobalSelectionChange);

    return () => {
      window.document.removeEventListener('selectionchange', handleGlobalSelectionChange);
    };
  }, [isInitialized, isLoading, handleTextSelection]);

  // Initialize viewer when component mounts
  useEffect(() => {
    initializeViewer();
  }, [initializeViewer]);

  // Cleanup effect for text selection listeners
  useEffect(() => {
    return () => {
      if (cleanupTextSelection) {
        cleanupTextSelection();
      }
    };
  }, [cleanupTextSelection]);

  if (error) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">PDF Viewer Error</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <a 
            href={document.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
          >
            Open PDF in New Tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Adobe PDF Viewer - Takes up 70% width */}
      <div className="flex-1 relative" style={{ width: '70%' }}>
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/95 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white text-lg mb-2">Loading Adobe PDF Viewer...</p>
              <p className="text-slate-400 text-sm">{document.name}</p>
            </div>
          </div>
        )}

        {/* Adobe PDF Container */}
        <div 
          ref={containerRef}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        />

        {/* PDF Info Overlay */}
        {!isLoading && !error && (
          <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg px-3 py-2 border border-slate-600 z-10">
            <p className="text-white text-sm font-medium">{document.name}</p>
            <p className="text-slate-400 text-xs">
              Page {currentPage} • {(document.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}



        {/* Podcast Player - Full Document */}
        {podcastAudioUrl && !selectedText && (
          <div className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur rounded-lg p-3 border border-slate-600 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePodcastPlayPause}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                >
                  {isPodcastPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <div>
                  <p className="text-white text-sm font-medium">Document Podcast</p>
                  <p className="text-slate-400 text-xs">{document.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePodcastDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                  title="Download podcast"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setPodcastAudioUrl(null);
                    setIsPodcastPlaying(false);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Close podcast"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Chatbot Panel - Conditionally rendered */}
      {showAIPanel && (
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col max-h-full">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-lg">AI Assistant</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    activeTab === 'summary'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Close AI Panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              {activeTab === 'chat' ? 'Ask questions about this PDF' : 'AI-generated summary'}
            </p>
          </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' ? (
            // Chat Interface
            <div className="flex-1 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm">Start a conversation</p>
                    <p className="text-xs mt-1">Ask questions about this PDF or search within it</p>
                  </div>
                ) : (
                  chatMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 text-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Ask about this PDF or search within it..."
                    className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isChatLoading}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!currentMessage.trim() || isChatLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Summary Interface
            <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium">Document Summary</h4>
                <button
                  onClick={generateSummary}
                  disabled={isSummaryLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg px-3 py-1 text-sm transition-colors flex items-center gap-2"
                >
                  {isSummaryLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {summary ? (
                  <div className="bg-slate-700/50 rounded-lg p-4 text-slate-200 text-sm leading-relaxed">
                    {summary}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm">No summary generated yet</p>
                    <p className="text-xs mt-1">Click "Generate" to create an AI summary</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        </div>
      )}

      {/* Floating Action Buttons - Show when panel is closed */}
      {!showAIPanel && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
          {/* AI Chat Button */}
          <button
            onClick={() => {
              setShowAIPanel(true);
              setActiveTab('chat');
            }}
            className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95"
            title="Open AI Chat"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>

          {/* Insights Button */}
          <button
            onClick={() => {
              if (onOpenInsights) {
                onOpenInsights();
              }
            }}
            className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-full shadow-lg shadow-yellow-400/25 transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95"
            title="Open AI Insights (+5 points)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>

          {/* Podcast Button */}
          <button
            onClick={() => {
              if (onOpenPodcast) {
                onOpenPodcast();
              }
            }}
            className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full shadow-lg shadow-purple-500/25 transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95"
            title="Generate Podcast Overview (+5 points)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
        </div>
      )}



      {/* Cross-Document Highlights Overlay */}
      <CrossDocumentHighlights
        crossDocumentSections={crossDocumentSections}
        onOpenDocument={handleOpenDocument}
        currentPage={currentPage}
        documentId={document.id}
      />

      {/* Gemini Text Selection Tooltip */}
      {showGeminiTooltip && selectedText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-slate-900/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-lg font-medium text-white">Ask Gemini</span>
              </div>
              <button
                onClick={handleCloseSelection}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-slate-400 mb-2">Selected Text:</div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-300 max-h-20 overflow-y-auto">
                "{selectedText}"
              </div>
            </div>

            {!geminiResponse ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleAskGemini}
                    disabled={isGeminiLoading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGeminiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Explain This
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedText)}
                    className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>

                {/* Podcast Controls */}
                <div className="border-t border-slate-700 pt-3">
                  <div className="text-xs text-slate-400 mb-2">🎙️ Podcast Mode (+5 points)</div>
                  {!podcastAudioUrl ? (
                    <button
                      onClick={() => handleGeneratePodcast(selectedText)}
                      disabled={isPodcastGenerating}
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:from-orange-700 hover:to-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isPodcastGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating Audio...
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          Generate Podcast
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handlePodcastPlayPause}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {isPodcastPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Play
                          </>
                        )}
                      </button>
                      <button
                        onClick={handlePodcastDownload}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  )}

                  {podcastError && (
                    <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded p-2">
                      {podcastError}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm text-slate-400 mb-2">Gemini Explanation:</div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300 leading-relaxed max-h-60 overflow-y-auto">
                  {geminiResponse}
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700">
                  <span className="text-xs text-slate-400">Powered by Gemini AI</span>
                  <button
                    onClick={handleCloseSelection}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Audio Element for Podcast Playback */}
      {podcastAudioUrl && (
        <audio
          ref={podcastAudioRef}
          src={podcastAudioUrl}
          onEnded={() => setIsPodcastPlaying(false)}
          onError={() => {
            setPodcastError('Failed to load audio');
            setIsPodcastPlaying(false);
          }}
        />
      )}
    </div>
  );
};

export default IntegratedAdobePDFViewer;
