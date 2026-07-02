import { useEffect } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'info' | 'warning';
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

const toneClasses: Record<ToastMessage['tone'], string> = {
  success: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200',
  info: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200',
  warning: 'border-rose-500/50 bg-rose-500/15 text-rose-200',
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);
  return (
    <div className={`pointer-events-auto animate-[fadeIn_0.2s_ease-out] rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur ${toneClasses[toast.tone]}`}>
      {toast.text}
    </div>
  );
}

export default function Toast({ toasts, onDismiss }: Props) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
