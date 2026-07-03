const PROGRESS_KEY = 'powder-sandbox-progress-v1';
const SAVE_KEY = 'powder-sandbox-scene-v1';

export interface ProgressData {
  completed: Record<string, { bestTimeMs: number; points: number }>;
  totalScore: number;
}

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { completed: {}, totalScore: 0 };
    const parsed = JSON.parse(raw);
    return { completed: parsed.completed ?? {}, totalScore: parsed.totalScore ?? 0 };
  } catch {
    return { completed: {}, totalScore: 0 };
  }
}

export function saveProgress(data: ProgressData) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function recordCompletion(id: string, timeMs: number, points: number): { isNew: boolean; improved: boolean; data: ProgressData } {
  const data = loadProgress();
  const prev = data.completed[id];
  const isNew = !prev;
  const improved = !!prev && timeMs < prev.bestTimeMs;
  if (isNew || improved) {
    if (isNew) data.totalScore += points;
    data.completed[id] = { bestTimeMs: Math.min(timeMs, prev?.bestTimeMs ?? Infinity), points };
  }
  saveProgress(data);
  return { isNew, improved, data };
}

interface SerializedScene {
  width: number;
  height: number;
  grid: string;
  life: string;
  variation: string;
  aux: string;
}

function toBase64(arr: Uint8Array | Uint16Array | Int8Array): string {
  const bytes = new Uint8Array(arr.buffer.slice(0));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function saveScene(grid: Uint8Array, life: Uint16Array, variation: Int8Array, aux: Uint8Array, width: number, height: number) {
  const payload: SerializedScene = {
    width,
    height,
    grid: toBase64(grid),
    life: toBase64(new Uint8Array(life.buffer.slice(0))),
    variation: toBase64(new Uint8Array(variation.buffer.slice(0))),
    aux: toBase64(aux),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadScene(): { grid: Uint8Array; life: Uint16Array; variation: Int8Array; aux: Uint8Array; width: number; height: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const payload: SerializedScene = JSON.parse(raw);
    const grid = fromBase64(payload.grid);
    const lifeBytes = fromBase64(payload.life);
    const variationBytes = fromBase64(payload.variation);
    const aux = fromBase64(payload.aux);
    const life = new Uint16Array(lifeBytes.buffer);
    const variation = new Int8Array(variationBytes.buffer);
    return { grid, life, variation, aux, width: payload.width, height: payload.height };
  } catch {
    return null;
  }
}

export function hasSavedScene(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
