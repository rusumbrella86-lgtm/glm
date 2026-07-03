// ---------------------------------------------------------------------------
// Powder Sandbox — element registry
//
// The roster is intentionally *data-driven*. Every element is described by a
// set of declarative "traits" (flammable, conducts, waterReaction, radioactive,
// meltTo, ...). The engine consumes those traits generically, which lets the
// catalogue scale to the full periodic table (~118 real elements) plus a huge
// library of materials, compounds, foods and fantasy substances — well over
// 260 interactable elements in total — without hand-writing per-element logic.
// ---------------------------------------------------------------------------

export type SimCategory = 'empty' | 'powder' | 'liquid' | 'gas' | 'static' | 'special';
export type WaterReaction = 'alkali' | 'acid' | 'corrode' | 'dissolve' | 'freeze' | 'boil';

export interface ElementDef {
  id: number;
  key: string;
  name: string;
  icon: string;
  color: [number, number, number];
  category: SimCategory;
  density: number;
  // --- behavioural traits ---
  flammable?: number; // >0 = chance/step to ignite when touched by fire/lava/spark
  explosionPower?: number; // >0 = blast radius multiplier (explosive)
  conducts?: boolean; // carries electricity (acts like wire)
  oxidizer?: boolean; // feeds & spreads fire
  waterReaction?: WaterReaction; // behaviour when submerged in water
  dissolvable?: boolean; // slowly dissolves in water
  acidResistance?: number; // 0 (eats fast) .. 1 (basically immune)
  dispersion?: number; // sideways spread for liquids
  meltTo?: number; // element id produced when sufficiently heated
  radioactive?: { decayKey: string; chance: number };
  defaultLife?: number;
  lifeVariance?: number;
  description: string;
  family?: string;
}

export const ELEMENTS: ElementDef[] = [];
const byKey: Record<string, number> = {};
let nextId = 0;

function reg(def: Omit<ElementDef, 'id'>): number {
  const id = nextId++;
  ELEMENTS[id] = { ...def, id };
  byKey[def.key] = id;
  return id;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function elementId(key: string): number {
  return byKey[key] ?? 0;
}
export function getElement(keyOrId: number | string): ElementDef {
  if (typeof keyOrId === 'string') return ELEMENTS[byKey[keyOrId]] ?? ELEMENTS[0];
  return ELEMENTS[keyOrId] ?? ELEMENTS[0];
}

// --- resolve radioactive decay keys to ids after everything is registered ---
function decayId(key: string): number {
  return byKey[key] ?? 0;
}
export function resolveDecay(key: string): number {
  return decayId(key);
}

// ===========================================================================
// 1. CORE / BASE ELEMENTS  (stable ids 0..27)
// ===========================================================================
reg({ key: 'empty', name: 'Eraser', icon: '🧹', color: [8, 10, 18], category: 'empty', density: 0, description: 'Clears cells back to empty space.' });
reg({ key: 'wall', name: 'Wall', icon: '🧱', color: [90, 96, 110], category: 'static', density: 9999, description: 'Indestructible solid boundary. Blocks everything, immune to acid and blasts.' });
reg({ key: 'sand', name: 'Sand', icon: '🏖️', color: [224, 190, 110], category: 'powder', density: 10, description: 'Falls and piles up. Sinks through liquids. Fuses into glass near intense heat.' });
reg({ key: 'water', name: 'Water', icon: '💧', color: [58, 120, 210], category: 'liquid', density: 5, dispersion: 6, description: 'Flows and spreads. Extinguishes fire, cools molten rock into stone.' });
reg({ key: 'oil', name: 'Oil', icon: '🛢️', color: [110, 84, 40], category: 'liquid', density: 3, dispersion: 4, flammable: 0.05, description: 'Floats on water. Highly flammable liquid.' });
reg({ key: 'acid', name: 'Acid', icon: '🧪', color: [116, 214, 84], category: 'liquid', density: 5, dispersion: 4, defaultLife: 320, lifeVariance: 80, description: 'Corrosive liquid that dissolves most materials it touches.' });
reg({ key: 'fire', name: 'Fire', icon: '🔥', color: [255, 120, 40], category: 'gas', density: 0, defaultLife: 35, lifeVariance: 25, description: 'Short-lived flame. Ignites flammables, triggers explosions, rises and fades.' });
reg({ key: 'smoke', name: 'Smoke', icon: '💨', color: [90, 92, 98], category: 'gas', density: 1, defaultLife: 140, lifeVariance: 60, description: 'Rises and slowly dissipates into nothing.' });
reg({ key: 'steam', name: 'Steam', icon: '♨️', color: [214, 226, 235], category: 'gas', density: 2, defaultLife: 170, lifeVariance: 80, description: 'Produced by boiling water. Rises and may condense back to water.' });
reg({ key: 'lava', name: 'Lava', icon: '🌋', color: [230, 80, 20], category: 'liquid', density: 9, dispersion: 1, description: 'Molten rock. Ignites flammables, boils water, cools into stone.' });
reg({ key: 'wood', name: 'Wood', icon: '🪵', color: [120, 78, 42], category: 'static', density: 9999, flammable: 0.06, description: 'Sturdy and static. Catches fire when exposed to flame, spark or lava.' });
reg({ key: 'plant', name: 'Plant', icon: '🌿', color: [64, 168, 66], category: 'static', density: 9999, flammable: 0.45, description: 'Grows slowly near water. Burns easily. Can be infected by virus.' });
reg({ key: 'ice', name: 'Ice', icon: '🧊', color: [176, 220, 235], category: 'static', density: 9999, waterReaction: 'freeze', description: 'Frozen water. Melts near fire or lava.' });
reg({ key: 'stone', name: 'Stone', icon: '🪨', color: [120, 118, 122], category: 'powder', density: 12, acidResistance: 0.7, meltTo: elementId('lava'), description: 'Heavy powder formed when lava cools. Resists acid.' });
reg({ key: 'salt', name: 'Salt', icon: '🧂', color: [232, 232, 224], category: 'powder', density: 9, dissolvable: true, description: 'Granular powder that slowly dissolves in water.' });
reg({ key: 'void', name: 'Void', icon: '🕳️', color: [20, 8, 30], category: 'special', density: 9999, description: 'Devours anything that touches it. Indestructible.' });
reg({ key: 'gunpowder', name: 'Gunpowder', icon: '💥', color: [58, 58, 66], category: 'powder', density: 8, flammable: 0.9, explosionPower: 4, description: 'Falls like sand. Detonates violently near fire, lava or a spark.' });
reg({ key: 'tnt', name: 'TNT', icon: '🧨', color: [200, 46, 46], category: 'static', density: 9999, flammable: 0.9, explosionPower: 10, description: 'Static explosive block. Massive blast when ignited by fire, lava or spark.' });
reg({ key: 'fuse', name: 'Fuse', icon: '🪢', color: [200, 168, 90], category: 'static', density: 9999, flammable: 0.9, description: 'Thin static cord that burns rapidly, perfect for timing explosions.' });
reg({ key: 'metal', name: 'Metal', icon: '🔩', color: [176, 182, 196], category: 'static', density: 9999, acidResistance: 0.85, conducts: true, description: 'Tough static conductor. Melts into molten metal against sustained lava heat.' });
reg({ key: 'molten_metal', name: 'Molten Metal', icon: '⚙️', color: [235, 150, 60], category: 'liquid', density: 15, dispersion: 1, description: 'Superheated liquid metal. Hardens back into metal when cooled.' });
reg({ key: 'glass', name: 'Glass', icon: '🔷', color: [156, 214, 224], category: 'static', density: 9999, acidResistance: 0.5, description: 'Formed when sand fuses under extreme heat. Brittle but resists acid.' });
reg({ key: 'snow', name: 'Snow', icon: '❄️', color: [240, 248, 255], category: 'powder', density: 6, waterReaction: 'freeze', description: 'Cold powder. Melts near heat and can freeze neighbouring water into ice.' });
reg({ key: 'virus', name: 'Virus', icon: '🦠', color: [176, 64, 200], category: 'special', density: 9999, defaultLife: 260, lifeVariance: 60, description: 'Spreads across plant and wood, infecting them. Dies without hosts or in fire.' });
reg({ key: 'cloner', name: 'Cloner', icon: '🌀', color: [64, 220, 200], category: 'static', density: 9999, description: 'Remembers the last element that touched it and continuously duplicates it.' });
reg({ key: 'wire', name: 'Wire', icon: '➰', color: [140, 108, 40], category: 'static', density: 9999, conducts: true, description: 'Inert conductor. Carries an electric spark to trigger distant devices.' });
reg({ key: 'spark', name: 'Spark', icon: '⚡', color: [255, 244, 140], category: 'special', density: 9999, defaultLife: 3, description: 'Fleeting jolt of electricity that travels along wire, igniting explosives and fuses.' });
reg({ key: 'deuterium', name: 'Deuterium', icon: 'D', color: [150, 170, 210], category: 'gas', density: 0, flammable: 0.8, description: 'Heavy hydrogen isotope. Light flammable gas with nuclear-science flavour.' });

// ===========================================================================
// 2. THE PERIODIC TABLE — all 118 chemical elements (ids 28..145)
// ===========================================================================
interface PTE {
  z: number; sym: string; name: string; fam: string; st: 's' | 'l' | 'g'; hex: string; d: number; r?: boolean;
}

const PERIODIC: PTE[] = [
  { z: 1, sym: 'H', name: 'hydrogen', fam: 'nonmetal', st: 'g', hex: '#9aa7c2', d: 0 },
  { z: 2, sym: 'He', name: 'helium', fam: 'noble', st: 'g', hex: '#ffd6b3', d: 0 },
  { z: 3, sym: 'Li', name: 'lithium', fam: 'alkali', st: 's', hex: '#c2bfb0', d: 5, r: true },
  { z: 4, sym: 'Be', name: 'beryllium', fam: 'alkaline', st: 's', hex: '#c7e0c2', d: 18 },
  { z: 5, sym: 'B', name: 'boron', fam: 'metalloid', st: 's', hex: '#e8d18a', d: 23 },
  { z: 6, sym: 'C', name: 'carbon', fam: 'nonmetal', st: 's', hex: '#5c5c5c', d: 22 },
  { z: 7, sym: 'N', name: 'nitrogen', fam: 'nonmetal', st: 'g', hex: '#9fc3ff', d: 1 },
  { z: 8, sym: 'O', name: 'oxygen', fam: 'nonmetal', st: 'g', hex: '#ff5a5a', d: 1 },
  { z: 9, sym: 'F', name: 'fluorine', fam: 'halogen', st: 'g', hex: '#bda0ff', d: 2 },
  { z: 10, sym: 'Ne', name: 'neon', fam: 'noble', st: 'g', hex: '#ff9e9e', d: 0 },
  { z: 11, sym: 'Na', name: 'sodium', fam: 'alkali', st: 's', hex: '#ac9d8e', d: 10 },
  { z: 12, sym: 'Mg', name: 'magnesium', fam: 'alkaline', st: 's', hex: '#8ee0a0', d: 17 },
  { z: 13, sym: 'Al', name: 'aluminium', fam: 'postTransition', st: 's', hex: '#c8cdd4', d: 27 },
  { z: 14, sym: 'Si', name: 'silicon', fam: 'metalloid', st: 's', hex: '#86796f', d: 23 },
  { z: 15, sym: 'P', name: 'phosphorus', fam: 'nonmetal', st: 's', hex: '#ffb84d', d: 18 },
  { z: 16, sym: 'S', name: 'sulfur', fam: 'nonmetal', st: 's', hex: '#e8e24a', d: 20 },
  { z: 17, sym: 'Cl', name: 'chlorine', fam: 'halogen', st: 'g', hex: '#5fd06a', d: 3 },
  { z: 18, sym: 'Ar', name: 'argon', fam: 'noble', st: 'g', hex: '#b3ffd1', d: 1 },
  { z: 19, sym: 'K', name: 'potassium', fam: 'alkali', st: 's', hex: '#a37e6a', d: 9 },
  { z: 20, sym: 'Ca', name: 'calcium', fam: 'alkaline', st: 's', hex: '#8e8b8e', d: 15 },
  { z: 21, sym: 'Sc', name: 'scandium', fam: 'transition', st: 's', hex: '#c0c0c8', d: 30 },
  { z: 22, sym: 'Ti', name: 'titanium', fam: 'transition', st: 's', hex: '#9fa6ad', d: 45 },
  { z: 23, sym: 'V', name: 'vanadium', fam: 'transition', st: 's', hex: '#aeb0b5', d: 61 },
  { z: 24, sym: 'Cr', name: 'chromium', fam: 'transition', st: 's', hex: '#c9cdd2', d: 71 },
  { z: 25, sym: 'Mn', name: 'manganese', fam: 'transition', st: 's', hex: '#b3b0a8', d: 74 },
  { z: 26, sym: 'Fe', name: 'iron', fam: 'transition', st: 's', hex: '#c6b8a8', d: 79 },
  { z: 27, sym: 'Co', name: 'cobalt', fam: 'transition', st: 's', hex: '#9aa0b8', d: 89 },
  { z: 28, sym: 'Ni', name: 'nickel', fam: 'transition', st: 's', hex: '#a3c9a3', d: 89 },
  { z: 29, sym: 'Cu', name: 'copper', fam: 'transition', st: 's', hex: '#d08a52', d: 90 },
  { z: 30, sym: 'Zn', name: 'zinc', fam: 'transition', st: 's', hex: '#b6b6b0', d: 71 },
  { z: 31, sym: 'Ga', name: 'gallium', fam: 'postTransition', st: 's', hex: '#9fb0c0', d: 59 },
  { z: 32, sym: 'Ge', name: 'germanium', fam: 'metalloid', st: 's', hex: '#9fb0b6', d: 53 },
  { z: 33, sym: 'As', name: 'arsenic', fam: 'metalloid', st: 's', hex: '#9a9a86', d: 57 },
  { z: 34, sym: 'Se', name: 'selenium', fam: 'nonmetal', st: 's', hex: '#c2c24a', d: 48 },
  { z: 35, sym: 'Br', name: 'bromine', fam: 'halogen', st: 'l', hex: '#a03b26', d: 31 },
  { z: 36, sym: 'Kr', name: 'krypton', fam: 'noble', st: 'g', hex: '#cfe0ff', d: 3 },
  { z: 37, sym: 'Rb', name: 'rubidium', fam: 'alkali', st: 's', hex: '#a87a6a', d: 15 },
  { z: 38, sym: 'Sr', name: 'strontium', fam: 'alkaline', st: 's', hex: '#6a8e6a', d: 26 },
  { z: 39, sym: 'Y', name: 'yttrium', fam: 'transition', st: 's', hex: '#b0b0b8', d: 45 },
  { z: 40, sym: 'Zr', name: 'zirconium', fam: 'transition', st: 's', hex: '#babfc4', d: 65 },
  { z: 41, sym: 'Nb', name: 'niobium', fam: 'transition', st: 's', hex: '#b8b0a8', d: 86 },
  { z: 42, sym: 'Mo', name: 'molybdenum', fam: 'transition', st: 's', hex: '#75787e', d: 102 },
  { z: 43, sym: 'Tc', name: 'technetium', fam: 'transition', st: 's', hex: '#8a8a8a', d: 110, r: true },
  { z: 44, sym: 'Ru', name: 'ruthenium', fam: 'transition', st: 's', hex: '#b6b6b6', d: 124 },
  { z: 45, sym: 'Rh', name: 'rhodium', fam: 'transition', st: 's', hex: '#c3c3c8', d: 124 },
  { z: 46, sym: 'Pd', name: 'palladium', fam: 'transition', st: 's', hex: '#c0c0c4', d: 120 },
  { z: 47, sym: 'Ag', name: 'silver', fam: 'transition', st: 's', hex: '#cdcdd2', d: 105 },
  { z: 48, sym: 'Cd', name: 'cadmium', fam: 'transition', st: 's', hex: '#c2bcae', d: 87 },
  { z: 49, sym: 'In', name: 'indium', fam: 'postTransition', st: 's', hex: '#bcc0c8', d: 73 },
  { z: 50, sym: 'Sn', name: 'tin', fam: 'postTransition', st: 's', hex: '#b5b8bd', d: 73 },
  { z: 51, sym: 'Sb', name: 'antimony', fam: 'metalloid', st: 's', hex: '#b0a0a0', d: 66 },
  { z: 52, sym: 'Te', name: 'tellurium', fam: 'metalloid', st: 's', hex: '#a86a4a', d: 62 },
  { z: 53, sym: 'I', name: 'iodine', fam: 'halogen', st: 's', hex: '#6a3b8a', d: 49 },
  { z: 54, sym: 'Xe', name: 'xenon', fam: 'noble', st: 'g', hex: '#9affff', d: 3 },
  { z: 55, sym: 'Cs', name: 'caesium', fam: 'alkali', st: 's', hex: '#b06a5a', d: 19 },
  { z: 56, sym: 'Ba', name: 'barium', fam: 'alkaline', st: 's', hex: '#8a9a6a', d: 35 },
  { z: 57, sym: 'La', name: 'lanthanum', fam: 'lanthanide', st: 's', hex: '#b0bbb0', d: 61 },
  { z: 58, sym: 'Ce', name: 'cerium', fam: 'lanthanide', st: 's', hex: '#b3a9a0', d: 67 },
  { z: 59, sym: 'Pr', name: 'praseodymium', fam: 'lanthanide', st: 's', hex: '#aaa9a0', d: 67 },
  { z: 60, sym: 'Nd', name: 'neodymium', fam: 'lanthanide', st: 's', hex: '#b3a99a', d: 70 },
  { z: 61, sym: 'Pm', name: 'promethium', fam: 'lanthanide', st: 's', hex: '#a99a8a', d: 73, r: true },
  { z: 62, sym: 'Sm', name: 'samarium', fam: 'lanthanide', st: 's', hex: '#aaa99c', d: 75 },
  { z: 63, sym: 'Eu', name: 'europium', fam: 'lanthanide', st: 's', hex: '#b3a89a', d: 52 },
  { z: 64, sym: 'Gd', name: 'gadolinium', fam: 'lanthanide', st: 's', hex: '#a8a8a0', d: 79 },
  { z: 65, sym: 'Tb', name: 'terbium', fam: 'lanthanide', st: 's', hex: '#aaa99a', d: 82 },
  { z: 66, sym: 'Dy', name: 'dysprosium', fam: 'lanthanide', st: 's', hex: '#a8a89a', d: 85 },
  { z: 67, sym: 'Ho', name: 'holmium', fam: 'lanthanide', st: 's', hex: '#aaa99c', d: 88 },
  { z: 68, sym: 'Er', name: 'erbium', fam: 'lanthanide', st: 's', hex: '#aaa89a', d: 89 },
  { z: 69, sym: 'Tm', name: 'thulium', fam: 'lanthanide', st: 's', hex: '#a8a89a', d: 93 },
  { z: 70, sym: 'Yb', name: 'ytterbium', fam: 'lanthanide', st: 's', hex: '#aaa89a', d: 70 },
  { z: 71, sym: 'Lu', name: 'lutetium', fam: 'lanthanide', st: 's', hex: '#a8a89a', d: 98 },
  { z: 72, sym: 'Hf', name: 'hafnium', fam: 'transition', st: 's', hex: '#b3b3b0', d: 133 },
  { z: 73, sym: 'Ta', name: 'tantalum', fam: 'transition', st: 's', hex: '#b8b8b0', d: 166 },
  { z: 74, sym: 'W', name: 'tungsten', fam: 'transition', st: 's', hex: '#8a8a8a', d: 192 },
  { z: 75, sym: 'Re', name: 'rhenium', fam: 'transition', st: 's', hex: '#a8a8a0', d: 210 },
  { z: 76, sym: 'Os', name: 'osmium', fam: 'transition', st: 's', hex: '#9a9a9a', d: 226 },
  { z: 77, sym: 'Ir', name: 'iridium', fam: 'transition', st: 's', hex: '#b6b6b6', d: 224 },
  { z: 78, sym: 'Pt', name: 'platinum', fam: 'transition', st: 's', hex: '#d9d9de', d: 215 },
  { z: 79, sym: 'Au', name: 'gold', fam: 'transition', st: 's', hex: '#e8c34a', d: 193 },
  { z: 80, sym: 'Hg', name: 'mercury', fam: 'transition', st: 'l', hex: '#b8b8bc', d: 135 },
  { z: 81, sym: 'Tl', name: 'thallium', fam: 'postTransition', st: 's', hex: '#9a9a9a', d: 118 },
  { z: 82, sym: 'Pb', name: 'lead', fam: 'postTransition', st: 's', hex: '#8a8e96', d: 113 },
  { z: 83, sym: 'Bi', name: 'bismuth', fam: 'postTransition', st: 's', hex: '#9aa0a8', d: 98 },
  { z: 84, sym: 'Po', name: 'polonium', fam: 'postTransition', st: 's', hex: '#a06a4a', d: 209, r: true },
  { z: 85, sym: 'At', name: 'astatine', fam: 'halogen', st: 's', hex: '#6a4a7a', d: 210, r: true },
  { z: 86, sym: 'Rn', name: 'radon', fam: 'noble', st: 'g', hex: '#b0c4d0', d: 4, r: true },
  { z: 87, sym: 'Fr', name: 'francium', fam: 'alkali', st: 's', hex: '#9a5a4a', d: 27, r: true },
  { z: 88, sym: 'Ra', name: 'radium', fam: 'alkaline', st: 's', hex: '#7a8a5a', d: 50, r: true },
  { z: 89, sym: 'Ac', name: 'actinium', fam: 'actinide', st: 's', hex: '#a0a89a', d: 100, r: true },
  { z: 90, sym: 'Th', name: 'thorium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 117, r: true },
  { z: 91, sym: 'Pa', name: 'protactinium', fam: 'actinide', st: 's', hex: '#9aa89c', d: 150, r: true },
  { z: 92, sym: 'U', name: 'uranium', fam: 'actinide', st: 's', hex: '#7a8a6a', d: 189, r: true },
  { z: 93, sym: 'Np', name: 'neptunium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 202, r: true },
  { z: 94, sym: 'Pu', name: 'plutonium', fam: 'actinide', st: 's', hex: '#a08a6a', d: 198, r: true },
  { z: 95, sym: 'Am', name: 'americium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 243, r: true },
  { z: 96, sym: 'Cm', name: 'curium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 247, r: true },
  { z: 97, sym: 'Bk', name: 'berkelium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 247, r: true },
  { z: 98, sym: 'Cf', name: 'californium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 251, r: true },
  { z: 99, sym: 'Es', name: 'einsteinium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 252, r: true },
  { z: 100, sym: 'Fm', name: 'fermium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 257, r: true },
  { z: 101, sym: 'Md', name: 'mendelevium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 258, r: true },
  { z: 102, sym: 'No', name: 'nobelium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 259, r: true },
  { z: 103, sym: 'Lr', name: 'lawrencium', fam: 'actinide', st: 's', hex: '#9aa89a', d: 266, r: true },
  { z: 104, sym: 'Rf', name: 'rutherfordium', fam: 'transition', st: 's', hex: '#9aa89a', d: 267, r: true },
  { z: 105, sym: 'Db', name: 'dubnium', fam: 'transition', st: 's', hex: '#9aa89a', d: 268, r: true },
  { z: 106, sym: 'Sg', name: 'seaborgium', fam: 'transition', st: 's', hex: '#9aa89a', d: 269, r: true },
  { z: 107, sym: 'Bh', name: 'bohrium', fam: 'transition', st: 's', hex: '#9aa89a', d: 270, r: true },
  { z: 108, sym: 'Hs', name: 'hassium', fam: 'transition', st: 's', hex: '#9aa89a', d: 277, r: true },
  { z: 109, sym: 'Mt', name: 'meitnerium', fam: 'transition', st: 's', hex: '#9aa89a', d: 278, r: true },
  { z: 110, sym: 'Ds', name: 'darmstadtium', fam: 'transition', st: 's', hex: '#9aa89a', d: 281, r: true },
  { z: 111, sym: 'Rg', name: 'roentgenium', fam: 'transition', st: 's', hex: '#9aa89a', d: 282, r: true },
  { z: 112, sym: 'Cn', name: 'copernicium', fam: 'transition', st: 's', hex: '#9aa89a', d: 285, r: true },
  { z: 113, sym: 'Nh', name: 'nihonium', fam: 'postTransition', st: 's', hex: '#9aa89a', d: 286, r: true },
  { z: 114, sym: 'Fl', name: 'flerovium', fam: 'postTransition', st: 's', hex: '#9aa89a', d: 289, r: true },
  { z: 115, sym: 'Mc', name: 'moscovium', fam: 'postTransition', st: 's', hex: '#9aa89a', d: 290, r: true },
  { z: 116, sym: 'Lv', name: 'livermorium', fam: 'postTransition', st: 's', hex: '#9aa89a', d: 293, r: true },
  { z: 117, sym: 'Ts', name: 'tennessine', fam: 'halogen', st: 's', hex: '#9aa89a', d: 294, r: true },
  { z: 118, sym: 'Og', name: 'oganesson', fam: 'noble', st: 'g', hex: '#9aa89a', d: 294, r: true },
];

const FAMILY: Record<string, { cat: SimCategory; conduct: boolean; water?: WaterReaction; note: string }> = {
  alkali: { cat: 'powder', conduct: true, water: 'alkali', note: 'An alkali metal. Reacts violently with water, releasing hydrogen gas and heat.' },
  alkaline: { cat: 'powder', conduct: true, water: 'corrode', note: 'An alkaline earth metal. Reacts slowly with water to form caustic solutions.' },
  transition: { cat: 'static', conduct: true, note: 'A hard, conductive transition metal.' },
  postTransition: { cat: 'static', conduct: false, note: 'A soft, low-melting post-transition metal.' },
  metalloid: { cat: 'static', conduct: false, note: 'A brittle metalloid with semiconducting properties.' },
  nonmetal: { cat: 'static', conduct: false, note: 'A reactive nonmetal.' },
  halogen: { cat: 'static', conduct: false, water: 'acid', note: 'A halogen. Dissolves in water to form corrosive acid.' },
  noble: { cat: 'gas', conduct: false, note: 'An inert noble gas that rarely reacts.' },
  lanthanide: { cat: 'static', conduct: true, note: 'A shiny rare-earth lanthanide metal.' },
  actinide: { cat: 'static', conduct: true, note: 'A dense, radioactive actinide metal.' },
};

const DECAY: Record<string, string> = {
  lithium: 'helium', beryllium: 'lithium', francium: 'radon', radium: 'radon', actinium: 'francium',
  thorium: 'radium', protactinium: 'actinium', uranium: 'lead', neptunium: 'uranium',
  plutonium: 'uranium', americium: 'neptunium', curium: 'plutonium', berkelium: 'curium',
  californium: 'curium', einsteinium: 'berkelium', fermium: 'einsteinium', mendelevium: 'fermium',
  nobelium: 'mendelevium', lawrencium: 'nobelium', technetium: 'ruthenium', promethium: 'samarium',
  polonium: 'lead', astatine: 'polonium', radon: 'polonium',
  rutherfordium: 'nobelium', dubnium: 'lawrencium', seaborgium: 'rutherfordium', bohrium: 'dubnium',
  hassium: 'seaborgium', meitnerium: 'bohrium', darmstadtium: 'hassium', roentgenium: 'meitnerium',
  copernicium: 'darmstadtium', nihonium: 'roentgenium', flerovium: 'copernicium', moscovium: 'nihonium',
  livermorium: 'flerovium', tennessine: 'moscovium', oganesson: 'livermorium',
};

function decayChance(z: number): number {
  if (z >= 104) return 0.04;
  if (z >= 95) return 0.01;
  if (z >= 89) return 0.0015;
  return 0.0007;
}

for (const p of PERIODIC) {
  const fam = FAMILY[p.fam];
  let category = fam.cat;
  if (p.fam === 'nonmetal' || p.fam === 'halogen') {
    category = p.st === 'g' ? 'gas' : p.st === 'l' ? 'liquid' : 'static';
  }
  const def: Omit<ElementDef, 'id'> = {
    key: p.name,
    name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
    icon: p.sym,
    color: hexToRgb(p.hex),
    category,
    density: p.d,
    conducts: fam.conduct,
    waterReaction: fam.water,
    family: p.sym,
    description: `${p.name} (${p.sym}, #${p.z}) — ${fam.note}`,
  };
  if (p.name === 'oxygen') def.oxidizer = true;
  if (p.name === 'hydrogen') { def.flammable = 0.82; def.category = 'gas'; def.density = 0; }
  if (p.name === 'phosphorus') def.flammable = 0.9;
  if (p.name === 'sulfur') def.flammable = 0.04;
  if (p.name === 'carbon') { def.flammable = 0.02; }
  if (p.r) {
    def.radioactive = { decayKey: DECAY[p.name] ?? 'lead', chance: decayChance(p.z) };
  }
  // low-melting metals go molten when heated
  if (['tin', 'lead', 'zinc', 'gallium', 'bismuth', 'indium'].includes(p.name)) def.meltTo = elementId('molten_metal');
  // metals are quite acid-resistant
  if (fam.conduct && p.fam !== 'alkali' && p.fam !== 'alkaline') def.acidResistance = 0.85;
  reg(def);
}

// ===========================================================================
// 3. MATERIALS / COMPOUNDS / FOODS / DEVICES / FANTASY (push roster past 260)
// ===========================================================================
type Extra = {
  k: string;
  n: string;
  i: string;
  c: [number, number, number];
  cat: SimCategory;
  d?: number;
  flammable?: number;
  expl?: number;
  conduct?: boolean;
  conducts?: boolean;
  oxi?: boolean;
  oxidizer?: boolean;
  water?: WaterReaction;
  dissolve?: boolean;
  acidR?: number;
  disp?: number;
  life?: number;
  lifeVariance?: number;
  melt?: string;
  meltTo?: string;
  radioactive?: { decayKey: string; chance: number };
  desc?: string;
  family?: string;
};

const EXTRAS: Extra[] = [
  // Building & minerals
  { k: 'brick', n: 'Brick', i: '🧱', c: [165, 70, 50], cat: 'powder', d: 12, desc: 'Crumbly fired-clay powder.' },
  { k: 'concrete', n: 'Concrete', i: '🏗️', c: [150, 150, 150], cat: 'powder', d: 13, desc: 'Pale, heavy construction powder.' },
  { k: 'cement', n: 'Cement', i: '🪨', c: [195, 192, 186], cat: 'powder', d: 13, desc: 'Fine grey powder that sets when wet.' },
  { k: 'plaster', n: 'Plaster', i: '🩹', c: [236, 232, 224], cat: 'powder', d: 11, desc: 'Soft white powder.' },
  { k: 'clay', n: 'Clay', i: '🟤', c: [150, 95, 70], cat: 'powder', d: 12, desc: 'Mouldable earthy powder.' },
  { k: 'gravel', n: 'Gravel', i: '⚪', c: [130, 128, 125], cat: 'powder', d: 12, desc: 'Coarse stony grit.' },
  { k: 'marble', n: 'Marble', i: '🟫', c: [232, 230, 226], cat: 'static', d: 27, meltTo: 'molten_metal', desc: 'Beautiful veined decorative stone.' },
  { k: 'granite', n: 'Granite', i: '🪨', c: [150, 130, 120], cat: 'static', d: 26, meltTo: 'molten_metal', desc: 'Hard speckled igneous rock.' },
  { k: 'sandstone', n: 'Sandstone', i: '🟧', c: [200, 170, 120], cat: 'static', d: 22, desc: 'Layered sedimentary rock.' },
  { k: 'obsidian', n: 'Obsidian', i: '⬛', c: [30, 25, 35], cat: 'static', d: 26, acidR: 0.6, desc: 'Volcanic glass; razor sharp, acid resistant.' },
  { k: 'basalt', n: 'Basalt', i: '🪨', c: [55, 52, 55], cat: 'static', d: 28, desc: 'Dark volcanic rock.' },
  { k: 'quartz', n: 'Quartz', i: '💎', c: [220, 215, 230], cat: 'static', d: 26, acidR: 0.7, desc: 'Crystalline silica, very hard.' },
  { k: 'asphalt', n: 'Asphalt', i: '🛣️', c: [45, 42, 45], cat: 'powder', d: 12, flammable: 0.2, desc: 'Sticky black road surface, partly tar.' },
  { k: 'ceramic', n: 'Ceramic', i: '🍶', c: [210, 200, 190], cat: 'static', d: 25, acidR: 0.6, desc: 'Fired clay, hard but brittle.' },
  { k: 'porcelain', n: 'Porcelain', i: '🏺', c: [240, 238, 233], cat: 'static', d: 24, desc: 'Fine white ceramic.' },
  { k: 'tile', n: 'Tile', i: '🧱', c: [120, 170, 190], cat: 'static', d: 24, desc: 'Glazed building tile.' },

  // Alloys & technical metals
  { k: 'bronze', n: 'Bronze', i: '🥉', c: [183, 115, 51], cat: 'static', d: 89, conduct: true, acidR: 0.8, meltTo: 'molten_metal', desc: 'Copper-tin alloy, golden brown.' },
  { k: 'brass', n: 'Brass', i: '🟡', c: [200, 170, 70], cat: 'static', d: 85, conduct: true, acidR: 0.8, meltTo: 'molten_metal', desc: 'Copper-zinc alloy, bright gold.' },
  { k: 'steel', n: 'Steel', i: '🔗', c: [150, 156, 165], cat: 'static', d: 80, conduct: true, acidR: 0.75, meltTo: 'molten_metal', desc: 'Tough carbon steel.' },
  { k: 'stainless_steel', n: 'Stainless Steel', i: '🥄', c: [200, 205, 212], cat: 'static', d: 80, conduct: true, acidR: 0.95, meltTo: 'molten_metal', desc: 'Corrosion-proof chromium steel.' },
  { k: 'pewter', n: 'Pewter', i: '🫖', c: [180, 180, 186], cat: 'static', d: 73, conduct: true, meltTo: 'molten_metal', desc: 'Soft tin-based alloy.' },
  { k: 'solder', n: 'Solder', i: '🔧', c: [150, 158, 165], cat: 'static', d: 75, conduct: true, meltTo: 'molten_metal', desc: 'Low-melting fusible metal.' },
  { k: 'amalgam', n: 'Amalgam', i: '🌗', c: [170, 175, 180], cat: 'liquid', d: 110, disp: 2, conduct: true, desc: 'Liquid mercury alloy used in fillings.' },

  // Plastics & synthetics
  { k: 'plastic', n: 'Plastic', i: '🧴', c: [205, 210, 225], cat: 'static', d: 20, flammable: 0.4, acidR: 0.3, desc: 'Mouldable polymer, burns with black smoke.' },
  { k: 'polyethylene', n: 'Polyethylene', i: '🛍️', c: [225, 228, 232], cat: 'static', d: 18, flammable: 0.5, desc: 'Waxy plastic film.' },
  { k: 'pvc', n: 'PVC', i: '🪟', c: [200, 215, 225], cat: 'static', d: 20, flammable: 0.2, desc: 'Rigid white plastic.' },
  { k: 'rubber', n: 'Rubber', i: '🛞', c: [40, 40, 45], cat: 'static', d: 20, flammable: 0.45, desc: 'Springy black material.' },
  { k: 'silicone', n: 'Silicone', i: '🟦', c: [120, 140, 200], cat: 'static', d: 22, acidR: 0.9, desc: 'Heat-proof synthetic rubber.' },
  { k: 'foam', n: 'Foam', i: '🧽', c: [245, 248, 250], cat: 'powder', d: 3, flammable: 0.8, desc: 'Light, highly flammable bubbly plastic.' },
  { k: 'teflon', n: 'Teflon', i: '🍳', c: [200, 220, 220], cat: 'static', d: 22, acidR: 0.98, desc: 'Non-stick, chemically inert coating.' },
  { k: 'bubblegum', n: 'Bubblegum', i: '🫧', c: [255, 130, 180], cat: 'static', d: 18, flammable: 0.3, desc: 'Stretchy pink confection.' },

  // Gases (extra)
  { k: 'balloon_gas', n: 'Balloon Gas', i: '🎈', c: [255, 220, 180], cat: 'gas', d: 0, desc: 'A playful stand-in for light lifting gas.' },
  { k: 'methane', n: 'Methane', i: '🔥', c: [180, 150, 160], cat: 'gas', d: 1, flammable: 0.55, desc: 'Flammable natural gas.' },
  { k: 'carbon_dioxide', n: 'Carbon Dioxide', i: '🌫️', c: [200, 200, 210], cat: 'gas', d: 3, desc: 'Heavy inert gas that sinks and smothers fire.' },
  { k: 'carbon_monoxide', n: 'Carbon Monoxide', i: '☠️', c: [120, 120, 130], cat: 'gas', d: 2, flammable: 0.4, desc: 'Toxic, flammable gas.' },
  { k: 'ozone', n: 'Ozone', i: '🟦', c: [150, 210, 255], cat: 'gas', d: 2, oxidizer: true, desc: 'Reactive trioxygen, feeds fire.' },
  { k: 'chlorine_gas', n: 'Chlorine Gas', i: '☣️', c: [120, 200, 110], cat: 'gas', d: 3, desc: 'Greenish toxic gas.' },
  { k: 'propane', n: 'Propane', i: '🟥', c: [200, 140, 90], cat: 'gas', d: 2, flammable: 0.6, desc: 'Pressurised flammable fuel gas.' },
  { k: 'ammonia', n: 'Ammonia', i: '🟩', c: [140, 200, 160], cat: 'gas', d: 1, desc: 'Pungent alkaline gas.' },
  { k: 'natural_gas', n: 'Natural Gas', i: '🔥', c: [190, 180, 170], cat: 'gas', d: 1, flammable: 0.6, desc: 'Mixture of flammable hydrocarbons.' },
  { k: 'air', n: 'Air', i: '💨', c: [200, 210, 220], cat: 'gas', d: 1, desc: 'Ordinary breathable air (mostly nitrogen).' },

  // Liquids & chemicals
  { k: 'gasoline', n: 'Gasoline', i: '⛽', c: [170, 120, 40], cat: 'liquid', d: 3, disp: 5, flammable: 0.7, desc: 'Highly flammable fuel.' },
  { k: 'diesel', n: 'Diesel', i: '🛢️', c: [120, 90, 30], cat: 'liquid', d: 4, disp: 4, flammable: 0.4, desc: 'Oily fuel, harder to ignite than gasoline.' },
  { k: 'kerosene', n: 'Kerosene', i: '🪔', c: [150, 110, 40], cat: 'liquid', d: 4, disp: 4, flammable: 0.5, desc: 'Lamp and jet fuel.' },
  { k: 'alcohol', n: 'Alcohol', i: '🍶', c: [225, 240, 235], cat: 'liquid', d: 4, disp: 5, flammable: 0.65, desc: 'Flammable ethanol, burns with a blue flame.' },
  { k: 'vinegar', n: 'Vinegar', i: '🧴', c: [225, 230, 200], cat: 'liquid', d: 5, disp: 5, water: 'acid', desc: 'Weak acetic acid solution.' },
  { k: 'bleach', n: 'Bleach', i: '🧪', c: [235, 245, 240], cat: 'liquid', d: 5, disp: 5, desc: 'Corrosive cleaning fluid.' },
  { k: 'ink', n: 'Ink', i: '🖋️', c: [25, 25, 40], cat: 'liquid', d: 6, disp: 3, desc: 'Dark pigmented liquid.' },
  { k: 'paint', n: 'Paint', i: '🎨', c: [70, 130, 200], cat: 'liquid', d: 8, disp: 2, desc: 'Thick pigmented coating.' },
  { k: 'blood', n: 'Blood', i: '🩸', c: [170, 20, 25], cat: 'liquid', d: 6, disp: 2, desc: 'Red viscous biological fluid.' },
  { k: 'slime', n: 'Slime', i: '🟢', c: [120, 220, 90], cat: 'liquid', d: 4, disp: 2, desc: 'Gooey stretchy substance.' },
  { k: 'glow_fluid', n: 'Glow Fluid', i: '✨', c: [90, 255, 200], cat: 'liquid', d: 4, disp: 4, desc: 'Luminescent liquid.' },
  { k: 'laughing_gas', n: 'Laughing Gas', i: '🤪', c: [220, 230, 240], cat: 'gas', d: 2, desc: 'Nitrous oxide, a fun anaesthetic gas.' },
  { k: 'crude_oil', n: 'Crude Oil', i: '🛢️', c: [40, 35, 30], cat: 'liquid', d: 5, disp: 3, flammable: 0.15, desc: 'Thick raw petroleum.' },
  { k: 'liquid_nitrogen', n: 'Liquid Nitrogen', i: '🧊', c: [140, 170, 230], cat: 'liquid', d: 5, disp: 4, water: 'freeze', desc: 'Cryogenic liquid that freezes everything.' },
  { k: 'molten_glass', n: 'Molten Glass', i: '🟧', c: [240, 160, 60], cat: 'liquid', d: 8, disp: 2, desc: 'Red-hot flowing glass.' },
  { k: 'milk', n: 'Milk', i: '🥛', c: [245, 245, 240], cat: 'liquid', d: 5, disp: 5, desc: 'White nutritious drink.' },
  { k: 'coffee', n: 'Coffee', i: '☕', c: [90, 55, 35], cat: 'liquid', d: 5, disp: 5, desc: 'Hot brown caffeinated drink.' },
  { k: 'tea', n: 'Tea', i: '🍵', c: [150, 100, 50], cat: 'liquid', d: 5, disp: 5, desc: 'Warm amber infusion.' },
  { k: 'juice', n: 'Juice', i: '🧃', c: [240, 180, 60], cat: 'liquid', d: 5, disp: 5, flammable: 0.05, desc: 'Sweet fruity drink.' },
  { k: 'soup', n: 'Soup', i: '🍲', c: [200, 120, 60], cat: 'liquid', d: 6, disp: 3, desc: 'Savory hot broth.' },
  { k: 'soda', n: 'Soda', i: '🥤', c: [230, 235, 240], cat: 'liquid', d: 5, disp: 5, flammable: 0.05, desc: 'Fizzy sugary drink.' },
  { k: 'cola', n: 'Cola', i: '🥤', c: [60, 40, 35], cat: 'liquid', d: 5, disp: 5, desc: 'Dark fizzy beverage.' },
  { k: 'beer', n: 'Beer', i: '🍺', c: [210, 160, 50], cat: 'liquid', d: 5, disp: 5, flammable: 0.1, desc: 'Fermented grainy drink.' },
  { k: 'wine', n: 'Wine', i: '🍷', c: [120, 20, 40], cat: 'liquid', d: 5, disp: 5, flammable: 0.15, desc: 'Fermented grape drink.' },
  { k: 'honey', n: 'Honey', i: '🍯', c: [225, 170, 40], cat: 'liquid', d: 8, disp: 2, desc: 'Sticky golden sweetener.' },

  // Powders & granular
  { k: 'baking_soda', n: 'Baking Soda', i: '🥄', c: [245, 245, 242], cat: 'powder', d: 9, desc: 'Fine white leavening powder.' },
  { k: 'flour', n: 'Flour', i: '🌾', c: [240, 235, 215], cat: 'powder', d: 8, flammable: 0.6, desc: 'Explosive when airborne; bakes into bread.' },
  { k: 'charcoal', n: 'Charcoal', i: '⚫', c: [45, 42, 45], cat: 'powder', d: 9, flammable: 0.3, desc: 'Carbon fuel, smoulders well.' },
  { k: 'ash', n: 'Ash', i: '🌑', c: [90, 88, 90], cat: 'powder', d: 6, desc: 'Grey remains of a fire.' },
  { k: 'dust', n: 'Dust', i: '🌫️', c: [200, 195, 180], cat: 'powder', d: 5, flammable: 0.4, desc: 'Light airborne particles.' },
  { k: 'chalk', n: 'Chalk', i: '🖍️', c: [240, 240, 232], cat: 'powder', d: 10, desc: 'Soft white carbonate powder.' },
  { k: 'talcum', n: 'Talcum', i: '🧴', c: [245, 245, 245], cat: 'powder', d: 6, desc: 'Silky soft body powder.' },
  { k: 'cocoa', n: 'Cocoa Powder', i: '🍫', c: [95, 60, 40], cat: 'powder', d: 8, desc: 'Rich brown chocolate powder.' },
  { k: 'pepper', n: 'Pepper', i: '🌶️', c: [60, 40, 35], cat: 'powder', d: 8, flammable: 0.3, desc: 'Spicy black granules.' },
  { k: 'pollen', n: 'Pollen', i: '🟨', c: [235, 220, 90], cat: 'powder', d: 4, flammable: 0.7, desc: 'Cloudy yellow allergens.' },
  { k: 'confetti', n: 'Confetti', i: '🎉', c: [255, 100, 160], cat: 'powder', d: 5, desc: 'Colourful celebration bits.' },
  { k: 'gunpowder2', n: 'Black Powder', i: '💥', c: [50, 48, 45], cat: 'powder', d: 8, flammable: 0.95, expl: 4, desc: 'Classic explosive powder.' },

  // Foods
  { k: 'bread', n: 'Bread', i: '🍞', c: [210, 160, 90], cat: 'static', d: 15, flammable: 0.2, desc: 'Baked staple food.' },
  { k: 'cheese', n: 'Cheese', i: '🧀', c: [240, 200, 70], cat: 'static', d: 16, flammable: 0.15, desc: 'Soft dairy food.' },
  { k: 'chocolate', n: 'Chocolate', i: '🍫', c: [90, 55, 35], cat: 'static', d: 18, flammable: 0.2, desc: 'Sweet brown treat that softens and chars near flame.' },
  { k: 'sugar_gran', n: 'Sugar', i: '🍬', c: [245, 245, 240], cat: 'powder', d: 10, flammable: 0.4, water: 'dissolve', desc: 'Sweet dissolvable crystals.' },
  { k: 'butter', n: 'Butter', i: '🧈', c: [240, 220, 120], cat: 'static', d: 16, flammable: 0.3, desc: 'Dairy fat spread.' },
  { k: 'egg', n: 'Egg', i: '🥚', c: [240, 235, 225], cat: 'static', d: 18, desc: 'Fragile protein.' },
  { k: 'meat', n: 'Meat', i: '🥩', c: [180, 70, 70], cat: 'static', d: 18, flammable: 0.1, desc: 'Raw protein that cooks and chars.' },
  { k: 'fish', n: 'Fish', i: '🐟', c: [120, 160, 180], cat: 'static', d: 16, desc: 'Slippery sea creature.' },
  { k: 'banana', n: 'Banana', i: '🍌', c: [240, 215, 60], cat: 'static', d: 14, flammable: 0.2, desc: 'Curved yellow fruit.' },
  { k: 'apple', n: 'Apple', i: '🍎', c: [200, 40, 45], cat: 'static', d: 14, flammable: 0.2, desc: 'Crisp red fruit.' },
  { k: 'orange', n: 'Orange', i: '🍊', c: [240, 150, 40], cat: 'static', d: 14, flammable: 0.2, desc: 'Juicy citrus fruit.' },
  { k: 'watermelon', n: 'Watermelon', i: '🍉', c: [70, 160, 70], cat: 'static', d: 15, desc: 'Big juicy fruit full of water.' },
  { k: 'cake', n: 'Cake', i: '🎂', c: [245, 200, 210], cat: 'static', d: 14, flammable: 0.25, desc: 'Fluffy celebratory dessert.' },
  { k: 'cookie', n: 'Cookie', i: '🍪', c: [190, 140, 80], cat: 'static', d: 15, flammable: 0.25, desc: 'Crisp baked treat.' },
  { k: 'fries', n: 'Fries', i: '🍟', c: [220, 180, 90], cat: 'static', d: 14, flammable: 0.3, desc: 'Golden fried potatoes.' },
  { k: 'pizza', n: 'Pizza', i: '🍕', c: [220, 160, 60], cat: 'static', d: 16, flammable: 0.25, desc: 'Cheesy baked dish.' },
  { k: 'rice', n: 'Rice', i: '🍚', c: [245, 245, 240], cat: 'powder', d: 9, desc: 'Tiny grains of starch.' },
  { k: 'pasta', n: 'Pasta', i: '🍝', c: [225, 200, 140], cat: 'static', d: 16, desc: 'Wheat noodles.' },

  // Plants & nature
  { k: 'leaf', n: 'Leaf', i: '🍃', c: [80, 170, 70], cat: 'static', d: 12, flammable: 0.5, desc: 'Green, dry-leaf flammable.' },
  { k: 'grass', n: 'Grass', i: '🌱', c: [90, 180, 70], cat: 'static', d: 12, flammable: 0.6, desc: 'Dry grass, catches fire easily.' },
  { k: 'moss', n: 'Moss', i: '🟩', c: [60, 120, 70], cat: 'static', d: 12, flammable: 0.2, desc: 'Soft damp ground plant.' },
  { k: 'flower', n: 'Flower', i: '🌸', c: [255, 150, 200], cat: 'static', d: 12, flammable: 0.3, desc: 'Delicate bloom.' },
  { k: 'mushroom', n: 'Mushroom', i: '🍄', c: [210, 70, 70], cat: 'static', d: 14, flammable: 0.3, desc: 'Fungal fruiting body.' },
  { k: 'spore', n: 'Spore', i: '🟫', c: [180, 160, 120], cat: 'gas', d: 1, desc: 'Airborne fungal seed.' },
  { k: 'coral', n: 'Coral', i: '🪸', c: [255, 120, 120], cat: 'static', d: 20, desc: 'Marine reef structure.' },
  { k: 'shell', n: 'Shell', i: '🐚', c: [240, 225, 200], cat: 'static', d: 22, acidR: 0.4, desc: 'Calcium sea shell.' },
  { k: 'amber', n: 'Amber', i: '🟠', c: [210, 140, 40], cat: 'static', d: 20, acidR: 0.6, desc: 'Fossilised tree resin.' },
  { k: 'fern', n: 'Fern', i: '🌿', c: [50, 130, 60], cat: 'static', d: 12, flammable: 0.5, desc: 'Shade-loving green plant.' },

  // Animals & materials derived from them
  { k: 'bone', n: 'Bone', i: '🦴', c: [235, 228, 210], cat: 'static', d: 22, acidR: 0.3, desc: 'Hard calcium structure.' },
  { k: 'leather', n: 'Leather', i: '👜', c: [140, 90, 55], cat: 'static', d: 18, flammable: 0.3, desc: 'Tanned animal hide.' },
  { k: 'fur', n: 'Fur', i: '🐾', c: [160, 130, 100], cat: 'powder', d: 6, flammable: 0.6, desc: 'Warm insulating hair.' },
  { k: 'feather', n: 'Feather', i: '🪶', c: [230, 230, 235], cat: 'powder', d: 4, flammable: 0.7, desc: 'Light, highly flammable plume.' },
  { k: 'silk', n: 'Silk', i: '🧵', c: [240, 230, 235], cat: 'static', d: 12, flammable: 0.45, desc: 'Smooth spun thread.' },
  { k: 'wool', n: 'Wool', i: '🧶', c: [220, 210, 200], cat: 'static', d: 12, flammable: 0.5, desc: 'Fluffy sheep fibre.' },
  { k: 'pearl', n: 'Pearl', i: '⚪', c: [245, 240, 235], cat: 'static', d: 24, desc: 'Iridescent mollusc gem.' },

  // Gemstones
  { k: 'diamond', n: 'Diamond', i: '💎', c: [190, 240, 250], cat: 'static', d: 35, acidR: 0.98, desc: 'Hardest known mineral.' },
  { k: 'emerald', n: 'Emerald', i: '🟩', c: [40, 180, 100], cat: 'static', d: 27, acidR: 0.6, desc: 'Vivid green beryl gem.' },
  { k: 'ruby', n: 'Ruby', i: '🔴', c: [200, 30, 50], cat: 'static', d: 28, acidR: 0.6, desc: 'Deep red corundum gem.' },
  { k: 'sapphire', n: 'Sapphire', i: '🔵', c: [40, 90, 220], cat: 'static', d: 28, acidR: 0.6, desc: 'Brilliant blue corundum.' },
  { k: 'amethyst', n: 'Amethyst', i: '🟣', c: [150, 80, 200], cat: 'static', d: 26, acidR: 0.7, desc: 'Purple quartz crystal.' },
  { k: 'topaz', n: 'Topaz', i: '🟠', c: [250, 200, 110], cat: 'static', d: 27, acidR: 0.6, desc: 'Yellow-gold gemstone.' },
  { k: 'crystal', n: 'Crystal', i: '🔮', c: [200, 230, 255], cat: 'static', d: 26, acidR: 0.7, desc: 'Clear faceted mineral.' },

  // Devices & electronics
  { k: 'battery', n: 'Battery', i: '🔋', c: [60, 160, 80], cat: 'static', d: 30, conducts: true, expl: 4, desc: 'Stores charge; shorts can spark or explode.' },
  { k: 'circuit_board', n: 'Circuit Board', i: '🖲️', c: [30, 90, 50], cat: 'static', d: 20, conducts: true, flammable: 0.1, desc: 'Wired electronics — conducts electricity.' },
  { k: 'chip', n: 'Microchip', i: '🔲', c: [35, 35, 40], cat: 'static', d: 25, conducts: true, desc: 'Tiny silicon processor.' },
  { k: 'magnet', n: 'Magnet', i: '🧲', c: [210, 60, 60], cat: 'static', d: 40, conducts: true, desc: 'Attracts iron-rich metals.' },
  { k: 'led', n: 'LED', i: '💡', c: [255, 255, 180], cat: 'static', d: 15, conducts: true, desc: 'Glows when current passes.' },
  { k: 'antenna', n: 'Antenna', i: '📡', c: [120, 120, 130], cat: 'static', d: 25, conducts: true, desc: 'Sends and receives signals.' },
  { k: 'solar_cell', n: 'Solar Cell', i: '🔆', c: [40, 70, 140], cat: 'static', d: 18, conducts: true, desc: 'Generates spark from light.' },
  { k: 'sensor', n: 'Sensor', i: '📷', c: [40, 45, 55], cat: 'static', d: 16, conducts: true, desc: 'Detects nearby movement.' },

  // Exotic / fantasy
  { k: 'antimatter', n: 'Antimatter', i: '🟣', c: [200, 60, 255], cat: 'static', d: 9999, expl: 14, desc: 'Annihilates on contact — catastrophic blast.' },
  { k: 'plasma', n: 'Plasma', i: '🟠', c: [255, 170, 80], cat: 'gas', d: 0, oxidizer: true, life: 60, lifeVariance: 30, flammable: 0.9, desc: 'Fourth state of matter, ultra-hot.' },
  { k: 'neutronium', n: 'Neutronium', i: '⬛', c: [20, 20, 26], cat: 'static', d: 9999, acidR: 1, desc: 'Collapse of a dead star — unimaginably dense.' },
  { k: 'black_hole', n: 'Black Hole', i: '🕳️', c: [5, 5, 10], cat: 'special', d: 9999, desc: 'Consumes everything nearby. Indestructible.' },
  { k: 'star_matter', n: 'Star Matter', i: '⭐', c: [255, 210, 90], cat: 'liquid', d: 12, disp: 1, oxidizer: true, life: 80, lifeVariance: 40, desc: 'Burning plasma from a star core.' },
  { k: 'dark_matter', n: 'Dark Matter', i: '🟪', c: [60, 20, 80], cat: 'static', d: 9999, desc: 'Invisible mass that warps the chamber.' },
  { k: 'cosmic_dust', n: 'Cosmic Dust', i: '🌌', c: [120, 80, 200], cat: 'powder', d: 4, desc: 'Fine glittering interstellar grains.' },
  { k: 'nanobots', n: 'Nanobots', i: '🦾', c: [120, 220, 220], cat: 'powder', d: 8, desc: 'Self-replicating micro-machines.' },
  { k: 'reactor_fuel', n: 'Reactor Fuel', i: '☢️', c: [80, 180, 80], cat: 'static', d: 50, conducts: true, expl: 12, radioactive: { decayKey: 'uranium', chance: 0.004 }, desc: 'Concentrated fissile material.' },
  { k: 'glitter', n: 'Glitter', i: '✨', c: [255, 120, 220], cat: 'powder', d: 4, flammable: 0.4, desc: 'Shiny, hard to clean up.' },
  { k: 'rainbow', n: 'Rainbow', i: '🌈', c: [255, 120, 120], cat: 'gas', d: 1, desc: 'Whimsical swirling colours.' },
  { k: 'goo', n: 'Goo', i: '🟩', c: [90, 230, 120], cat: 'liquid', d: 4, disp: 3, desc: 'Bouncy green goo.' },
  { k: 'jelly', n: 'Jelly', i: '🟥', c: [255, 100, 130], cat: 'liquid', d: 5, disp: 2, desc: 'Wobbly translucent dessert.' },
  { k: 'ooze', n: 'Ooze', i: '🟢', c: [110, 200, 90], cat: 'liquid', d: 4, disp: 2, desc: 'Thick radioactive-looking slime.' },
];

for (const x of EXTRAS) {
  const meltToKey = x.meltTo ?? x.melt;
  const meltTo = meltToKey ? elementId(meltToKey) : undefined;
  reg({
    key: x.k,
    name: x.n,
    icon: x.i,
    color: x.c,
    category: x.cat,
    density: x.d ?? 10,
    flammable: x.flammable,
    explosionPower: x.expl,
    conducts: x.conducts ?? x.conduct,
    oxidizer: x.oxidizer ?? x.oxi,
    waterReaction: x.water,
    dissolvable: x.dissolve,
    acidResistance: x.acidR,
    dispersion: x.disp,
    defaultLife: x.life,
    lifeVariance: x.lifeVariance,
    radioactive: x.radioactive,
    meltTo,
    family: x.family,
    description: x.desc ?? `${x.n} (material).`,
  });
}

// ===========================================================================
// Convenience exports
// ===========================================================================
export const BaseId = {
  EMPTY: elementId('empty'),
  WALL: elementId('wall'),
  SAND: elementId('sand'),
  WATER: elementId('water'),
  OIL: elementId('oil'),
  ACID: elementId('acid'),
  FIRE: elementId('fire'),
  SMOKE: elementId('smoke'),
  STEAM: elementId('steam'),
  LAVA: elementId('lava'),
  WOOD: elementId('wood'),
  PLANT: elementId('plant'),
  ICE: elementId('ice'),
  STONE: elementId('stone'),
  SALT: elementId('salt'),
  VOID: elementId('void'),
  GUNPOWDER: elementId('gunpowder'),
  TNT: elementId('tnt'),
  FUSE: elementId('fuse'),
  METAL: elementId('metal'),
  MOLTEN_METAL: elementId('molten_metal'),
  GLASS: elementId('glass'),
  SNOW: elementId('snow'),
  VIRUS: elementId('virus'),
  CLONER: elementId('cloner'),
  WIRE: elementId('wire'),
  SPARK: elementId('spark'),
  HYDROGEN: elementId('hydrogen'),
} as const;

export const ERASER = getElement('empty');
export const PALETTE: ElementDef[] = ELEMENTS.filter((e) => e.id !== 0);

export const CATEGORY_LABELS: Record<SimCategory, string> = {
  empty: 'Eraser', static: 'Solids', powder: 'Powders', liquid: 'Liquids', gas: 'Gases', special: 'Special',
};
export const CATEGORY_ORDER: SimCategory[] = ['powder', 'liquid', 'gas', 'static', 'special'];
