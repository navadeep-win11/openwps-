import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Plus, Trash2, Play, Type, Image as ImageIcon, Copy } from 'lucide-react';

interface Element {
  id: string;
  type: 'text' | 'image';
  content: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Slide {
  id: string;
  elements: Element[];
  background: string;
}

export default function Presentation() {
  const [slides, setSlides] = useState<Slide[]>([
    {
      id: 'slide-1',
      background: '#ffffff',
      elements: [
        { id: 'el-1', type: 'text', content: 'Double click to edit title', x: 200, y: 150, w: 400, h: 80 }
      ]
    }
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const presentationRef = useRef<HTMLDivElement>(null);

  const activeSlide = slides[currentSlideIndex];

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, slides.length]);

  const addSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      background: '#ffffff',
      elements: [{ id: `el-${Date.now()}`, type: 'text', content: 'New Slide', x: 200, y: 150, w: 400, h: 80 }]
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  const addElement = (type: 'text' | 'image') => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex].elements.push({
      id: `el-${Date.now()}`,
      type,
      content: type === 'text' ? 'New Text Box' : 'Image URL...',
      x: 50, y: 50, w: 200, h: type === 'text' ? 50 : 200
    });
    setSlides(newSlides);
  };

  const updateElement = (elId: string, updates: Partial<Element>) => {
    const newSlides = [...slides];
    const elIndex = newSlides[currentSlideIndex].elements.findIndex(e => e.id === elId);
    if (elIndex > -1) {
      newSlides[currentSlideIndex].elements[elIndex] = { ...newSlides[currentSlideIndex].elements[elIndex], ...updates };
      setSlides(newSlides);
    }
  };

  const removeElement = (elId: string) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex].elements = newSlides[currentSlideIndex].elements.filter(e => e.id !== elId);
    setSlides(newSlides);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      presentationRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (isFullscreen) {
    return (
      <div ref={presentationRef} className="w-screen h-screen bg-black flex items-center justify-center relative cursor-none select-none">
        <div className="w-full max-w-7xl aspect-video relative overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95" style={{ backgroundColor: activeSlide.background }}>
          {activeSlide.elements.map(el => (
             <div key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h }} className="flex items-center">
                {el.type === 'text' ? (
                  <p className="text-4xl text-black font-semibold break-words w-full" dangerouslySetInnerHTML={{ __html: el.content }} />
                ) : (
                  <img src={el.content} alt="" className="w-full h-full object-cover rounded-lg" />
                )}
             </div>
          ))}
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
          <button onClick={() => setCurrentSlideIndex(p => Math.max(0, p - 1))} className="p-2 bg-white/20 rounded text-white">Prev</button>
          <button onClick={toggleFullscreen} className="p-2 bg-white/20 rounded text-white">Exit</button>
          <button onClick={() => setCurrentSlideIndex(p => Math.min(slides.length - 1, p + 1))} className="p-2 bg-white/20 rounded text-white">Next</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex h-[80vh] bg-black/20 rounded-3xl overflow-hidden border border-white/20 shadow-inner text-white">
      {/* Sidebar */}
      <div className="w-48 sm:w-64 border-r border-white/10 bg-black/40 flex flex-col">
        <div className="p-3 border-b border-white/10 flex justify-between items-center">
          <span className="font-semibold text-sm">Slides</span>
          <button onClick={addSlide} className="p-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {slides.map((slide, idx) => (
            <div 
              key={slide.id} 
              onClick={() => setCurrentSlideIndex(idx)}
              className={`w-full aspect-video rounded-lg cursor-pointer border-2 transition-all relative group
                ${idx === currentSlideIndex ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'border-white/10 hover:border-white/30'}
              `}
              style={{ backgroundColor: slide.background }}
            >
              <div className="absolute top-1 left-2 text-xs font-bold text-gray-500 drop-shadow-md">{idx + 1}</div>
              {slides.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }} className="absolute top-1 right-1 p-1 bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col relative bg-gray-900/50">
        {/* Toolbar */}
        <div className="h-14 border-b border-white/10 flex items-center px-4 gap-2 bg-black/40">
          <button onClick={() => addElement('text')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
            <Type className="w-4 h-4" /> Text Box
          </button>
          <button onClick={() => addElement('image')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
            <ImageIcon className="w-4 h-4" /> Image
          </button>
          <div className="flex-1" />
          <button onClick={toggleFullscreen} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-bold shadow-lg transition-colors">
            <Play className="w-4 h-4" /> Slideshow
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative">
          <div 
            className="w-full max-w-4xl aspect-video relative shadow-2xl overflow-hidden rounded-md transition-colors"
            style={{ backgroundColor: activeSlide.background }}
          >
            {activeSlide.elements.map(el => (
              <Rnd
                key={el.id}
                size={{ width: el.w, height: el.h }}
                position={{ x: el.x, y: el.y }}
                onDragStop={(e, d) => updateElement(el.id, { x: d.x, y: d.y })}
                onResizeStop={(e, direction, ref, delta, position) => {
                  updateElement(el.id, {
                    w: parseInt(ref.style.width),
                    h: parseInt(ref.style.height),
                    ...position
                  });
                }}
                bounds="parent"
                className="group border border-transparent hover:border-indigo-500/50 focus-within:border-indigo-500"
              >
                <div className="w-full h-full relative group">
                  <button onClick={() => removeElement(el.id)} className="absolute -top-3 -right-3 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 z-10 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                  {el.type === 'text' ? (
                    <div 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => updateElement(el.id, { content: e.currentTarget.innerHTML })}
                      className="w-full h-full text-black text-2xl font-semibold outline-none cursor-text p-2"
                      dangerouslySetInnerHTML={{ __html: el.content }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-500 relative overflow-hidden">
                       <img src={el.content !== 'Image URL...' ? el.content : 'https://placehold.co/600x400/png?text=Placeholder'} className="absolute inset-0 w-full h-full object-cover" />
                       <input 
                         type="text" 
                         className="absolute bottom-2 left-2 right-2 p-1 text-xs text-black bg-white/80 rounded" 
                         placeholder="Paste Image URL"
                         defaultValue={el.content}
                         onBlur={(e) => updateElement(el.id, { content: e.target.value })}
                       />
                    </div>
                  )}
                </div>
              </Rnd>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
