// Tile map construction and queries.
export const WALL = "#";
export const FLOOR = ".";
export const GRATE = ",";
export const CONV = "=";
export const HOT = "^";
export const COOL = "~";

const FLOOR_CHARS = new Set([FLOOR, GRATE, CONV, HOT, COOL]);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class MapBuilder {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.grid = Array.from({ length: h }, () => Array(w).fill(WALL));
    this.props = {};
    this.enemies = [];
    this.lights = [];
    this.rooms = [];
    this.start = { x: 2, y: 2 };
  }
  set(x, y, ch) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.grid[y][x] = ch;
    return this;
  }
  fill(x, y, w, h, ch = FLOOR) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch);
    return this;
  }
  // outer box with walls; interior carved
  room(x, y, w, h, opts = {}) {
    this.fill(x + 1, y + 1, w - 2, h - 2, opts.tile || FLOOR);
    if (opts.name) this.rooms.push({ name: opts.name, x, y, w, h });
    return this;
  }
  // open area, border included
  rect(x, y, w, h, ch = FLOOR) {
    this.fill(x, y, w, h, ch);
    return this;
  }
  wall(x, y, w, h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, WALL);
    return this;
  }
  // one-tile corridor through a list of points, L-shaped between each pair
  hall(points, ch = FLOOR) {
    for (let k = 0; k < points.length - 1; k++) {
      let [x0, y0] = points[k];
      const [x1, y1] = points[k + 1];
      const stepX = Math.sign(x1 - x0);
      while (x0 !== x1) { this.set(x0, y0, ch); x0 += stepX; }
      const stepY = Math.sign(y1 - y0);
      while (y0 !== y1) { this.set(x0, y0, ch); y0 += stepY; }
      this.set(x1, y1, ch);
    }
    return this;
  }
  prop(char, x, y, def) {
    if (this.props[char]) throw new Error("Duplicate prop char " + char);
    this.set(x, y, FLOOR);
    this.props[char] = Object.assign({}, def, { x, y });
    return this;
  }
  player(x, y) {
    this.start = { x, y };
    this.set(x, y, FLOOR);
    return this;
  }
  enemy(kind, x, y, opts = {}) {
    this.enemies.push(Object.assign({ kind, x, y }, opts));
    return this;
  }
  light(x, y, r, color) {
    this.lights.push({ x, y, r, color: color || "#c8d8e8" });
    return this;
  }
  build() {
    return {
      map: this.grid.map((r) => r.join("")),
      props: this.props,
      enemies: this.enemies,
      lights: this.lights,
      rooms: this.rooms,
      start: this.start,
    };
  }
}

export function parseZone(def) {
  const w = Math.max(...def.map.map((r) => r.length));
  const h = def.map.length;
  const tiles = def.map.map((r) => r.padEnd(w, WALL).split(""));
  const props = [];
  const propAt = new Map();
  for (const [ch, d] of Object.entries(def.props || {})) {
    const p = Object.assign({}, d, { char: ch, key: def.id + ":" + ch });
    if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) throw new Error(`Prop ${ch} out of bounds in ${def.id}`);
    if (!FLOOR_CHARS.has(tiles[p.y][p.x])) throw new Error(`Prop ${ch} (${p.type}) in ${def.id} is on a wall at ${p.x},${p.y}`);
    // props never sit on the same tile
    const idx = p.y * w + p.x;
    if (propAt.has(idx)) console.warn(`Overlapping props in ${def.id} at ${p.x},${p.y}`);
    props.push(p);
    propAt.set(idx, p);
  }
  const start = def.start || { x: 2, y: 2 };
  return { def, w, h, tiles, props, propAt, lights: def.lights || [], rooms: def.rooms || [], enemies: def.enemies || [], start };
}

export function tileAt(world, x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= world.w || iy >= world.h) return WALL;
  return world.tiles[iy][ix];
}

export function doorClosed(p, state) {
  return p.type === "door" && !state.doors[p.key];
}

export function propBlocks(p, state) {
  if (!p) return false;
  if (p.type === "door") return !state.doors[p.key];
  if (p.type === "gate") return !state.flags[p.flag];
  if (p.type === "keypad" && p.solid) return !state.flags[p.flag];
  return false;
}

export function isWalkable(world, x, y, state) {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= world.w || iy >= world.h) return false;
  if (!FLOOR_CHARS.has(world.tiles[iy][ix])) return false;
  const p = world.propAt.get(iy * world.w + ix);
  if (p && propBlocks(p, state)) return false;
  return true;
}

export function blocksSight(world, x, y, state) {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= world.w || iy >= world.h) return true;
  if (!FLOOR_CHARS.has(world.tiles[iy][ix])) return true;
  const p = world.propAt.get(iy * world.w + ix);
  if (p && doorClosed(p, state)) return true;
  return false;
}

export function hasLOS(world, x0, y0, x1, y1, state, maxDist = 40) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist > maxDist) return false;
  const steps = Math.ceil(dist * 5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSight(world, x0 + dx * t, y0 + dy * t, state)) return false;
  }
  return true;
}

export function findPath(world, sx, sy, tx, ty, state, limit = 6000) {
  const w = world.w;
  const sxi = Math.floor(sx), syi = Math.floor(sy);
  let txi = Math.floor(tx), tyi = Math.floor(ty);
  if (!isWalkable(world, txi + 0.5, tyi + 0.5, state)) {
    // pick nearest walkable neighbour of the target
    let best = null, bestD = Infinity;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      const nx = txi + i, ny = tyi + j;
      if (!isWalkable(world, nx + 0.5, ny + 0.5, state)) continue;
      const d = Math.abs(i) + Math.abs(j);
      if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
    }
    if (!best) return null;
    txi = best.x; tyi = best.y;
  }
  const si = syi * w + sxi, ti = tyi * w + txi;
  if (si === ti) return [];
  const open = [si];
  const g = new Map([[si, 0]]);
  const came = new Map();
  const closed = new Set();
  let iter = 0;
  while (open.length && iter++ < limit) {
    let bi = 0, bf = Infinity;
    for (let i = 0; i < open.length; i++) {
      const n = open[i];
      const nx = n % w, ny = (n - nx) / w;
      const f = g.get(n) + Math.abs(nx - txi) + Math.abs(ny - tyi);
      if (f < bf) { bf = f; bi = i; }
    }
    const cur = open.splice(bi, 1)[0];
    if (cur === ti) {
      const path = [];
      let c = cur;
      while (c !== si) {
        const cx = c % w;
        path.push({ x: cx + 0.5, y: (c - cx) / w + 0.5 });
        c = came.get(c);
      }
      path.reverse();
      return path;
    }
    closed.add(cur);
    const cx = cur % w, cy = (cur - cx) / w;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= world.h) continue;
      if (!isWalkable(world, nx + 0.5, ny + 0.5, state)) continue;
      const ni = ny * w + nx;
      if (closed.has(ni)) continue;
      const tentative = g.get(cur) + 1;
      if (tentative < (g.get(ni) ?? Infinity)) {
        g.set(ni, tentative);
        came.set(ni, cur);
        if (!open.includes(ni)) open.push(ni);
      }
    }
    if (open.length > 900) break;
  }
  return null;
}

export function randomWalkable(world, state, cx, cy, minR, maxR, rng = Math.random) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const a = rng() * Math.PI * 2;
    const r = minR + rng() * (maxR - minR);
    const x = Math.floor(cx + Math.cos(a) * r);
    const y = Math.floor(cy + Math.sin(a) * r);
    if (isWalkable(world, x + 0.5, y + 0.5, state)) return { x: x + 0.5, y: y + 0.5 };
  }
  return null;
}

export function nearestWalkable(world, state, x, y, radius = 6) {
  for (let r = 0; r <= radius; r++) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (Math.abs(i) !== r && Math.abs(j) !== r) continue;
      const nx = Math.floor(x) + i, ny = Math.floor(y) + j;
      if (isWalkable(world, nx + 0.5, ny + 0.5, state)) return { x: nx + 0.5, y: ny + 0.5 };
    }
  }
  return null;
}
