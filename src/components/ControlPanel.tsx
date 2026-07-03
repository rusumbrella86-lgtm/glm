interface Props {
  brushSize: number;
  setBrushSize: (n: number) => void;
  speed: number;
  setSpeed: (n: number) => void;
  paused: boolean;
  setPaused: (b: boolean) => void;
  onClear: () => void;
  onChaos: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  canLoad: boolean;
  particleCount: number;
  fps: number;
}

export default function ControlPanel({
  brushSize,
  setBrushSize,
  speed,
  setSpeed,
  paused,
  setPaused,
  onClear,
  onChaos,
  onSave,
  onLoad,
  onExport,
  canLoad,
  particleCount,
  fps,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            paused ? 'bg-emerald-500 text-slate-900 hover:bg-emerald-400' : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
          }`}
        >
          {paused ? '▶ Play' : '⏸ Pause'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg bg-rose-600/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
        >
          🗑 Clear
        </button>
      </div>

      <button
        type="button"
        onClick={onChaos}
        className="w-full rounded-lg bg-fuchsia-600/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
      >
        🎲 Chaos Burst
      </button>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onSave} className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
          💾 Save
        </button>
        <button
          type="button"
          onClick={onLoad}
          disabled={!canLoad}
          className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          📂 Load
        </button>
        <button type="button" onClick={onExport} className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
          🖼 PNG
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
          <span>Brush Size</span>
          <span className="text-cyan-300">{brushSize}</span>
        </div>
        <input
          type="range"
          min={1}
          max={18}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
          <span>Sim Speed</span>
          <span className="text-cyan-300">{speed}x</span>
        </div>
        <input
          type="range"
          min={1}
          max={4}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-300">
        <span>Particles: <span className="font-mono text-cyan-300">{particleCount}</span></span>
        <span>FPS: <span className="font-mono text-cyan-300">{fps}</span></span>
      </div>
    </div>
  );
}
