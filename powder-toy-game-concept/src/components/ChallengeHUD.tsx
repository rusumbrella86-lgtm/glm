import { Challenge } from '../game/challenges';

export type ChallengeStatus = 'idle' | 'running' | 'won' | 'lost';

interface Props {
  challenge: Challenge;
  status: ChallengeStatus;
  remainingMs: number;
  progress: number;
  bestTimeMs?: number;
  onStart: () => void;
  onRetry: () => void;
  onBack: () => void;
}

function formatTime(ms: number) {
  const s = Math.max(0, ms / 1000);
  return `${s.toFixed(1)}s`;
}

export default function ChallengeHUD({ challenge, status, remainingMs, progress, bestTimeMs, onStart, onRetry, onBack }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{challenge.icon}</span>
          <div>
            <h3 className="text-base font-bold text-slate-100">{challenge.title}</h3>
            <p className="text-xs text-slate-400">{challenge.goalLabel}</p>
          </div>
        </div>
        <button type="button" onClick={onBack} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">
          ← Back
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">{challenge.description}</p>

      {status !== 'idle' && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Progress</span>
            <span className="text-cyan-300">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {status === 'running' && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs">
          <span className="text-slate-300">Time left</span>
          <span className={`font-mono text-sm font-bold ${remainingMs < 8000 ? 'text-rose-400' : 'text-cyan-300'}`}>
            {formatTime(remainingMs)}
          </span>
        </div>
      )}

      {status === 'won' && (
        <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-300">
          🏆 Challenge complete! +{challenge.points} pts
        </div>
      )}

      {status === 'lost' && (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-300">
          💥 Out of time — try again!
        </div>
      )}

      {bestTimeMs !== undefined && (
        <p className="mt-2 text-[11px] text-slate-500">Best time: <span className="font-mono text-slate-300">{formatTime(bestTimeMs)}</span></p>
      )}

      <div className="mt-3 flex gap-2">
        {status === 'idle' && (
          <button type="button" onClick={onStart} className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400">
            ▶ Start Challenge
          </button>
        )}
        {(status === 'won' || status === 'lost' || status === 'running') && (
          <button type="button" onClick={onRetry} className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400">
            ↻ {status === 'running' ? 'Restart' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}
