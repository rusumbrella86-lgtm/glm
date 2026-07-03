import { CHALLENGES } from '../game/challenges';
import { ProgressData } from '../game/storage';

interface Props {
  onSelect: (id: string) => void;
  progress: ProgressData;
}

export default function ChallengeList({ onSelect, progress }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {CHALLENGES.map((c) => {
        const done = progress.completed[c.id];
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className="group relative flex flex-col items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/60 hover:bg-slate-900"
          >
            {done && (
              <span className="absolute right-3 top-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                ✓ {(done.bestTimeMs / 1000).toFixed(1)}s
              </span>
            )}
            <span className="text-3xl">{c.icon}</span>
            <h3 className="text-sm font-bold text-slate-100">{c.title}</h3>
            <p className="text-xs leading-relaxed text-slate-400">{c.description}</p>
            <div className="mt-auto flex w-full items-center justify-between pt-2 text-[11px] text-slate-500">
              <span>⏱ {(c.timeLimitMs / 1000).toFixed(0)}s limit</span>
              <span className="font-semibold text-cyan-300">+{c.points} pts</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
