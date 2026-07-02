import { useEffect, useRef, useState, useCallback } from 'react';
import { Sandbox } from './simulation/engine';
import { ERASER, PALETTE, getElement } from './simulation/elements';
import SimulationCanvas, { SimulationCanvasHandle } from './components/SimulationCanvas';
import ElementPalette from './components/ElementPalette';
import ControlPanel from './components/ControlPanel';
import ChallengeHUD, { ChallengeStatus } from './components/ChallengeHUD';
import ChallengeList from './components/ChallengeList';
import Toast, { ToastMessage } from './components/Toast';
import { CHALLENGES } from './game/challenges';
import { hasSavedScene, loadProgress, loadScene, ProgressData, recordCompletion, saveScene } from './game/storage';

function createEngine() {
  const engine = new Sandbox();
  engine.resetScene();
  return engine;
}

type Mode = 'sandbox' | 'challenge-select' | 'challenge';

export default function App() {
  const engineRef = useRef<Sandbox | null>(null);
  if (!engineRef.current) engineRef.current = createEngine();
  const engine = engineRef.current;
  const canvasHandleRef = useRef<SimulationCanvasHandle>(null);

  const [selectedElement, setSelectedElement] = useState<number>(PALETTE[0].id);
  const [brushSize, setBrushSize] = useState(4);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [particleCount, setParticleCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [mode, setMode] = useState<Mode>('sandbox');
  const [progress, setProgress] = useState<ProgressData>(() => loadProgress());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>('idle');
  const [challengeStartedAt, setChallengeStartedAt] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const initialStatsRef = useRef<Record<string, number>>({});

  const pushToast = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), text, tone }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleStats = (count: number, currentFps: number) => {
    setParticleCount(count);
    setFps(currentFps);
  };

  const adjustBrush = (delta: number) => {
    setBrushSize((b) => Math.min(18, Math.max(1, b + delta)));
  };

  const handleClear = () => {
    engine.resetScene();
  };

  const handleChaos = () => {
    engine.randomBurst();
  };

  const handleSave = () => {
    const ok = saveScene(engine.grid, engine.life, engine.variation, engine.aux, engine.width, engine.height);
    pushToast(ok ? '💾 Scene saved locally.' : 'Could not save scene.', ok ? 'success' : 'warning');
  };

  const handleLoad = () => {
    const data = loadScene();
    if (!data || data.width !== engine.width || data.height !== engine.height) {
      pushToast('No compatible saved scene found.', 'warning');
      return;
    }
    engine.grid.set(data.grid);
    engine.life.set(data.life);
    engine.variation.set(data.variation);
    engine.aux.set(data.aux);
    pushToast('📂 Scene loaded.', 'success');
  };

  const handleExport = () => {
    canvasHandleRef.current?.exportPng();
    pushToast('🖼 Snapshot downloaded.', 'success');
  };

  const activeChallenge = CHALLENGES.find((c) => c.id === activeChallengeId) ?? null;

  const startChallenge = (id: string) => {
    const challenge = CHALLENGES.find((c) => c.id === id);
    if (!challenge) return;
    engine.resetScene();
    challenge.setup(engine);
    initialStatsRef.current = challenge.captureInitial(engine);
    setActiveChallengeId(id);
    setChallengeStatus('running');
    setChallengeStartedAt(performance.now());
    setRemainingMs(challenge.timeLimitMs);
    setChallengeProgress(0);
    setPaused(false);
    setMode('challenge');
  };

  const retryChallenge = () => {
    if (activeChallengeId) startChallenge(activeChallengeId);
  };

  const backToChallengeSelect = () => {
    setActiveChallengeId(null);
    setChallengeStatus('idle');
    setMode('challenge-select');
    engine.resetScene();
  };

  const goSandbox = () => {
    setMode('sandbox');
    setActiveChallengeId(null);
    setChallengeStatus('idle');
    engine.resetScene();
  };

// Challenge win/fail polling loop (runs alongside the sim's own RAF loop).
  // Elapsed time only accrues while the simulation is unpaused, so pausing
  // to plan a move doesn't burn the countdown.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (mode !== 'challenge' || !activeChallenge || challengeStatus !== 'running') return;
    elapsedRef.current = 0;
    let raf = 0;
    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;
      if (!pausedRef.current) elapsedRef.current += dt;
      const elapsed = elapsedRef.current;
      const remaining = Math.max(0, activeChallenge.timeLimitMs - elapsed);
      setRemainingMs(remaining);
      setChallengeProgress(activeChallenge.progress(engine, elapsed, initialStatsRef.current));

      if (activeChallenge.checkWin(engine, elapsed, initialStatsRef.current)) {
        setChallengeStatus('won');
        const { isNew, improved, data } = recordCompletion(activeChallenge.id, elapsed, activeChallenge.points);
        setProgress(data);
        if (isNew) pushToast(`🏆 Achievement unlocked: ${activeChallenge.title}! +${activeChallenge.points} pts`, 'success');
        else if (improved) pushToast(`⏱ New best time on ${activeChallenge.title}!`, 'success');
        else pushToast(`✅ ${activeChallenge.title} complete again!`, 'success');
        return;
      }
      if (activeChallenge.checkFail?.(engine, elapsed, initialStatsRef.current)) {
        setChallengeStatus('lost');
        pushToast(`💥 ${activeChallenge.title} failed.`, 'warning');
        return;
      }
      if (remaining <= 0) {
        setChallengeStatus('lost');
        pushToast(`⏰ Time's up on ${activeChallenge.title}.`, 'warning');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, activeChallenge, challengeStatus, challengeStartedAt, engine, pushToast]);

  useEffect(() => {
    const shortcuts = [ERASER, ...PALETTE];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (e.key.toLowerCase() === 'c' && mode === 'sandbox') {
        handleClear();
        return;
      }
      const num = Number(e.key);
      if (!Number.isNaN(num) && shortcuts[num]) {
        setSelectedElement(shortcuts[num].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const selectedDef = getElement(selectedElement);
  const isChallengeMode = mode === 'challenge';

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0f172a_0%,_#020308_60%)] text-slate-100">
      <Toast toasts={toasts} onDismiss={dismissToast} />
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 border-b border-slate-800/60 px-4 py-2 text-xs font-semibold sm:px-6">
          <a
            href="/"
            className="rounded-full border border-slate-700/70 px-3 py-1.5 text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
          >
            Lounge
          </a>
          <span className="rounded-full border border-cyan-400/60 bg-cyan-400/15 px-3 py-1.5 text-cyan-200">
            Powder-Toy
          </span>
        </nav>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-xl shadow-lg shadow-cyan-500/20">
              🧪
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">Powder Sandbox</h1>
              <p className="text-xs text-slate-400">A falling-sand physics playground &amp; challenge game with {PALETTE.length} elements</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-slate-700/70 bg-slate-800/50 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={goSandbox}
                className={`rounded-full px-3 py-1.5 transition ${mode === 'sandbox' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              >
                🧫 Sandbox
              </button>
              <button
                type="button"
                onClick={() => setMode('challenge-select')}
                className={`rounded-full px-3 py-1.5 transition ${mode !== 'sandbox' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              >
                🎯 Challenges
              </button>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 sm:flex">
              ⭐ {progress.totalScore} pts
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
        {mode === 'challenge-select' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Choose a Challenge</h2>
                <p className="text-sm text-slate-400">Complete objectives against the clock to earn points and achievements.</p>
              </div>
              <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
                ⭐ Total score: {progress.totalScore}
              </div>
            </div>
            <ChallengeList onSelect={startChallenge} progress={progress} />
          </div>
        )}

        {mode !== 'challenge-select' && (
          <div className="flex flex-col gap-4 lg:flex-row">
            <aside className="order-2 flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-900/50 p-4 lg:order-1 lg:w-72 lg:shrink-0">
              {isChallengeMode && activeChallenge ? (
                <ChallengeHUD
                  challenge={activeChallenge}
                  status={challengeStatus}
                  remainingMs={remainingMs}
                  progress={challengeProgress}
                  bestTimeMs={progress.completed[activeChallenge.id]?.bestTimeMs}
                  onStart={() => startChallenge(activeChallenge.id)}
                  onRetry={retryChallenge}
                  onBack={backToChallengeSelect}
                />
              ) : null}

              <ElementPalette selectedElement={selectedElement} onSelect={setSelectedElement} />
              <div className="h-px bg-slate-800" />
              <ControlPanel
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                speed={speed}
                setSpeed={setSpeed}
                paused={paused}
                setPaused={setPaused}
                onClear={handleClear}
                onChaos={handleChaos}
                onSave={handleSave}
                onLoad={handleLoad}
                onExport={handleExport}
                canLoad={hasSavedScene()}
                particleCount={particleCount}
                fps={fps}
              />
            </aside>

            <section className="order-1 flex-1 lg:order-2">
              <div className="relative">
                <SimulationCanvas
                  ref={canvasHandleRef}
                  engine={engine}
                  selectedElement={selectedElement}
                  brushSize={brushSize}
                  paused={paused || (isChallengeMode && challengeStatus !== 'running')}
                  speed={speed}
                  onStats={handleStats}
                  onAdjustBrush={adjustBrush}
                />
                {isChallengeMode && (challengeStatus === 'won' || challengeStatus === 'lost') && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/50 backdrop-blur-[1px]">
                    <div
                      className={`rounded-2xl border px-8 py-6 text-center shadow-2xl ${
                        challengeStatus === 'won' ? 'border-emerald-400/60 bg-emerald-950/80' : 'border-rose-400/60 bg-rose-950/80'
                      }`}
                    >
                      <p className="text-3xl font-black">{challengeStatus === 'won' ? '🏆 Success!' : '💥 Failed'}</p>
                      <p className="mt-1 text-sm text-slate-300">{activeChallenge?.title}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-xs text-slate-400">
                <span>🖱️ Click &amp; drag to draw</span>
                <span>🖲️ Scroll to resize brush</span>
                <span>⌨️ 0-9 select elements</span>
                <span>⎵ Space to pause</span>
                {!isChallengeMode && <span>C to clear</span>}
                <span className="ml-auto flex items-center gap-1 text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: `rgb(${selectedDef.color.join(',')})` }} />
                  {selectedDef.icon} {selectedDef.name}
                </span>
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-center text-xs text-slate-600 sm:px-6">
        Experiment freely in Sandbox mode, or test your skills in Challenges — mix water, lava, acid, fire, circuits and explosives to discover emergent reactions.
      </footer>
    </div>
  );
}