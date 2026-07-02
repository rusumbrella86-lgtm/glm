import { BaseId, getElement, resolveDecay } from './elements';

export const GRID_WIDTH = 220;
export const GRID_HEIGHT = 130;

const {
  EMPTY, WALL, SAND, WATER, OIL, ACID, FIRE, SMOKE, STEAM, LAVA, WOOD, PLANT, ICE, STONE, SALT, VOID,
  GUNPOWDER, METAL, MOLTEN_METAL, GLASS, SNOW, VIRUS, CLONER, WIRE, SPARK, HYDROGEN,
} = BaseId;

function rand() {
  return Math.random();
}
function randInt(n: number) {
  return (Math.random() * n) | 0;
}
function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

type Dir = 'down' | 'up' | 'lateral';

export class Sandbox {
  width: number;
  height: number;
  grid: Uint8Array;
  life: Uint16Array;
  variation: Int8Array;
  aux: Uint8Array;
  stamp: Uint32Array;
  frame = 0;

  constructor(width = GRID_WIDTH, height = GRID_HEIGHT) {
    this.width = width;
    this.height = height;
    const n = width * height;
    this.grid = new Uint8Array(n);
    this.life = new Uint16Array(n);
    this.variation = new Int8Array(n);
    this.aux = new Uint8Array(n);
    this.stamp = new Uint32Array(n);
  }

  idx(x: number, y: number) {
    return y * this.width + x;
  }

  xyOf(i: number): [number, number] {
    return [i % this.width, Math.floor(i / this.width)];
  }

  inBounds(x: number, y: number) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  clear() {
    this.grid.fill(EMPTY);
    this.life.fill(0);
    this.variation.fill(0);
    this.aux.fill(0);
    this.stamp.fill(0);
  }

  addBorderWalls() {
    for (let x = 0; x < this.width; x++) {
      this.setCell(x, 0, WALL);
      this.setCell(x, this.height - 1, WALL);
    }
    for (let y = 0; y < this.height; y++) {
      this.setCell(0, y, WALL);
      this.setCell(this.width - 1, y, WALL);
    }
  }

  resetScene() {
    this.clear();
    this.addBorderWalls();
  }

  randomBurst() {
    const options = [SAND, WATER, OIL, ACID, SALT, STONE, LAVA, GUNPOWDER, SNOW, MOLTEN_METAL];
    for (let n = 0; n < 500; n++) {
      const x = 2 + randInt(this.width - 4);
      const y = 2 + randInt(Math.floor(this.height * 0.6));
      const id = options[randInt(options.length)];
      this.setCell(x, y, id);
    }
  }

  setCell(x: number, y: number, id: number) {
    if (!this.inBounds(x, y)) return;
    this.spawnAt(this.idx(x, y), id);
  }

  private spawnAt(i: number, id: number) {
    this.grid[i] = id;
    const def = getElement(id);
    this.life[i] = def.defaultLife ? def.defaultLife + randInt((def.lifeVariance ?? 0) + 1) : 0;
    this.variation[i] = randInt(17) - 8;
    if (id !== CLONER) this.aux[i] = 0;
  }

  eraseCell(x: number, y: number) {
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    this.grid[i] = EMPTY;
    this.life[i] = 0;
    this.variation[i] = 0;
    this.aux[i] = 0;
  }

  paint(cx: number, cy: number, radius: number, id: number) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (!this.inBounds(x, y)) continue;
        if (id === EMPTY) {
          this.eraseCell(x, y);
          continue;
        }
        if (rand() < 0.85) this.setCell(x, y, id);
      }
    }
  }

  paintStroke(x0: number, y0: number, x1: number, y1: number, radius: number, id: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(1, Math.max(Math.abs(dx), Math.abs(dy)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.paint(Math.round(x0 + dx * t), Math.round(y0 + dy * t), radius, id);
    }
  }

  fillRect(x0: number, y0: number, x1: number, y1: number, id: number) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.setCell(x, y, id);
      }
    }
  }

  countParticles(): number {
    let c = 0;
    for (let i = 0; i < this.grid.length; i++) {
      const id = this.grid[i];
      if (id !== EMPTY && id !== WALL) c++;
    }
    return c;
  }

  countElement(id: number): number {
    let c = 0;
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === id) c++;
    }
    return c;
  }

  countElements(ids: number[]): number {
    let c = 0;
    const set = new Set(ids);
    for (let i = 0; i < this.grid.length; i++) {
      if (set.has(this.grid[i])) c++;
    }
    return c;
  }

  private move(from: number, to: number) {
    this.grid[to] = this.grid[from];
    this.life[to] = this.life[from];
    this.variation[to] = this.variation[from];
    this.aux[to] = this.aux[from];
    this.grid[from] = EMPTY;
    this.life[from] = 0;
    this.variation[from] = 0;
    this.aux[from] = 0;
    this.stamp[to] = this.frame;
    this.stamp[from] = this.frame;
  }

  private swap(a: number, b: number) {
    const g = this.grid[a];
    this.grid[a] = this.grid[b];
    this.grid[b] = g;
    const l = this.life[a];
    this.life[a] = this.life[b];
    this.life[b] = l;
    const v = this.variation[a];
    this.variation[a] = this.variation[b];
    this.variation[b] = v;
    const u = this.aux[a];
    this.aux[a] = this.aux[b];
    this.aux[b] = u;
    this.stamp[a] = this.frame;
    this.stamp[b] = this.frame;
  }

  private canEnter(movingId: number, targetId: number, dir: Dir): 'move' | 'swap' | null {
    if (targetId === EMPTY) return 'move';
    if (targetId === WALL || targetId === VOID) return null;
    const tDef = getElement(targetId);
    if (tDef.category === 'static' || tDef.category === 'powder') return null;
    if (dir === 'lateral') return null;
    const mDensity = getElement(movingId).density;
    if (dir === 'down') return mDensity > tDef.density ? 'swap' : null;
    if (dir === 'up') return mDensity < tDef.density ? 'swap' : null;
    return null;
  }

  private neighbors4(x: number, y: number): number[] {
    const res: number[] = [];
    if (y > 0) res.push(this.idx(x, y - 1));
    if (y < this.height - 1) res.push(this.idx(x, y + 1));
    if (x > 0) res.push(this.idx(x - 1, y));
    if (x < this.width - 1) res.push(this.idx(x + 1, y));
    return res;
  }

  private neighbors8(x: number, y: number): number[] {
    const res: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) res.push(this.idx(nx, ny));
      }
    }
    return res;
  }

  private rollLife(id: number): number {
    const def = getElement(id);
    return (def.defaultLife ?? 0) + randInt((def.lifeVariance ?? 0) + 1);
  }

  step() {
    this.frame++;
    const { width, height, grid, stamp } = this;
    for (let y = height - 1; y >= 0; y--) {
      const leftToRight = ((y + this.frame) & 1) === 0;
      for (let xi = 0; xi < width; xi++) {
        const x = leftToRight ? xi : width - 1 - xi;
        const i = this.idx(x, y);
        if (stamp[i] === this.frame) continue;
        const id = grid[i];
        if (id === EMPTY) continue;
        this.updateCell(x, y, i, id);
      }
    }
  }

  private updateCell(x: number, y: number, i: number, id: number) {
    const transformed = this.applyReactions(x, y, i, id);
    if (transformed) {
      this.stamp[i] = this.frame;
      return;
    }
    const currentId = this.grid[i];
    if (currentId === EMPTY) {
      this.stamp[i] = this.frame;
      return;
    }
    const def = getElement(currentId);
    let moved = false;
    switch (def.category) {
      case 'powder':
        moved = this.updatePowder(x, y, i, currentId);
        break;
      case 'liquid':
        moved = this.updateLiquid(x, y, i, currentId);
        break;
      case 'gas':
        moved = this.updateGas(x, y, i, currentId);
        break;
      default:
        break;
    }
    if (!moved) this.stamp[i] = this.frame;
  }

  private updatePowder(x: number, y: number, i: number, id: number): boolean {
    const below = y + 1;
    if (below < this.height) {
      const bi = this.idx(x, below);
      const r = this.canEnter(id, this.grid[bi], 'down');
      if (r === 'move') {
        this.move(i, bi);
        return true;
      }
      if (r === 'swap') {
        this.swap(i, bi);
        return true;
      }
      const dir = rand() < 0.5 ? 1 : -1;
      for (const dx of [dir, -dir]) {
        const nx = x + dx;
        if (nx < 0 || nx >= this.width) continue;
        const di = this.idx(nx, below);
        const r2 = this.canEnter(id, this.grid[di], 'down');
        if (r2 === 'move') {
          this.move(i, di);
          return true;
        }
        if (r2 === 'swap') {
          this.swap(i, di);
          return true;
        }
      }
    }
    return false;
  }

  private updateLiquid(x: number, y: number, i: number, id: number): boolean {
    const below = y + 1;
    if (below < this.height) {
      const bi = this.idx(x, below);
      const r = this.canEnter(id, this.grid[bi], 'down');
      if (r === 'move') {
        this.move(i, bi);
        return true;
      }
      if (r === 'swap') {
        this.swap(i, bi);
        return true;
      }
      const dir = rand() < 0.5 ? 1 : -1;
      for (const dx of [dir, -dir]) {
        const nx = x + dx;
        if (nx < 0 || nx >= this.width) continue;
        const di = this.idx(nx, below);
        const r2 = this.canEnter(id, this.grid[di], 'down');
        if (r2 === 'move') {
          this.move(i, di);
          return true;
        }
        if (r2 === 'swap') {
          this.swap(i, di);
          return true;
        }
      }
    }
    const dispersion = getElement(id).dispersion ?? 3;
    const dir = rand() < 0.5 ? 1 : -1;
    for (const d of [dir, -dir]) {
      for (let s = 1; s <= dispersion; s++) {
        const nx = x + d * s;
        if (nx < 0 || nx >= this.width) break;
        const di = this.idx(nx, y);
        if (this.grid[di] === EMPTY) {
          this.move(i, di);
          return true;
        }
        break;
      }
    }
    return false;
  }

  private updateGas(x: number, y: number, i: number, id: number): boolean {
    const above = y - 1;
    if (above >= 0) {
      const ai = this.idx(x, above);
      const r = this.canEnter(id, this.grid[ai], 'up');
      if (r === 'move') {
        this.move(i, ai);
        return true;
      }
      if (r === 'swap') {
        this.swap(i, ai);
        return true;
      }
      const dir = rand() < 0.5 ? 1 : -1;
      for (const dx of [dir, -dir]) {
        const nx = x + dx;
        if (nx < 0 || nx >= this.width) continue;
        const di = this.idx(nx, above);
        const r2 = this.canEnter(id, this.grid[di], 'up');
        if (r2 === 'move') {
          this.move(i, di);
          return true;
        }
        if (r2 === 'swap') {
          this.swap(i, di);
          return true;
        }
      }
    }
    if (rand() < 0.5) {
      const dir = rand() < 0.5 ? 1 : -1;
      const nx = x + dir;
      if (nx >= 0 && nx < this.width) {
        const di = this.idx(nx, y);
        if (this.grid[di] === EMPTY) {
          this.move(i, di);
          return true;
        }
      }
    }
    return false;
  }

  // --- reactions ----------------------------------------------------------
  // Specials that need bespoke behaviour are handled individually; everything
  // else funnels through reactGeneric and reacts purely via its declared traits.
  private applyReactions(x: number, y: number, i: number, id: number): boolean {
    switch (id) {
      case VOID:
        return this.reactVoid(x, y, i);
      case VIRUS:
        return this.reactVirus(x, y, i);
      case CLONER:
        return this.reactCloner(x, y, i);
      case SPARK:
        return this.reactSpark(x, y, i);
      case SNOW:
        return this.reactSnow(x, y, i);
      case ICE:
        return this.reactIce(x, y, i);
      case SAND:
        return this.reactSand(x, y, i);
      case METAL:
        return this.reactMetal(x, y, i);
      case MOLTEN_METAL:
        return this.reactMoltenMetal(x, y, i);
      case FIRE:
        return this.reactFire(x, y, i);
      case LAVA:
        return this.reactLava(x, y, i);
      case WATER:
        return this.reactWater(x, y, i);
      case ACID:
        return this.reactAcid(x, y, i);
      case PLANT:
        return this.reactPlant(x, y, i);
      case SMOKE:
        return this.reactSmoke(i);
      case STEAM:
        return this.reactSteam(i);
      default:
        return this.reactGeneric(x, y, i, id);
    }
  }

  private reactFire(x: number, y: number, i: number): boolean {
    this.life[i]--;
    const neighbors = this.neighbors4(x, y);
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if (nid === WATER) {
        this.grid[i] = rand() < 0.6 ? SMOKE : EMPTY;
        this.life[i] = this.grid[i] === SMOKE ? this.rollLife(SMOKE) : 0;
        if (rand() < 0.2) {
          this.grid[ni] = STEAM;
          this.life[ni] = this.rollLife(STEAM);
        }
        return true;
      }
      const ndef = getElement(nid);
      if (ndef.explosionPower && rand() < 0.9) {
        const [nx, ny] = this.xyOf(ni);
        this.explode(nx, ny, ndef.explosionPower, 0.7 + ndef.explosionPower * 0.03);
        continue;
      }
      if (ndef.flammable) {
        if (rand() < 0.2) {
          this.grid[ni] = FIRE;
          this.life[ni] = this.rollLife(FIRE);
        }
      } else if (ndef.oxidizer && rand() < 0.6) {
        this.grid[ni] = FIRE;
        this.life[ni] = this.rollLife(FIRE);
      }
    }
    if (this.life[i] <= 0) {
      this.grid[i] = rand() < 0.5 ? SMOKE : EMPTY;
      this.life[i] = this.grid[i] === SMOKE ? this.rollLife(SMOKE) : 0;
      return true;
    }
    return false;
  }

  private reactLava(x: number, y: number, i: number): boolean {
    const neighbors = this.neighbors4(x, y);
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if (nid === WATER) {
        this.grid[ni] = STEAM;
        this.life[ni] = this.rollLife(STEAM);
        this.life[i]++;
      } else if (nid === ICE || nid === SNOW) {
        this.grid[ni] = WATER;
        this.life[ni] = 0;
      } else if (nid === METAL) {
        this.life[i]++;
      } else {
        const ndef = getElement(nid);
        if (ndef.explosionPower && rand() < 0.9) {
          const [nx, ny] = this.xyOf(ni);
          this.explode(nx, ny, ndef.explosionPower, 0.7 + ndef.explosionPower * 0.03);
        } else if (ndef.flammable && rand() < 0.35) {
          this.grid[ni] = FIRE;
          this.life[ni] = this.rollLife(FIRE);
        }
      }
    }
    if (this.life[i] >= 3) {
      this.grid[i] = STONE;
      this.life[i] = 0;
      this.variation[i] = randInt(17) - 8;
      return true;
    }
    return false;
  }

  private reactWater(x: number, y: number, i: number): boolean {
    const neighbors = this.neighbors4(x, y);
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if (nid === LAVA || nid === MOLTEN_METAL) {
        this.grid[i] = STEAM;
        this.life[i] = this.rollLife(STEAM);
        if (nid === MOLTEN_METAL) {
          this.grid[ni] = METAL;
          this.life[ni] = 0;
        }
        return true;
      }
      if (nid === FIRE && rand() < 0.9) {
        this.grid[ni] = rand() < 0.35 ? STEAM : EMPTY;
        if (this.grid[ni] === STEAM) this.life[ni] = this.rollLife(STEAM);
      }
      const ndef = getElement(nid);
      if (ndef.waterReaction === 'alkali') {
        // alkali metals react violently with water -> hydrogen + heat + flash
        if (rand() < 0.09) {
          const [nx, ny] = this.xyOf(ni);
          this.explode(nx, ny, 4, 0.55);
          const gi = this.findEmpty(x, y);
          if (gi >= 0) this.spawnAt(gi, HYDROGEN);
        }
      } else if (ndef.waterReaction === 'acid') {
        if (rand() < 0.01) {
          const gi = this.findEmptyList(neighbors);
          if (gi >= 0) this.spawnAt(gi, ACID);
        }
      } else if (ndef.waterReaction === 'dissolve' && rand() < 0.02) {
        this.grid[ni] = EMPTY;
        this.life[ni] = 0;
        this.variation[ni] = 0;
      } else if (ndef.waterReaction === 'freeze' && rand() < 0.012) {
        this.grid[ni] = ICE;
        this.life[ni] = 0;
        this.variation[ni] = randInt(17) - 8;
      } else if (ndef.waterReaction === 'corrode' && rand() < 0.003) {
        this.grid[ni] = EMPTY;
        this.life[ni] = 0;
      } else if (nid === ICE && rand() < 0.0015) {
        this.grid[i] = ICE;
        this.life[i] = 0;
        this.variation[i] = randInt(17) - 8;
        return true;
      }
    }
    return false;
  }

  private findEmpty(x: number, y: number): number {
    const empties = this.neighbors4(x, y).filter((ni) => this.grid[ni] === EMPTY);
    return empties.length ? empties[randInt(empties.length)] : -1;
  }
  private findEmptyList(list: number[]): number {
    const empties = list.filter((ni) => this.grid[ni] === EMPTY);
    return empties.length ? empties[randInt(empties.length)] : -1;
  }

  private reactAcid(x: number, y: number, i: number): boolean {
    const neighbors = this.neighbors4(x, y);
    let used = false;
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if (nid === EMPTY || nid === ACID || nid === WALL || nid === VOID) continue;
      const resistance = getElement(nid).acidResistance ?? 0;
      if (rand() < 0.12 * (1 - resistance)) {
        this.grid[ni] = EMPTY;
        this.life[ni] = 0;
        this.variation[ni] = 0;
        this.aux[ni] = 0;
        used = true;
      }
    }
    if (used) {
      this.life[i] = Math.max(0, this.life[i] - 30);
      if (this.life[i] <= 0) {
        this.grid[i] = EMPTY;
        this.life[i] = 0;
        return true;
      }
    }
    return false;
  }

  private reactPlant(x: number, y: number, i: number): boolean {
    const neighbors8 = this.neighbors8(x, y);
    let nearWater = false;
    let burn = false;
    for (const ni of neighbors8) {
      const nid = this.grid[ni];
      if (nid === WATER) nearWater = true;
      if (nid === FIRE || nid === LAVA) burn = true;
    }
    if (burn && rand() < 0.4) {
      this.grid[i] = FIRE;
      this.life[i] = this.rollLife(FIRE);
      return true;
    }
    if (nearWater && rand() < 0.01) {
      const empties = neighbors8.filter((ni) => this.grid[ni] === EMPTY);
      if (empties.length) {
        const target = empties[randInt(empties.length)];
        this.grid[target] = PLANT;
        this.life[target] = 0;
        this.variation[target] = randInt(17) - 8;
      }
    }
    return false;
  }

  private reactIce(x: number, y: number, i: number): boolean {
    const neighbors = this.neighbors4(x, y);
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if ((nid === FIRE || nid === LAVA) && rand() < 0.08) {
        this.grid[i] = WATER;
        this.life[i] = 0;
        return true;
      }
    }
    return false;
  }

  private reactSand(x: number, y: number, i: number): boolean {
    const neighbors = this.neighbors4(x, y);
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if ((nid === FIRE || nid === LAVA) && rand() < 0.02) {
        this.grid[i] = GLASS;
        this.life[i] = 0;
        this.variation[i] = randInt(17) - 8;
        return true;
      }
    }
    return false;
  }

  private reactSnow(x: number, y: number, i: number): boolean {
    const neighbors = this.neighbors4(x, y);
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if ((nid === FIRE || nid === LAVA || nid === MOLTEN_METAL) && rand() < 0.5) {
        this.grid[i] = WATER;
        this.life[i] = 0;
        return true;
      }
      if (nid === WATER && rand() < 0.01) {
        this.grid[ni] = ICE;
        this.life[ni] = 0;
        this.variation[ni] = randInt(17) - 8;
      }
    }
    return false;
  }

  // Generic trait-driven behaviour for the chemical elements & most materials.
  // Handles radioactive decay and melting near heat. Flammable ignition and
  // explosive detonation are driven by reactFire / reactLava / reactSpark.
  private reactGeneric(x: number, y: number, i: number, id: number): boolean {
    const def = getElement(id);

    if (def.radioactive) {
      if (rand() < def.radioactive.chance) {
        this.spawnAt(i, resolveDecay(def.radioactive.decayKey));
        if (rand() < 0.5) {
          const gi = this.findEmpty(x, y);
          if (gi >= 0) this.spawnAt(gi, SMOKE);
        }
        return true;
      }
    }

    if (def.meltTo !== undefined) {
      const neighbors = this.neighbors4(x, y);
      for (const ni of neighbors) {
        const nid = this.grid[ni];
        if (nid === FIRE || nid === LAVA || nid === MOLTEN_METAL || nid === STEAM) {
          if (rand() < (nid === FIRE ? 0.08 : 0.02)) {
            this.spawnAt(i, def.meltTo);
            return true;
          }
          break;
        }
      }
    }

    return false;
  }

  private reactVoid(x: number, y: number, _i: number): boolean {
    const neighbors = this.neighbors8(x, y);
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if (nid !== EMPTY && nid !== WALL && nid !== VOID && rand() < 0.9) {
        this.grid[ni] = EMPTY;
        this.life[ni] = 0;
        this.variation[ni] = 0;
        this.aux[ni] = 0;
      }
    }
    return false;
  }

  private reactSmoke(i: number): boolean {
    this.life[i]--;
    if (this.life[i] <= 0) {
      this.grid[i] = EMPTY;
      this.life[i] = 0;
      return true;
    }
    return false;
  }

  private reactSteam(i: number): boolean {
    this.life[i]--;
    if (this.life[i] <= 0) {
      this.grid[i] = rand() < 0.35 ? WATER : EMPTY;
      this.life[i] = 0;
      return true;
    }
    return false;
  }

  private reactMetal(x: number, y: number, i: number): boolean {
    const neighbors = this.neighbors4(x, y);
    let heated = false;
    for (const ni of neighbors) {
      if (this.grid[ni] === LAVA || this.grid[ni] === MOLTEN_METAL) heated = true;
    }
    if (heated) {
      this.life[i]++;
      if (this.life[i] > 30) {
        this.grid[i] = MOLTEN_METAL;
        this.life[i] = 0;
        return true;
      }
    } else if (this.life[i] > 0) {
      this.life[i]--;
    }
    return false;
  }

  private reactMoltenMetal(x: number, y: number, i: number): boolean {
    const neighbors = this.neighbors4(x, y);
    for (const ni of neighbors) {
      const nid = this.grid[ni];
      if (nid === WATER) {
        this.grid[ni] = STEAM;
        this.life[ni] = this.rollLife(STEAM);
        this.grid[i] = METAL;
        this.life[i] = 0;
        return true;
      }
      if (nid === ICE || nid === SNOW) {
        this.grid[ni] = WATER;
        this.life[ni] = 0;
      }
      const ndef = getElement(nid);
      if (ndef.flammable && rand() < 0.3) {
        this.grid[ni] = FIRE;
        this.life[ni] = this.rollLife(FIRE);
      }
    }
    this.life[i]++;
    if (this.life[i] > 200) {
      this.grid[i] = METAL;
      this.life[i] = 0;
      return true;
    }
    return false;
  }

  private reactVirus(x: number, y: number, i: number): boolean {
    const neighbors8 = this.neighbors8(x, y);
    for (const ni of neighbors8) {
      const nid = this.grid[ni];
      if (nid === FIRE || nid === LAVA) {
        this.grid[i] = rand() < 0.4 ? SMOKE : EMPTY;
        this.life[i] = this.grid[i] === SMOKE ? this.rollLife(SMOKE) : 0;
        return true;
      }
    }
    let infected = false;
    for (const ni of neighbors8) {
      const nid = this.grid[ni];
      if ((nid === PLANT || nid === WOOD) && rand() < 0.03) {
        this.grid[ni] = VIRUS;
        this.life[ni] = this.rollLife(VIRUS);
        infected = true;
      }
    }
    if (infected) {
      this.life[i] = this.rollLife(VIRUS);
    }
    this.life[i]--;
    if (this.life[i] <= 0) {
      this.grid[i] = EMPTY;
      this.life[i] = 0;
      return true;
    }
    return false;
  }

  private reactCloner(x: number, y: number, i: number): boolean {
    const neighbors8 = this.neighbors8(x, y);
    for (const ni of neighbors8) {
      const nid = this.grid[ni];
      if (nid !== EMPTY && nid !== WALL && nid !== VOID && nid !== CLONER) {
        this.aux[i] = nid;
      }
    }
    if (this.aux[i] !== EMPTY) {
      const neighbors4 = this.neighbors4(x, y);
      for (const ni of neighbors4) {
        if (this.grid[ni] === EMPTY && rand() < 0.07) {
          this.spawnAt(ni, this.aux[i]);
        }
      }
    }
    return false;
  }

  private reactSpark(x: number, y: number, i: number): boolean {
    const neighbors8 = this.neighbors8(x, y);
    for (const ni of neighbors8) {
      const nid = this.grid[ni];
      const ndef = getElement(nid);
      if (ndef.explosionPower && rand() < 0.9) {
        const [nx, ny] = this.xyOf(ni);
        this.explode(nx, ny, ndef.explosionPower, 0.7 + ndef.explosionPower * 0.03);
      } else if (ndef.flammable && rand() < 0.6) {
        this.grid[ni] = FIRE;
        this.life[ni] = this.rollLife(FIRE);
        this.stamp[ni] = this.frame;
      } else if (nid === WATER && rand() < 0.12) {
        this.grid[ni] = STEAM;
        this.life[ni] = this.rollLife(STEAM);
        this.stamp[ni] = this.frame;
      } else if (ndef.conducts && this.grid[ni] !== SPARK && this.stamp[ni] !== this.frame && rand() < 0.95) {
        // electricity travels along ANY conductive element (wire, all metals, …)
        this.grid[ni] = SPARK;
        this.life[ni] = this.rollLife(SPARK);
        this.stamp[ni] = this.frame;
      }
    }
    this.life[i]--;
    if (this.life[i] <= 0) {
      this.grid[i] = WIRE;
      this.life[i] = 0;
      return true;
    }
    return false;
  }

  explode(cx: number, cy: number, radius: number, strength: number) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (!this.inBounds(x, y)) continue;
        const i = this.idx(x, y);
        const id = this.grid[i];
        if (id === WALL || id === VOID) continue;
        const falloff = 1 - dist / radius;
        if (id !== EMPTY && rand() < strength * falloff * 0.6) {
          this.grid[i] = EMPTY;
          this.life[i] = 0;
          this.variation[i] = 0;
          this.aux[i] = 0;
        } else if (rand() < strength * falloff * 0.85) {
          this.grid[i] = FIRE;
          this.life[i] = this.rollLife(FIRE) + Math.round(falloff * 20);
          this.variation[i] = randInt(17) - 8;
        }
        this.stamp[i] = this.frame;
      }
    }
  }

  render(imageData: ImageData) {
    const data = imageData.data;
    const { grid, variation } = this;
    for (let i = 0; i < grid.length; i++) {
      const id = grid[i];
      const o = i * 4;
      if (id === EMPTY) {
        data[o] = 8;
        data[o + 1] = 10;
        data[o + 2] = 18;
        data[o + 3] = 255;
        continue;
      }
      const def = getElement(id);
      let r = def.color[0];
      let g = def.color[1];
      let b = def.color[2];
      const v = variation[i];
      r += v;
      g += v;
      b += v;
      if (id === FIRE || id === LAVA || id === MOLTEN_METAL) {
        const h = ((i * 2654435761) ^ (this.frame * 2246822519)) >>> 0;
        const boost = (h % 97) * 0.6;
        r += boost;
        g += boost * 0.45;
      }
      if (id === SPARK) {
        const h = ((i * 2654435761) ^ (this.frame * 3266489917)) >>> 0;
        const boost = h % 60;
        r += boost;
        g += boost;
      }
      data[o] = clamp255(r);
      data[o + 1] = clamp255(g);
      data[o + 2] = clamp255(b);
      data[o + 3] = 255;
    }
  }
}
