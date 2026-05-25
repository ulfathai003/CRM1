import React, { useRef, useState, useEffect } from 'react';
import { Trash2, CheckCircle, RefreshCw, PenTool } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  signature: string | null;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export function SignaturePad({ label, signature, onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [inkColor, setInkColor] = useState<string>('#1D3557'); // Bauhaus dark blue/traditional ink
  const [lineWidth, setLineWidth] = useState<number>(3);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set initial canvas styling
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
  }, [inkColor, lineWidth]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates in case of display density scaling with CSS
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Prevent scrolling while drawing on signature pad
      if (e.cancelable) {
        e.preventDefault();
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCoordinates(e);
    if (!coords) return;
    setIsDrawing(true);
    lastPosRef.current = coords;
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    if (!coords || !lastPosRef.current) return;

    ctx.beginPath();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPosRef.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const saveToState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if canvas is empty before saving
    if (isCanvasBlank(canvas)) {
      alert("Canvas is empty. Please draw your signature before saving.");
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const isCanvasBlank = (el: HTMLCanvasElement) => {
    const context = el.getContext('2d');
    if (!context) return true;
    const buffer = new Uint32Array(
      context.getImageData(0, 0, el.width, el.height).data.buffer
    );
    return !buffer.some(color => color !== 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  return (
    <div className="border-2 border-black rounded-[16px] bg-[#FAF9F5] p-3 flex flex-col gap-2 shadow-[2px_2px_0_0_#000]">
      <div className="flex justify-between items-center">
        <span className="text-xs heavy-text font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
          <PenTool size={13} className="text-[#E63946]" /> {label}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Color Pickers */}
          <button
            type="button"
            onClick={() => setInkColor('#1D3557')}
            className={`w-4 h-4 rounded-full border border-black cursor-pointer transition-transform ${inkColor === '#1D3557' ? 'scale-125 ring-2 ring-[#FFB703]' : ''}`}
            style={{ backgroundColor: '#1D3557' }}
            title="Traditional Blue Ink"
          />
          <button
            type="button"
            onClick={() => setInkColor('#000000')}
            className={`w-4 h-4 rounded-full border border-black cursor-pointer transition-transform ${inkColor === '#000000' ? 'scale-125 ring-2 ring-[#FFB703]' : ''}`}
            style={{ backgroundColor: '#000000' }}
            title="Classic Black Ink"
          />
          
          {/* Brush thickness slider */}
          <input
            type="range"
            min="1.5"
            max="6"
            step="0.5"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseFloat(e.target.value))}
            className="w-12 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            title="Brush Thickness"
          />
        </div>
      </div>

      {signature ? (
        <div className="relative border-2 border-dashed border-black rounded-[12px] h-[90px] bg-white flex items-center justify-center overflow-hidden">
          <img
            src={signature}
            alt={`${label} saved signature`}
            className="max-h-[80px] max-w-full object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-1 right-2 bg-green-100 text-[#065F46] border border-[#10B981] px-1.5 py-0.5 rounded-[4px] text-[8px] heavy-text uppercase tracking-widest font-bold">
            Saved
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="absolute bottom-1 right-1 p-1 bg-red-100 hover:bg-red-200 border border-black rounded-full text-red-600 transition-colors cursor-pointer"
            title="Clear signature"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="relative border-2 border-black rounded-[12px] overflow-hidden bg-white h-[90px]">
            {/* Bauhaus graph paper mesh background helper */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                backgroundSize: '10px 10px'
              }}
            />
            
            <canvas
              ref={canvasRef}
              width={380}
              height={90}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full block cursor-crosshair relative z-10 touch-none"
            />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[10px] uppercase text-gray-300 font-bold tracking-widest bg-transparent z-0">
              Sign Here
            </div>

            <div className="absolute bottom-1 left-2 pointer-events-none z-20 text-[8px] text-gray-400 font-mono">
              Line: {lineWidth}px | Color: {inkColor === '#000000' ? 'Black' : 'Blue'}
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="absolute bottom-1 right-1 z-20 p-1 bg-gray-100 hover:bg-gray-200 border border-black rounded-full text-gray-600 cursor-pointer transition-all"
              title="Clear canvas"
            >
              <RefreshCw size={11} className="hover:rotate-180 duration-300" />
            </button>
          </div>

          <button
            type="button"
            onClick={saveToState}
            className="w-full py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-[10px] heavy-text uppercase tracking-wider rounded-[8px] border-2 border-black shadow-[2px_2px_0_0_#000] cursor-pointer active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 font-bold"
            title="Saves dynamic pen strokes into the document"
          >
            <CheckCircle size={12} strokeWidth={2.5} /> Confirm & Save Drawing
          </button>
        </div>
      )}
    </div>
  );
}
