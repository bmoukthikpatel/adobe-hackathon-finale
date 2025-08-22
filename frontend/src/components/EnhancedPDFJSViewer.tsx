import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PDFDocument } from '../context/PDFContext';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, MessageCircle, Minus, Plus, Sparkles, X, Loader2, Copy } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { openDB } from 'idb';

interface EnhancedPDFJSViewerProps {
  document: PDFDocument;
  onPageChange: (page: number) => void;
  onTextSelection?: (text: string, page: number) => void;
}

// Set up PDF.js worker with a default that works offline
// We'll override this dynamically based on network status
pdfjsLib.GlobalWorkerOptions.workerSrc = 'data:application/javascript,self.onmessage=function(e){self.postMessage({action:e.data.action,data:null});}';
console.log('🔧 PDF.js initialized with fallback worker');

// IndexedDB functions for annotations
async function getDb() {
  return openDB("pdf-annotations", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("annotations")) {
        const store = db.createObjectStore("annotations", { keyPath: "id" });
      }
    },
  });
}

async function saveAnnotation(annotation: any) {
  const db = await getDb();
  await db.put("annotations", annotation);
}

async function deleteAnnotation(id: string) {
  const db = await getDb();
  await db.delete("annotations", id);
}

async function loadAllAnnotations(fileId: string) {
  const db = await getDb();
  const all = await db.getAll("annotations");
  return all.filter((a: any) => a.fileId === fileId);
}

const EnhancedPDFJSViewer: React.FC<EnhancedPDFJSViewerProps> = ({ document, onPageChange, onTextSelection }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [selectionState, setSelectionState] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showGeminiTooltip, setShowGeminiTooltip] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState<string>('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [workerInitialized, setWorkerInitialized] = useState(false);

  // Initialize PDF.js worker with proper offline handling
  const initializeWorker = useCallback(async (forceOffline = false) => {
    try {
      const isOffline = !navigator.onLine || forceOffline;

      if (!isOffline) {
        // For online mode, try to set the CDN worker URL
        try {
          const workerUrl = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          console.log('🌐 Online mode - CDN worker configured');
        } catch (error) {
          console.warn('⚠️ CDN worker failed, keeping fallback');
        }
      } else {
        console.log('📱 Offline mode - using fallback worker');
      }

      setWorkerInitialized(true);
      return !isOffline;
    } catch (error) {
      console.warn('⚠️ Worker initialization failed:', error);
      setWorkerInitialized(true);
      return false;
    }
  }, []);

  // Load PDF
  useEffect(() => {
    let canceled = false;
    setLoading(true);

    const loadPDF = async () => {
      try {
        console.log('🔄 Starting PDF load for:', document.url);
        console.log('📄 Document ID:', document.id);
        console.log('📄 Document name:', document.name);

        // Initialize worker based on network status
        const hasWorker = await initializeWorker();
        console.log('🔧 Worker initialized:', hasWorker ? 'with CDN worker' : 'with fallback worker');

        console.log('🔄 Loading PDF with PDF.js...');

        // Simple PDF configuration - worker is handled globally
        const pdfConfig: any = {
          url: document.url,
          verbosity: 1 // Increase verbosity for debugging
        };

        console.log('📋 PDF config:', pdfConfig);

        let loadingTask;
        try {
          loadingTask = pdfjsLib.getDocument(pdfConfig);
          console.log('📋 Loading task created');
        } catch (taskError) {
          console.error('❌ Error creating loading task:', taskError);
          throw taskError;
        }

        let pdf;
        try {
          pdf = await loadingTask.promise;
          console.log('📋 PDF promise resolved');
        } catch (promiseError) {
          console.error('❌ Error resolving PDF promise:', promiseError);
          throw promiseError;
        }

        if (canceled) {
          console.log('⚠️ PDF loading was canceled');
          return;
        }

        console.log('✅ PDF loaded successfully:', pdf.numPages, 'pages');
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);

        console.log('🎨 Starting to render page', pageNum);
        try {
          await renderPage(pageNum, pdf, scale);
          console.log('✅ Page rendered successfully');
        } catch (renderError) {
          console.error('❌ Error rendering page:', renderError);
          // Continue anyway, maybe thumbnails will work
        }

        console.log('🖼️ Generating thumbnails...');
        try {
          generateThumbnails(pdf);
          console.log('✅ Thumbnails generated');
        } catch (thumbError) {
          console.error('❌ Error generating thumbnails:', thumbError);
          // Continue anyway
        }

        console.log('💾 Loading annotations...');
        try {
          const ann = await loadAllAnnotations(document.id);
          setAnnotations(ann);
          console.log('✅ Annotations loaded');
        } catch (annError) {
          console.error('❌ Error loading annotations:', annError);
          // Continue anyway
        }

        console.log('✅ PDF setup complete');
        setLoading(false);
      } catch (err: any) {
        console.error('❌ PDF loading error:', err);
        console.error('❌ Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });

        // Try fallback with forced offline mode
        if (!canceled) {
          try {
            console.log('🔄 Retrying PDF load in forced offline mode...');

            // Force offline worker configuration
            await initializeWorker(true);

            const fallbackConfig = {
              url: document.url,
              verbosity: 1
            };

            console.log('📋 Fallback config:', fallbackConfig);

            const loadingTask = pdfjsLib.getDocument(fallbackConfig);
            const pdf = await loadingTask.promise;

            if (!canceled) {
              console.log('✅ PDF loaded with offline fallback');
              setPdfDoc(pdf);
              setNumPages(pdf.numPages);
              await renderPage(pageNum, pdf, scale);
              generateThumbnails(pdf);
              const ann = await loadAllAnnotations(document.id);
              setAnnotations(ann);
              setLoading(false);
            }
          } catch (fallbackErr: any) {
            console.error('❌ PDF offline fallback also failed:', fallbackErr);
            console.error('❌ Fallback error details:', {
              message: fallbackErr.message,
              stack: fallbackErr.stack,
              name: fallbackErr.name
            });
            setLoading(false);
          }
        }
      }
    };

    loadPDF();
    return () => { canceled = true; };
  }, [document.url, initializeWorker]);

  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(pageNum, pdfDoc, scale);
  }, [pageNum, scale]);

  // Render page to canvas + create text layer
  async function renderPage(num: number, pdf: any, scaleVal: number) {
    try {
      console.log('🎨 Rendering page', num, 'at scale', scaleVal);

      const page = await pdf.getPage(num);
      console.log('📄 Got page object');

      const viewport = page.getViewport({ scale: scaleVal });
      console.log('📐 Viewport created:', viewport.width, 'x', viewport.height);

      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('❌ Canvas ref is null');
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        console.error('❌ Canvas context is null');
        return;
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      console.log('🖼️ Canvas configured');

      // render canvas
      const renderContext = { canvasContext: context, viewport };
      await page.render(renderContext).promise;
      console.log('✅ Canvas rendered');

      // text layer - simplified approach for text selection
      const textContent = await page.getTextContent();
      console.log('📝 Text content extracted:', textContent.items.length, 'items');

      const textLayerDiv = textLayerRef.current;
      if (!textLayerDiv) {
        console.warn('⚠️ Text layer ref is null');
        return;
      }

      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.left = '0';
      textLayerDiv.style.top = '0';
      textLayerDiv.style.color = 'transparent';
      textLayerDiv.style.userSelect = 'text';
      textLayerDiv.style.cursor = 'text';
      console.log('📝 Text layer configured');

      // Create text elements for selection
      textContent.items.forEach((item: any, index: number) => {
        try {
          const textDiv = document.createElement('div');
          textDiv.textContent = item.str;
          textDiv.style.position = 'absolute';
          textDiv.style.left = `${item.transform[4]}px`;
          textDiv.style.top = `${viewport.height - item.transform[5]}px`;
          textDiv.style.fontSize = `${Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1])}px`;
          textDiv.style.fontFamily = item.fontName || 'sans-serif';
          textDiv.style.whiteSpace = 'pre';
          textDiv.style.pointerEvents = 'auto';
          textLayerDiv.appendChild(textDiv);
        } catch (textErr) {
          console.warn('⚠️ Error creating text element', index, ':', textErr);
        }
      });
      console.log('📝 Text elements created');

      try {
        drawAnnotationsForPage(num);
        console.log('✅ Annotations drawn');
      } catch (annotationError) {
        console.error('❌ Error drawing annotations:', annotationError);
        // Continue anyway
      }
      console.log('✅ Page rendering complete');
    } catch (error) {
      console.error('❌ Error rendering page:', error);
      throw error;
    }
  }

  // Thumbnails
  async function generateThumbnails(pdf: any) {
    const thumbs: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 0.18 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      thumbs.push(canvas.toDataURL());
    }
    setThumbnails(thumbs);
  }

  // Navigation 
  function go(delta: number) {
    const target = Math.min(Math.max(1, pageNum + delta), numPages);
    setPageNum(target);
    onPageChange(target);
  }
  
  function jumpTo(p: number) {
    setPageNum(p);
    onPageChange(p);
  }
  
  function zoom(delta: number) {
    const next = Math.min(Math.max(0.6, +(scale + delta).toFixed(2)), 3.0);
    setScale(next);
  }

  // Selection handling: user selects text on the textLayer
  useEffect(() => {
    const textLayer = textLayerRef.current;
    if (!textLayer) return;
    
    function onMouseUp(e: MouseEvent) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionState(null); 
        return;
      }
      const selectedText = sel.toString().trim();
      if (!selectedText) {
        setSelectionState(null);
        return;
      }  
      
      const range = sel.getRangeAt(0);
      const clientRects = Array.from(range.getClientRects());
      const layerRect = textLayer.getBoundingClientRect();
      const rects = clientRects.map((r) => ({
        left: r.left - layerRect.left,
        top: r.top - layerRect.top,
        width: r.width,
        height: r.height,
      }));
      
      // store selection
      const boundingClientRect = range.getBoundingClientRect();
      const selectionInfo = {
        page: pageNum,
        rects,
        text: selectedText,
        clientRect: { 
          left: boundingClientRect.left, 
          top: boundingClientRect.top, 
          width: boundingClientRect.width, 
          height: boundingClientRect.height 
        },
      };
      setSelectionState(selectionInfo);
      setSelectedText(selectedText);
      setShowGeminiTooltip(true);
      
      // clear native selection
      sel.removeAllRanges();
      // draw temporary highlight overlay
      drawSelectionRects(selectionInfo.rects);
      
      if (onTextSelection) {
        onTextSelection(selectedText, pageNum);
      }
    }
    
    textLayer.addEventListener("mouseup", onMouseUp);
    return () => textLayer.removeEventListener("mouseup", onMouseUp);
  }, [pageNum, scale, pdfDoc, onTextSelection]);

  // Draw selection rects overlay
  function drawSelectionRects(rects: any[]) {
    const overlayContainer = getOverlayContainer();
    if (!overlayContainer) return;

    overlayContainer.innerHTML = "";
    rects.forEach((r) => {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.left = `${r.left}px`;
      div.style.top = `${r.top}px`;
      div.style.width = `${r.width}px`;
      div.style.height = `${r.height}px`;
      div.style.background = "rgba(255, 235, 59, 0.45)"; // yellow-ish
      div.style.pointerEvents = "none";
      overlayContainer.appendChild(div);
    });
  }

  function getOverlayContainer() {
    try {
      if (!textLayerRef.current?.parentElement) {
        console.warn('⚠️ Text layer parent element not available');
        return null;
      }

      // Use querySelector instead of getElementById to avoid global scope issues
      let oc = textLayerRef.current.parentElement.querySelector("[data-overlay-id='annotation-overlay']") as HTMLElement;
      if (!oc) {
        oc = document.createElement("div");
        oc.setAttribute("data-overlay-id", "annotation-overlay");
        oc.style.position = "absolute";
        oc.style.left = "0";
        oc.style.top = "0";
        oc.style.pointerEvents = "none";
        oc.style.zIndex = "10";
        textLayerRef.current.parentElement.appendChild(oc);
        console.log('📋 Created overlay container');
      }
      return oc;
    } catch (error) {
      console.error('❌ Error getting overlay container:', error);
      return null;
    }
  }

  // Draw persisted annotations for the currently visible page
  function drawAnnotationsForPage(page: number) {
    const overlayContainer = getOverlayContainer();
    if (!overlayContainer) return;

    overlayContainer.innerHTML = "";

    const pageAnns = annotations.filter((a) => a.page === page);
    pageAnns.forEach((ann) => {
      ann.rects.forEach((r: any) => {
        const div = document.createElement("div");
        div.className = "saved-annotation";
        div.style.position = "absolute";
        div.style.left = `${r.left}px`;
        div.style.top = `${r.top}px`;
        div.style.width = `${r.width}px`;
        div.style.height = `${r.height}px`;
        div.style.background = "rgba(255, 235, 59, 0.45)";
        div.style.cursor = "pointer";
        div.style.pointerEvents = "auto";
        overlayContainer.appendChild(div);
      });
    });
  }

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
          page: pageNum,
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
  }, [selectedText, document.id, pageNum]);

  // Close text selection tooltip
  const handleCloseSelection = useCallback(() => {
    setSelectedText('');
    setSelectionState(null);
    setShowGeminiTooltip(false);
    setGeminiResponse('');
    setIsGeminiLoading(false);
    // Clear overlay
    const oc = getOverlayContainer();
    if (oc) oc.innerHTML = '';
  }, []);

  // Search implementation
  async function runSearch(q: string) {
    if (!pdfDoc || !q) {
      setSearchMatches([]);
      return;
    }
    const matches: any[] = [];
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const tc = await page.getTextContent();
      const pageText = tc.items.map((it: any) => it.str).join(' ');
      const idx = pageText.toLowerCase().indexOf(q.toLowerCase());
      if (idx !== -1) {
        matches.push({ 
          page: p, 
          excerpt: pageText.substr(Math.max(0, idx - 30), 120) 
        });
      }
    }
    setSearchMatches(matches);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if ((e.ctrlKey || e.metaKey) && e.key === '+') zoom(0.25);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNum, scale, pdfDoc]); 

  useEffect(() => {
    drawAnnotationsForPage(pageNum);
  }, [annotations, pageNum]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
          <div className="text-sm text-slate-400">Loading PDF with PDF.js...</div>
          <div className="text-xs text-slate-500 mt-2">
            {!navigator.onLine && "Offline mode - Limited functionality"}
          </div>
        </div>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-white">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️ PDF Loading Failed</div>
          <div className="text-sm text-slate-400 mb-4">
            Unable to load PDF document
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-900 text-white">
      {/* Thumbnails */}
      <div className="w-28 bg-slate-800 border-r border-slate-700 overflow-auto p-2">
        {thumbnails.map((t, idx) => (
          <img
            key={idx}
            src={t}
            alt={`p-${idx+1}`}
            className={`mb-2 cursor-pointer rounded border ${pageNum === idx+1 ? 'ring-2 ring-blue-500' : 'border-transparent'}`}
            onClick={() => jumpTo(idx+1)}
          />
        ))}
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-grow">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-slate-800 px-3 py-2 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} className="p-1 hover:bg-slate-700 rounded text-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-sm text-slate-300">{pageNum} / {numPages}</div>
            <button onClick={() => go(1)} className="p-1 hover:bg-slate-700 rounded text-white">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-700 rounded px-2 py-1 border border-slate-600">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                placeholder="Search in document"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runSearch(searchQuery); }}
                className="ml-2 outline-none bg-transparent text-sm w-48 text-white placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-700 border border-slate-600 rounded px-2 py-1">
              <button onClick={() => zoom(-0.25)} className="p-1 hover:bg-slate-600 rounded text-white">
                <Minus className="h-4 w-4" />
              </button>
              <div className="text-sm px-2 text-slate-300">{(scale * 100).toFixed(0)}%</div>
              <button onClick={() => zoom(0.25)} className="p-1 hover:bg-slate-600 rounded text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content area: canvas + text layer */}
        <div ref={containerRef} className="flex-grow flex items-center justify-center overflow-auto p-6 bg-slate-900">
          <div style={{ position: 'relative' }}>
            <canvas 
              ref={canvasRef} 
              style={{ 
                display: 'block', 
                boxShadow: '0 6px 18px rgba(0,0,0,0.3)', 
                borderRadius: 6,
                backgroundColor: 'white'
              }} 
            />
            <div
              ref={textLayerRef}
              className="textLayer"
              style={{ position: 'absolute', left: 0, top: 0 }}
            />
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default EnhancedPDFJSViewer;
