import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Sandbox } from '../simulation/engine';

interface Props {
  engine: Sandbox;
  selectedElement: number;
  brushSize: number;
  paused: boolean;
  speed: number;
  onStats: (particleCount: number, fps: number) => void;
  onAdjustBrush: (delta: number) => void;
}

export interface SimulationCanvasHandle {
  exportPng: () => void;
}

const SimulationCanvas = forwardRef<SimulationCanvasHandle, Props>(function SimulationCanvas(
  { engine, selectedElement, brushSize, paused, speed, onStats, onAdjustBrush }: Props,
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const stateRef = useRef({ selectedElement, brushSize, paused, speed });
  const pointerRef = useRef({ down: false, x: 0, y: 0 });

  useEffect(() => {
    stateRef.current = { selectedElement, brushSize, paused, speed };
  }, [selectedElement, brushSize, paused, speed]);

  useImperativeHandle(ref, () => ({
    exportPng: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `powder-sandbox-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    canvas.width = engine.width;
    canvas.height = engine.height;
    imageDataRef.current = ctx.createImageData(engine.width, engine.height);

    let raf = 0;
    let lastTime = performance.now();
    let frameAccum = 0;
    let timeAccum = 0;

    const loop = (t: number) => {
      const dt = t - lastTime;
      lastTime = t;
      timeAccum += dt;
      frameAccum += 1;

      const st = stateRef.current;
      if (pointerRef.current.down) {
        engine.paint(pointerRef.current.x, pointerRef.current.y, st.brushSize, st.selectedElement);
      }
      if (!st.paused) {
        for (let s = 0; s < st.speed; s++) engine.step();
      }
      const id = imageDataRef.current;
      if (id) {
        engine.render(id);
        ctx.putImageData(id, 0, 0);
      }
      if (timeAccum >= 500) {
        const fps = Math.round((frameAccum * 1000) / timeAccum);
        frameAccum = 0;
        timeAccum = 0;
        onStats(engine.countParticles(), fps);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const toGrid = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * engine.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * engine.height);
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = toGrid(e.clientX, e.clientY);
    pointerRef.current = { down: true, x, y };
    engine.paint(x, y, stateRef.current.brushSize, stateRef.current.selectedElement);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = toGrid(e.clientX, e.clientY);
    if (pointerRef.current.down) {
      const st = stateRef.current;
      engine.paintStroke(pointerRef.current.x, pointerRef.current.y, x, y, st.brushSize, st.selectedElement);
    }
    pointerRef.current.x = x;
    pointerRef.current.y = y;
  };

  const handlePointerUp = () => {
    pointerRef.current.down = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    onAdjustBrush(e.deltaY < 0 ? 1 : -1);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      className="w-full touch-none rounded-lg border border-slate-700/80 shadow-[0_0_40px_-10px_rgba(56,189,248,0.25)] cursor-crosshair"
      style={{
        imageRendering: 'pixelated',
        aspectRatio: `${engine.width} / ${engine.height}`,
        background: '#08090f',
      }}
    />
  );
});

export default SimulationCanvas;
