import { Sandbox } from '../simulation/engine';
import { elementId as el } from '../simulation/elements';

const WOOD = el('wood');
const ICE = el('ice');
const TNT = el('tnt');
const WIRE = el('wire');
const STONE = el('stone');
const PLANT = el('plant');
const SAND = el('sand');
const FIRE = el('fire');
const GUNPOWDER = el('gunpowder');
const WALL = el('wall');
const METAL = el('metal');

export interface ChallengeStats {
  ice: number;
  fire: number;
  plant: number;
  stoneTarget: number;
  stoneRemaining: number;
  elapsedMs: number;
}

export interface Challenge {
  id: string;
  title: string;
  icon: string;
  description: string;
  goalLabel: string;
  timeLimitMs: number;
  points: number;
  setup: (engine: Sandbox) => void;
  checkWin: (engine: Sandbox, elapsedMs: number, initial: Record<string, number>) => boolean;
  checkFail?: (engine: Sandbox, elapsedMs: number, initial: Record<string, number>) => boolean;
  progress: (engine: Sandbox, elapsedMs: number, initial: Record<string, number>) => number;
  captureInitial: (engine: Sandbox) => Record<string, number>;
}

function ringWalls(engine: Sandbox) {
  engine.resetScene();
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'ice-breaker',
    title: 'Ice Breaker',
    icon: '🧊',
    description: 'A wall of ice blocks the chamber. Melt every last block using fire or lava before time runs out.',
    goalLabel: 'Melt all the ice',
    timeLimitMs: 45000,
    points: 100,
    setup: (engine) => {
      ringWalls(engine);
      const midY = Math.floor(engine.height / 2);
      engine.fillRect(40, midY - 14, 70, midY + 14, ICE);
      engine.fillRect(150, midY - 14, 180, midY + 14, ICE);
      engine.setCell(10, 10, WALL);
    },
    captureInitial: (engine) => ({ ice: engine.countElement(ICE) }),
    checkWin: (engine, _t, initial) => initial.ice > 0 && engine.countElement(ICE) === 0,
    progress: (engine, _t, initial) => {
      if (!initial.ice) return 0;
      return 1 - engine.countElement(ICE) / initial.ice;
    },
  },
  {
    id: 'extinguish',
    title: 'Extinguish the Blaze',
    icon: '🚒',
    description: 'A wooden structure is fully ablaze. Douse every flame with water before the fire spreads out of control.',
    goalLabel: 'Put out every fire',
    timeLimitMs: 40000,
    points: 120,
    setup: (engine) => {
      ringWalls(engine);
      const baseY = engine.height - 20;
      engine.fillRect(70, baseY - 40, 150, baseY, WOOD);
      for (let n = 0; n < 40; n++) {
        const x = 75 + Math.floor(Math.random() * 70);
        const y = baseY - 38 + Math.floor(Math.random() * 34);
        engine.setCell(x, y, FIRE);
      }
    },
    captureInitial: (engine) => ({ wood: engine.countElement(WOOD) }),
    checkWin: (engine, elapsedMs, initial) =>
      elapsedMs > 3000 && engine.countElement(FIRE) === 0 && engine.countElement(WOOD) >= initial.wood * 0.4,
    checkFail: (engine, elapsedMs, initial) =>
      elapsedMs > 3000 && engine.countElement(FIRE) === 0 && engine.countElement(WOOD) < initial.wood * 0.4,
    progress: (engine, _t, initial) => {
      const fire = engine.countElement(FIRE);
      const fireScore = fire === 0 ? 1 : Math.max(0, 1 - fire / 60);
      const woodScore = initial.wood ? Math.min(1, engine.countElement(WOOD) / (initial.wood * 0.4)) : 1;
      return Math.min(fireScore, woodScore) * 0.5 + fireScore * 0.5;
    },
  },
  {
    id: 'demolition',
    title: 'Demolition Derby',
    icon: '🧨',
    description: 'A thick stone wall guards the far side. Use gunpowder and TNT to blow it to rubble.',
    goalLabel: 'Destroy 80% of the stone wall',
    timeLimitMs: 60000,
    points: 150,
    setup: (engine) => {
      ringWalls(engine);
      engine.fillRect(95, 30, 125, engine.height - 10, STONE);
      engine.fillRect(30, engine.height - 16, 60, engine.height - 12, GUNPOWDER);
      engine.setCell(45, engine.height - 17, TNT);
    },
    captureInitial: (engine) => ({ stone: engine.countElement(STONE) }),
    checkWin: (engine, _t, initial) => {
      if (!initial.stone) return false;
      const remaining = engine.countElement(STONE);
      return remaining <= initial.stone * 0.2;
    },
    progress: (engine, _t, initial) => {
      if (!initial.stone) return 0;
      const remaining = engine.countElement(STONE);
      return Math.min(1, 1 - remaining / initial.stone);
    },
  },
  {
    id: 'circuit-bomb',
    title: 'Circuit Breaker',
    icon: '⚡',
    description: 'A wire snakes across the chamber to a hidden TNT charge. Drop a spark at the start to trigger the chain reaction.',
    goalLabel: 'Detonate the TNT via the wire circuit',
    timeLimitMs: 30000,
    points: 130,
    setup: (engine) => {
      ringWalls(engine);
      const y = Math.floor(engine.height / 2);
      for (let x = 20; x < 190; x++) {
        engine.setCell(x, y + Math.round(Math.sin(x / 12) * 8), WIRE);
      }
      engine.setCell(195, y, TNT);
      engine.fillRect(193, y - 6, 210, y + 6, STONE);
      engine.setCell(12, y, METAL);
    },
    captureInitial: (engine) => ({ stone: engine.countElement(STONE), started: 1 }),
    checkWin: (engine, elapsedMs, initial) => elapsedMs > 500 && engine.countElement(STONE) < initial.stone * 0.5,
    progress: (engine, _t, initial) => {
      if (!initial.stone) return 0;
      const remaining = engine.countElement(STONE);
      return Math.min(1, 1 - remaining / initial.stone);
    },
  },
  {
    id: 'garden-grower',
    title: 'Garden Grower',
    icon: '🌱',
    description: 'A lonely seedling waits in dry soil. Irrigate the plot with water and grow a flourishing garden.',
    goalLabel: 'Grow 60+ plant cells',
    timeLimitMs: 90000,
    points: 140,
    setup: (engine) => {
      ringWalls(engine);
      engine.fillRect(20, engine.height - 14, 200, engine.height - 10, SAND);
      engine.setCell(110, engine.height - 15, PLANT);
      engine.setCell(90, engine.height - 15, PLANT);
      engine.setCell(130, engine.height - 15, PLANT);
    },
    captureInitial: () => ({ started: 1 }),
    checkWin: (engine) => engine.countElement(PLANT) >= 60,
    progress: (engine) => Math.min(1, engine.countElement(PLANT) / 60),
  },
];

export function getInitialStats(challenge: Challenge, engine: Sandbox) {
  return challenge.captureInitial(engine);
}
