import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Search, X, Upload, FileText, ChevronLeft, ChevronRight, Settings, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactMarkdown from 'react-markdown';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type UIState = 'IDLE' | 'GENERATING' | 'DONE' | 'ERROR';

const PixelArtLoader = () => {
  const COLS = 7;
  const ROWS = 9;
  
  const [pixels, setPixels] = useState(() => Array.from({length: ROWS * COLS}, (_, i) => ({
    r: Math.floor(i / COLS),
    c: i % COLS,
    active: false,
    color: '#000',
    char: ''
  })));

  useEffect(() => {
    const update = () => {
      setPixels(prev => prev.map(p => {
        const dx = p.c - COLS / 2;
        const dy = p.r - ROWS / 2;
        const isActive = Math.random() > 0.1 && (dx*dx*1.8 + dy*dy < 14);
        if (isActive) {
          const isWhite = Math.random() < 0.25 && p.c <= COLS / 2; 
          const shades = ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.8)'];
          return {
            ...p,
            active: true,
            color: isWhite ? '#ffffff' : shades[Math.floor(Math.random() * shades.length)],
            char: isWhite ? Math.floor(Math.random() * 10).toString() : ''
          };
        } else {
          return { ...p, active: false };
        }
      }));
    };
    
    update();
    const interval = setInterval(update, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex pointer-events-none"
    >
      <div 
        className="grid gap-[1px]" 
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, width: '70px', height: '90px' }}
      >
        {pixels.map((p, i) => (
          <div 
            key={i} 
            className="flex items-center justify-center text-[10px] font-mono leading-none font-bold overflow-hidden"
            style={{
              backgroundColor: p.active ? p.color : 'transparent',
              color: p.color === '#ffffff' ? '#000000' : 'transparent',
            }}
          >
            {p.char}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [rects, setRects] = useState<Rect[]>([]);
  const [uiState, setUiState] = useState<UIState>('IDLE');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageErrorMsg, setImageErrorMsg] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  // PDF specific state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(typeof window !== 'undefined' && window.innerWidth < 640 ? 0.8 : 1.2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dual API Settings State
  const [showSettings, setShowSettings] = useState(false);
  
  const [textBaseUrl, setTextBaseUrl] = useState(localStorage.getItem('peek_text_base_url') || 'https://integrate.api.nvidia.com/v1');
  const [textApiKey, setTextApiKey] = useState(localStorage.getItem('peek_text_api_key') || '');
  const [textModel, setTextModel] = useState(localStorage.getItem('peek_text_model') || 'meta/llama-3.1-70b-instruct');
  
  const [imageBaseUrl, setImageBaseUrl] = useState(localStorage.getItem('peek_image_base_url') || 'https://api-inference.huggingface.co/models');
  const [imageApiKey, setImageApiKey] = useState(localStorage.getItem('peek_image_api_key') || '');
  const [imageModel, setImageModel] = useState(localStorage.getItem('peek_image_model') || 'stabilityai/stable-diffusion-3.5-large');
  
  const [language, setLanguage] = useState(localStorage.getItem('peek_language') || 'English');
  const [theme, setTheme] = useState<'dark'|'emerald'|'rose'>(localStorage.getItem('peek_theme') as 'dark'|'emerald'|'rose' || 'dark');
  const [showHistory, setShowHistory] = useState(false);
  const [vocabHistory, setVocabHistory] = useState<{word: string, def: string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('peek_vocab_history') || '[]'); } catch { return []; }
  });
  
  const [modelsList, setModelsList] = useState<{id: string}[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  
  const [imageModelsList, setImageModelsList] = useState<{id: string}[]>([]);
  const [isFetchingImageModels, setIsFetchingImageModels] = useState(false);

  const fetchModels = async () => {
    if (!textApiKey || !textBaseUrl) {
      alert('Please enter a Text API Key and Base URL first.');
      return;
    }
    setIsFetchingModels(true);
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           method: 'GET',
           endpoint: `${textBaseUrl.replace(/\/$/, '')}/models`,
           apiKey: textApiKey
        })
      });
      if (!res.ok) throw new Error('Failed to fetch models via proxy.');
      const data = await res.json();
      if (data.data) {
        setModelsList(data.data);
      } else if (data.error) {
        throw new Error(data.error.message || 'Error fetching models');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const fetchImageModels = async () => {
    setIsFetchingImageModels(true);
    try {
      const res = await fetch('https://huggingface.co/api/models?pipeline_tag=text-to-image&sort=likes&limit=30');
      if (!res.ok) throw new Error('Failed to fetch HF models');
      const data = await res.json();
      setImageModelsList(data.map((m: any) => ({ id: m.id })));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsFetchingImageModels(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('peek_text_base_url', textBaseUrl);
    localStorage.setItem('peek_text_api_key', textApiKey);
    localStorage.setItem('peek_text_model', textModel);
    
    localStorage.setItem('peek_image_base_url', imageBaseUrl);
    localStorage.setItem('peek_image_api_key', imageApiKey);
    localStorage.setItem('peek_image_model', imageModel);
    
    localStorage.setItem('peek_language', language);
    setShowSettings(false);
  };

  const handleEnterClick = () => {
    if (!textApiKey) {
      setShowSettings(true);
      return;
    }
    setShowWelcome(false);
  };

  const uiStateRef = useRef(uiState);
  uiStateRef.current = uiState;

  useEffect(() => {
    const handleSelectionChange = () => {
      if (uiStateRef.current !== 'IDLE' || showSettings) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setRects([]);
        setSelectionText('');
        if (uiStateRef.current !== 'IDLE') {
          setUiState('IDLE');
          setImageUrl(null);
          setExplanation(null);
          setErrorMsg(null);
        }
        return;
      }
      const range = selection.getRangeAt(0);
      const domRects = Array.from(range.getClientRects());
      setRects(domRects.map((r) => ({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      })));
      setSelectionText(selection.toString());
    };

    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showSettings]);

  const handleGenerate = async (e?: React.MouseEvent | React.TouchEvent, isDeepDive = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!selectionText) return;
    if (!textApiKey) {
      alert("Please enter your Text API Key in Settings first.");
      setShowSettings(true);
      return;
    }

    setUiState('GENERATING');
    setImageUrl(null);
    setExplanation(null);
    setErrorMsg(null);
    setImageErrorMsg(null);
    setIsImageLoading(true);

    const systemPrompt = isDeepDive 
      ? `You are an expert tutor. Provide a deep, comprehensive analysis of the word or phrase. Include etymology, multiple contexts, nuances, and advanced usage.`
      : `You are a dictionary assistant. Provide a concise, clear definition and one simple example. Keep it short.`;

    try {
      const textPromise = fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          endpoint: `${textBaseUrl.replace(/\/$/, '')}/chat/completions`,
          apiKey: textApiKey,
          payload: {
            model: textModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Explain "${selectionText}" in ${language}. ${language.toLowerCase().includes('tenglish') ? 'CRITICAL SYSTEM INSTRUCTION: DO NOT USE A SINGLE LETTER OF NATIVE TELUGU SCRIPT. Write absolutely everything using ONLY the English (Roman) alphabet. Transliterate all Telugu words. If you use native Telugu script, the system will crash.' : ''}` }
            ],
            temperature: 0.1,
            max_tokens: isDeepDive ? 800 : 400
          }
        })
      }).then(r => r.json());

      let imagePromise = Promise.resolve<any>(null);
      
      if (!imageApiKey) {
        imagePromise = fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(selectionText)}?width=512&height=512&nologo=true`)
          .then(async (r) => {
            if (!r.ok) throw new Error('Pollinations failed');
            const blob = await r.blob();
            return { blob };
          });
      } else {
        imagePromise = fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'POST',
            endpoint: `${imageBaseUrl.replace(/\/$/, '')}/${imageModel}`,
            apiKey: imageApiKey,
            payload: { inputs: `A clear, educational, literal illustration of the concept: ${selectionText}. High quality, straightforward.` }
          })
        }).then(r => r.json());
      }

      const [textData, imgResult] = await Promise.allSettled([textPromise, imagePromise]);

      if (textData.status === 'fulfilled') {
        if (textData.value.error) throw new Error(textData.value.error.message || 'Text API Error');
        const textResponse = textData.value.choices?.[0]?.message?.content?.trim();
        if (textResponse) {
          setExplanation(textResponse);
          setVocabHistory(prev => {
            const newList = [{word: selectionText, def: textResponse}, ...prev.filter(item => item.word !== selectionText)];
            localStorage.setItem('peek_vocab_history', JSON.stringify(newList));
            return newList;
          });
        }
      } else {
        throw new Error('Failed to fetch text definition.');
      }

      setIsImageLoading(false);

      if (imgResult.status === 'fulfilled' && imgResult.value) {
        if (imgResult.value.blob) {
          setImageUrl(URL.createObjectURL(imgResult.value.blob));
        } else if (imgResult.value.error) {
          setImageErrorMsg(imgResult.value.error);
        } else if (Array.isArray(imgResult.value) && imgResult.value[0]?.url) {
          setImageUrl(imgResult.value[0].url);
        } else if (imgResult.value.image) {
          setImageUrl(`data:image/jpeg;base64,${imgResult.value.image}`);
        } else {
           setImageErrorMsg('Could not parse image response');
        }
      } else if (imgResult.status === 'rejected') {
         setImageErrorMsg('Failed to generate image');
      }

      setUiState('DONE');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
      setUiState('ERROR');
      setIsImageLoading(false);
    }
  };

  const showTooltip = !!selectionText && !showSettings;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const exportVocabToCSV = () => {
    if (vocabHistory.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Word,Definition\n" 
      + vocabHistory.map(row => `"${row.word.replace(/"/g, '""')}","${row.def.replace(/"/g, '""')}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vocabulary_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getThemeGradient = () => {
    switch(theme) {
      case 'emerald': return 'from-emerald-900 via-teal-900 to-cyan-900';
      case 'rose': return 'from-rose-900 via-red-900 to-orange-900';
      default: return 'from-indigo-900 via-purple-900 to-fuchsia-900';
    }
  };

  return (
    <div className={`w-full min-h-screen overflow-x-hidden bg-gradient-to-br ${getThemeGradient()} text-white`}>
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-[0_8px_32px_rgba(31,38,135,0.37)] flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold tracking-tight">BYOK Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-white/80" /></button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-black/20 p-4 rounded-2xl border border-white/10 space-y-3">
                  <h3 className="font-bold text-yellow-300 flex items-center gap-2">📝 Text Generation (NVIDIA NIM)</h3>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white/70">Base URL</label>
                    <input value={textBaseUrl} onChange={e => setTextBaseUrl(e.target.value)} className="w-full bg-black/40 border border-white/20 p-2.5 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white/70">API Key</label>
                    <input type="password" value={textApiKey} onChange={e => setTextApiKey(e.target.value)} className="w-full bg-black/40 border border-white/20 p-2.5 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50" placeholder="nvapi-..." />
                  </div>
                  <button onClick={fetchModels} disabled={isFetchingModels} className="w-full bg-white/10 hover:bg-white/20 active:bg-white/10 text-white text-sm font-medium py-2 rounded-lg border border-white/20 transition-colors backdrop-blur-md">
                    {isFetchingModels ? 'Fetching Models...' : 'Fetch Text Models'}
                  </button>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white/70">Model</label>
                    {modelsList.length > 0 ? (
                      <select value={textModel} onChange={e => setTextModel(e.target.value)} className="w-full bg-black/40 border border-white/20 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-white/50 transition-all [&>option]:bg-gray-900">
                        {modelsList.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                      </select>
                    ) : (
                      <input value={textModel} onChange={e => setTextModel(e.target.value)} className="w-full bg-black/40 border border-white/20 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-white/50" />
                    )}
                  </div>
                </div>

                  <div className="bg-black/20 p-4 rounded-2xl border border-white/10 space-y-3">
                  <h3 className="font-bold text-fuchsia-300 flex items-center gap-2">🎨 Image Generation</h3>
                  <p className="text-xs text-white/50 mb-2">Leave blank to use the Free Zero-Key Generator, or enter a provider (like Together AI / Hugging Face) below.</p>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white/70">Base URL (Optional)</label>
                    <input value={imageBaseUrl} onChange={e => setImageBaseUrl(e.target.value)} className="w-full bg-black/40 border border-white/20 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-white/50" placeholder="https://api-inference.huggingface.co/models" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white/70">API Key (Optional)</label>
                    <input type="password" value={imageApiKey} onChange={e => setImageApiKey(e.target.value)} className="w-full bg-black/40 border border-white/20 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-white/50" placeholder="hf_..." />
                  </div>
                  <button onClick={fetchImageModels} disabled={isFetchingImageModels} className="w-full bg-white/10 hover:bg-white/20 active:bg-white/10 text-white text-sm font-medium py-2 rounded-lg border border-white/20 transition-colors backdrop-blur-md">
                    {isFetchingImageModels ? 'Fetching Models...' : 'Fetch HF Image Models'}
                  </button>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white/70">Model Path</label>
                    {imageModelsList.length > 0 ? (
                      <select value={imageModel} onChange={e => setImageModel(e.target.value)} className="w-full bg-black/40 border border-white/20 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-white/50 transition-all [&>option]:bg-gray-900">
                        {imageModelsList.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                      </select>
                    ) : (
                      <input value={imageModel} onChange={e => setImageModel(e.target.value)} className="w-full bg-black/40 border border-white/20 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-white/50" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-white/80">Output Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-black/30 border border-white/20 p-3 rounded-xl text-white focus:outline-none focus:border-white/50 transition-all [&>option]:bg-gray-900">
                    <option value="English">English</option>
                    <option value="Tenglish (Telugu-English)">Tenglish</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                  </select>
                </div>
              </div>

              <button onClick={handleSaveSettings} className="w-full bg-white text-indigo-900 font-bold py-3.5 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all mt-4 shadow-lg">
                Save & Apply
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[800px] mx-auto px-4 sm:px-8 min-h-screen pt-10 pb-24 font-sans leading-relaxed text-lg relative flex flex-col">
        
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 flex gap-3">
           <button onClick={() => {
             const themes: ('dark'|'emerald'|'rose')[] = ['dark', 'emerald', 'rose'];
             const currentIndex = themes.indexOf(theme as any);
             const newTheme = themes[(currentIndex + 1) % themes.length];
             setTheme(newTheme);
             localStorage.setItem('peek_theme', newTheme);
           }} className="p-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full hover:bg-white/20 transition-all shadow-xl z-10 active:scale-95">
             <Sparkles className="w-5 h-5 text-white" />
           </button>
           <button onClick={() => setShowHistory(true)} className="p-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full hover:bg-white/20 transition-all shadow-xl z-10 active:scale-95">
             <FileText className="w-5 h-5 text-white" />
           </button>
           <button onClick={() => setShowSettings(true)} className="p-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full hover:bg-white/20 transition-all shadow-xl z-10 active:scale-95">
             <Settings className="w-5 h-5 text-white" />
           </button>
        </div>

        {showWelcome ? (
          <div className="flex-1 flex flex-col justify-center gap-6 max-w-[600px] mx-auto w-full">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              peek-a-word
            </h1>
            <p className="text-xl leading-relaxed font-medium text-white/80">
              Enjoy an interactive reading experience. Upload a PDF, then highlight any word to get an instant definition with contextual images.
            </p>
            
            <div className="w-full h-[100px] bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center rounded-2xl my-2 shadow-inner">
               <span className="text-sm font-medium text-white/40 tracking-wide uppercase">Advertisement Placement</span>
            </div>

            <button 
              onClick={handleEnterClick}
              className="w-full h-[60px] bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white font-semibold text-lg rounded-2xl transition-all shadow-[0_8px_32px_rgba(0,0,0,0.2)] active:scale-[0.98] flex items-center justify-center"
            >
              Enter App
            </button>
          </div>
        ) : (
          <div className="flex flex-col w-full mt-8">
            <div className="mb-6 flex items-center h-[60px] gap-3">
              <button
                onClick={() => {
                  if (pdfFile) setPdfFile(null);
                  else setShowWelcome(true);
                }}
                className="h-full aspect-square flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 rounded-2xl shrink-0 transition-all active:scale-95 shadow-lg"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              
              {!pdfFile ? (
                <div className="flex-1 h-full bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 rounded-2xl flex items-center justify-center px-4 cursor-pointer transition-all active:scale-[0.98] shadow-lg"
                     onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-5 h-5 mr-2 text-white" />
                  <span className="font-semibold text-white">Upload PDF</span>
                  <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file && file.type === 'application/pdf') { setPdfFile(file); setUiState('IDLE'); setErrorMsg(null); }
                    else if (file) { setUiState('ERROR'); setErrorMsg('Please select a valid PDF file.'); }
                  }} />
                </div>
              ) : (
                <div className="flex-1 h-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl flex items-center justify-between px-3 sm:px-5 shadow-lg min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 overflow-hidden min-w-0 mr-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 shrink-0" />
                    <span className="font-medium text-white truncate text-sm sm:text-base">{pdfFile.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 shrink-0 bg-black/20 p-1 rounded-xl">
                      <button onClick={() => setPdfScale(s => Math.max(0.4, s - 0.2))} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-white font-bold text-sm sm:text-base leading-none">-</button>
                      <button onClick={() => setPdfScale(s => Math.min(3.0, s + 0.2))} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-white font-bold text-sm sm:text-base leading-none">+</button>
                    </div>
                    {numPages > 1 && (
                      <div className="flex items-center gap-1 shrink-0 bg-black/20 p-1 rounded-xl">
                        <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4 text-white" /></button>
                        <span className="text-xs sm:text-sm font-semibold text-white min-w-[2.5rem] sm:min-w-[3rem] text-center tabular-nums">{pageNumber} / {numPages}</span>
                        <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4 text-white" /></button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!pdfFile && (
               <div className="flex-1 min-h-[400px] bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/20 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-xl"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                   <Upload className="w-8 h-8 text-white/80" />
                 </div>
                 <p className="text-xl font-medium text-white/80 text-center px-4">Click or drag to upload a PDF file</p>
               </div>
            )}

            {pdfFile && (
              <div className="w-full bg-white/95 backdrop-blur-2xl border border-white/30 rounded-3xl overflow-hidden flex justify-center py-8 flex-col items-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => { setErrorMsg(`Failed to load PDF: ${error.message}`); setUiState('ERROR'); setPdfFile(null); }}
                  loading={<div className="p-12 text-center text-gray-500 font-medium animate-pulse">Loading Document...</div>}
                  className="max-w-full overflow-x-auto flex justify-center w-full"
                >
                  <Page key={`page_${pageNumber}`} pageNumber={pageNumber} renderTextLayer={true} renderAnnotationLayer={true} className="shadow-2xl rounded-lg overflow-hidden" scale={pdfScale} />
                </Document>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTooltip && (
          <>
            <div className="fixed hidden sm:flex pointer-events-none z-40 items-start gap-3 transition-transform duration-[50ms]"
              style={uiState === 'IDLE' ? { 
                left: rects.length > 0 ? rects[rects.length - 1].left + (rects[rects.length - 1].width / 2) : mousePos.x, 
                top: Math.min(typeof window !== 'undefined' ? window.innerHeight - 80 : 1000, rects.length > 0 ? rects[rects.length - 1].top + rects[rects.length - 1].height : mousePos.y), 
                transform: `translate(-50%, 16px)`
              } : {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                maxHeight: 'calc(100vh - 40px)'
              }}
            >
              {uiState === 'IDLE' && (
                <motion.button 
                  onPointerDown={(e) => { e.preventDefault(); handleGenerate(); }}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="pointer-events-auto bg-gray-900 hover:bg-gray-800 backdrop-blur-xl border border-white/20 text-white px-5 py-2.5 rounded-full font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  Peek Meaning
                </motion.button>
              )}
              {uiState === 'GENERATING' && (
                <>
                  <PixelArtLoader />
                  <motion.div drag dragMomentum={false} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="overflow-hidden pointer-events-auto flex flex-col w-[320px] bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 shrink-0"></div>
                    <div className="pb-5 shrink-0 flex flex-col gap-3">
                      <div className="h-4 bg-white/20 rounded-xl w-full animate-pulse flex-shrink-0"></div>
                      <div className="h-4 bg-white/20 rounded-xl w-10/12 animate-pulse flex-shrink-0"></div>
                    </div>
                  </motion.div>
                </>
              )}
              {uiState === 'DONE' && (
                <motion.div drag dragMomentum={false} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="overflow-hidden pointer-events-auto flex flex-col w-[340px] bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-[0_16px_40px_rgba(0,0,0,0.4)] relative cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2 shrink-0"></div>
                  <button onPointerDownCapture={e => e.stopPropagation()} onClick={() => { setUiState('IDLE'); setSelectionText(''); window.getSelection()?.removeAllRanges(); }} className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors z-50 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                  {explanation && (
                    <div onPointerDownCapture={e => e.stopPropagation()} className="pb-5 shrink-0 overflow-y-auto max-h-[50vh] scrollbar-hide cursor-text">
                      <div className="text-sm text-white leading-relaxed font-medium drop-shadow-md [&>p]:mb-3 [&>h1]:text-lg [&>h1]:font-bold [&>h2]:text-base [&>h2]:font-bold [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>strong]:text-yellow-200">
                        <ReactMarkdown>{explanation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {imageUrl ? (
                    <div className="w-full h-48 sm:h-56 shrink-0 bg-black/20 flex items-center justify-center overflow-hidden rounded-2xl border border-white/10">
                      <img src={imageUrl} alt="Context" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    isImageLoading ? (
                       <div className="w-full h-48 sm:h-56 shrink-0 bg-white/10 flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 animate-pulse">
                         <span className="text-white/50 text-sm font-medium">Generating Image...</span>
                       </div>
                    ) : imageErrorMsg ? (
                       <div className="w-full p-4 shrink-0 bg-red-900/30 flex items-center justify-center rounded-2xl border border-red-500/30">
                         <span className="text-red-200 text-xs font-medium text-center">{imageErrorMsg}</span>
                       </div>
                    ) : null
                  )}
                  
                  <button 
                    onPointerDownCapture={e => e.stopPropagation()}
                    onClick={(e) => handleGenerate(e, true)}
                    className="mt-3 w-full pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    Deep Dive "{selectionText.slice(0, 15)}{selectionText.length > 15 ? '...' : ''}"
                  </button>
                </motion.div>
              )}
              {uiState === 'ERROR' && (
                <motion.div drag dragMomentum={false} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="overflow-hidden pointer-events-auto flex flex-col w-[320px] bg-red-900/30 backdrop-blur-xl border border-red-500/50 rounded-3xl p-5 shadow-2xl relative cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2 shrink-0"></div>
                  <button onPointerDownCapture={e => e.stopPropagation()} onClick={() => { setUiState('IDLE'); setSelectionText(''); window.getSelection()?.removeAllRanges(); }} className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors z-50 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-sm text-red-200 font-medium mt-3">{errorMsg}</p>
                </motion.div>
              )}
            </div>
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 flex sm:hidden flex-col bg-black/60 backdrop-blur-3xl border-t border-white/20 rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] pointer-events-auto text-white"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>
              {(uiState === 'DONE' || uiState === 'ERROR') && (
                  <button onClick={() => { setUiState('IDLE'); setSelectionText(''); window.getSelection()?.removeAllRanges(); }} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors z-50">
                    <X className="w-5 h-5" />
                  </button>
              )}
              
              {uiState === 'IDLE' && (
                <button 
                  onPointerDown={(e) => { e.preventDefault(); handleGenerate(); }}
                  className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg"
                >
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  Peek Meaning for "{selectionText.slice(0, 15)}{selectionText.length > 15 ? '...' : ''}"
                </button>
              )}

              {uiState === 'GENERATING' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="h-4 bg-white/20 rounded-xl w-full animate-pulse"></div>
                    <div className="h-4 bg-white/20 rounded-xl w-10/12 animate-pulse"></div>
                  </div>
                </div>
              )}
              {uiState === 'DONE' && (
                <div className="flex flex-col gap-4">
                  {explanation && (
                    <div className="text-base text-white/90 leading-relaxed font-medium mb-2 overflow-y-auto max-h-[50vh] scrollbar-hide [&>p]:mb-3 [&>h1]:text-lg [&>h1]:font-bold [&>h2]:text-base [&>h2]:font-bold [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>strong]:text-yellow-200">
                      <ReactMarkdown>{explanation}</ReactMarkdown>
                    </div>
                  )}
                  {imageUrl ? (
                    <div className="w-full h-48 bg-black/20 flex items-center justify-center overflow-hidden rounded-2xl border border-white/10">
                      <img src={imageUrl} alt="Context" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    isImageLoading ? (
                      <div className="w-full h-48 bg-white/10 flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 animate-pulse">
                         <span className="text-white/50 text-sm font-medium">Generating Image...</span>
                      </div>
                    ) : imageErrorMsg ? (
                       <div className="w-full p-4 bg-red-900/30 flex items-center justify-center rounded-2xl border border-red-500/30">
                         <span className="text-red-200 text-xs font-medium text-center">{imageErrorMsg}</span>
                       </div>
                    ) : null
                  )}
                  
                  <button 
                    onClick={(e) => handleGenerate(e, true)}
                    className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg"
                  >
                    <Search className="w-5 h-5" />
                    Deep Dive "{selectionText.slice(0, 15)}{selectionText.length > 15 ? '...' : ''}"
                  </button>
                </div>
              )}
              {uiState === 'ERROR' && (
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-red-900/30 border border-red-500/30">
                  <p className="text-base text-red-200 font-medium">{errorMsg || 'An error occurred'}</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-black/80 backdrop-blur-3xl border-l border-white/20 p-6 z-50 overflow-y-auto shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5"/> Vocabulary</h2>
                <button onClick={() => setShowHistory(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <button 
                onClick={exportVocabToCSV}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl border border-white/20 transition-colors mb-6 flex items-center justify-center gap-2"
              >
                Export to CSV
              </button>
              
              <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                {vocabHistory.length === 0 ? (
                  <p className="text-white/50 text-center mt-10">No words saved yet.</p>
                ) : (
                  vocabHistory.map((item, idx) => (
                    <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <h3 className="font-bold text-fuchsia-300 mb-1">{item.word}</h3>
                      <p className="text-sm text-white/80 line-clamp-3">{item.def}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
