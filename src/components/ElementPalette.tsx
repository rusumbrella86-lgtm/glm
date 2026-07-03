import { useMemo, useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_ORDER, ERASER, PALETTE } from '../simulation/elements';

interface Props {
  selectedElement: number;
  onSelect: (id: number) => void;
}

function swatch(color: [number, number, number]) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

export default function ElementPalette({ selectedElement, onSelect }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PALETTE.filter((e) => {
      if (filter !== 'all' && e.category !== filter) return false;
      if (q) {
        const symbol = (e.family ?? '').toLowerCase();
        if (!e.name.toLowerCase().includes(q) && !symbol.includes(q)) return false;
      }
      return true;
    });
  }, [filter, search]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Elements</h2>
        <span className="text-[10px] text-slate-500">{PALETTE.length} total</span>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name or symbol…"
        className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
      />
      <div className="mb-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
            filter === 'all' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
              filter === cat ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
      <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 md:grid-cols-4">
        <button
          type="button"
          title={`${ERASER.name} — ${ERASER.description}`}
          onClick={() => onSelect(ERASER.id)}
          className={`group relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
            selectedElement === ERASER.id
              ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.4)]'
              : 'border-slate-700/70 bg-slate-800/40 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
          }`}
        >
          <span className="h-5 w-5 rounded-full border border-black/30" style={{ background: 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%)' }} />
          <span className="leading-tight">{ERASER.icon}</span>
          <span className="truncate leading-tight">{ERASER.name}</span>
        </button>
        {filtered.map((el) => {
          const active = el.id === selectedElement;
          const isSymbol = el.icon.length <= 3;
          return (
            <button
              key={el.id}
              type="button"
              title={`${el.name} — ${el.description}`}
              onClick={() => onSelect(el.id)}
              className={`group relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                active
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.4)]'
                  : 'border-slate-700/70 bg-slate-800/40 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <span className="h-5 w-5 rounded-full border border-black/30" style={{ background: swatch(el.color) }} />
              <span className="leading-tight">{isSymbol ? <span className="font-mono text-[12px] font-bold">{el.icon}</span> : el.icon}</span>
              <span className="truncate leading-tight">{el.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
