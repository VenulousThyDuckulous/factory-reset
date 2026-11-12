// First-person renderer: raycast walls, floor and ceiling casting, fog,
// flashlight cone and billboard sprites. No external assets.
import { propBlocks } from "./world.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

let canvas = null;
let ctx = null;
let scene = null;
let sctx = null;

let vw = 1, vh = 1, dpr = 1;
let RW = 320, RH = 180;
let focal = 220, horizonY = 90;
const HCAM = 0.52;
const HALF_FOV = 0.66;

let img = null, u32 = null, zBuf = null, beam = null;

let TEX = null;
let SPR = null;
let zoneId = null;
let matGrid = null, lightGrid = null, worldW = 0, worldH = 0;
let gridWorld = null, gridCooled = null;

const ZONE_TINT = {
  cwing: { wall: [104, 128, 124], floor: [82, 94, 92], ceil: [52, 60, 62] },
  spine: { wall: [96, 104, 98], floor: [74, 80, 76], ceil: [44, 50, 48] },
  assembly: { wall: [126, 116, 92], floor: [90, 86, 74], ceil: [56, 52, 42] },
  qc: { wall: [98, 132, 144], floor: [78, 96, 104], ceil: [40, 56, 62] },
  foundry: { wall: [146, 92, 64], floor: [110, 80, 62], ceil: [64, 38, 30] },
  cold: { wall: [96, 126, 152], floor: [72, 90, 108], ceil: [38, 52, 68] },
  data: { wall: [76, 136, 128], floor: [62, 86, 84], ceil: [30, 54, 54] },
  freight: { wall: [132, 116, 84], floor: [90, 86, 70], ceil: [50, 46, 34] },
  core: { wall: [148, 100, 100], floor: [98, 78, 82], ceil: [58, 38, 42] },
};

// ------------------------------------------------------------------ textures
function makeTex(size, fn) {
  const v = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) v[y * size + x] = fn(x, y);
  }
  return { n: size, v };
}

function hash2(x, y) {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function buildTextures() {
  const N = 32;
  TEX = {
    wall: makeTex(N, (x, y) => {
      const h = hash2(x, y);
      const seam = x % 8 === 0 ? 0.62 : 1;
      const bolt = (x % 8 === 3 || x % 8 === 4) && (y % 12 === 4 || y % 12 === 5) ? 1.28 : 1;
      const band = y % 16 < 1 ? 0.72 : 1;
      return (0.74 + h * 0.13) * seam * bolt * band;
    }),
    floor: makeTex(N, (x, y) => {
      const h = hash2(x * 3 + 1, y * 5 + 2);
      const crack = (x + y * 3) % 17 === 0 ? 0.72 : 1;
      const speck = h > 0.94 ? 1.2 : h < 0.06 ? 0.8 : 1;
      return (0.7 + h * 0.12) * crack * speck;
    }),
    ceil: makeTex(N, (x, y) => {
      const grid = x % 16 === 0 || y % 16 === 0 ? 0.55 : 1;
      return (0.5 + hash2(x + 9, y + 4) * 0.12) * grid;
    }),
    grate: makeTex(N, (x, y) => {
      if (x % 8 < 2 || y % 8 < 2) return 0.32;
      return 0.66 + hash2(x, y) * 0.1;
    }),
    conv: makeTex(N, (x, y) => {
      const stripe = (x + y) % 16 < 3 ? 1.12 : 1;
      return (0.72 + hash2(x, y) * 0.1) * stripe;
    }),
    water: makeTex(N, (x, y) => {
      const w = Math.sin((x + y * 2) * 0.6) * 0.06 + Math.sin(x * 0.3 - y * 0.5) * 0.05;
      return 0.52 + hash2(x, y) * 0.08 + w;
    }),
    hot: makeTex(N, (x, y) => {
      const vein = Math.abs(Math.sin(x * 0.55 + Math.sin(y * 0.4) * 2.2)) < 0.16 ? 1.7 : 0.34;
      return vein * (0.85 + hash2(x, y) * 0.35);
    }),
    door: makeTex(N, (x, y) => {
      const edge = x < 2 || x > 29 || y < 2 || y > 29 ? 0.6 : 1;
      const split = Math.abs(y - 16) < 1 ? 0.5 : 1;
      const panel = (x > 6 && x < 26) ? 1 : 0.86;
      return (0.7 + hash2(x, y) * 0.1) * edge * split * panel;
    }),
  };
}

// ------------------------------------------------------------------ sprites
function makeSprite(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  paint(g, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const out = new Uint32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    out[i] = (d[i * 4 + 3] << 24) | (d[i * 4 + 2] << 16) | (d[i * 4 + 1] << 8) | d[i * 4];
  }
  return { w, h, data: out };
}

function glow(g, x, y, r, color, alpha) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.globalAlpha = alpha;
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

function buildSprites() {
  SPR = {};
  SPR.item = makeSprite(48, 48, (g, w, h) => {
    glow(g, w / 2, h / 2, 17, "rgba(226,178,90,0.5)", 0.7);
    g.fillStyle = "#8d8578";
    g.fillRect(20, 24, 9, 12);
    g.strokeStyle = "#c8c0ae";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(24.5, 20, 6, Math.PI, 0);
    g.stroke();
    g.fillStyle = "#f2e3b4";
    g.beginPath();
    g.moveTo(17, 26);
    g.lineTo(13, 36);
    g.lineTo(37, 36);
    g.lineTo(33, 26);
    g.closePath();
    g.fill();
    g.fillStyle = "#fff8d8";
    g.fillRect(20, 28, 9, 4);
  });
  SPR.note = makeSprite(48, 48, (g, w, h) => {
    glow(g, w / 2, h / 2, 16, "rgba(230,225,200,0.35)", 0.6);
    g.fillStyle = "#c9c4b0";
    g.fillRect(15, 12, 18, 24);
    g.strokeStyle = "rgba(60,60,50,0.65)";
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(18, 17 + i * 4);
      g.lineTo(30, 17 + i * 4);
      g.stroke();
    }
  });
  SPR.shard = makeSprite(48, 48, (g, w, h) => {
    glow(g, w / 2, h / 2, 23, "rgba(127,216,204,0.75)", 1);
    g.fillStyle = "#c7f2ea";
    g.beginPath();
    g.moveTo(24, 8);
    g.lineTo(33, 24);
    g.lineTo(24, 40);
    g.lineTo(15, 24);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(200,255,250,0.7)";
    g.stroke();
  });
  SPR.save = makeSprite(48, 64, (g, w, h) => {
    g.fillStyle = "#161d1e";
    g.fillRect(8, 8, 32, 52);
    g.fillStyle = "#222c2e";
    g.fillRect(12, 12, 24, 20);
    g.fillStyle = "rgba(226,178,90,0.9)";
    g.fillRect(14, 15, 20, 3);
    g.fillRect(14, 21, 12, 2);
    glow(g, 24, 34, 18, "rgba(226,178,90,0.35)", 0.6);
    g.fillStyle = "#2b3638";
    g.fillRect(13, 38, 22, 12);
    g.fillStyle = "rgba(226,178,90,0.85)";
    g.fillRect(20, 56, 8, 2);
  });
  SPR.keypad = makeSprite(48, 48, (g) => {
    g.fillStyle = "#1a2224";
    g.fillRect(12, 10, 24, 30);
    g.fillStyle = "#0b1112";
    g.fillRect(15, 13, 18, 10);
    g.fillStyle = "rgba(201,88,74,0.9)";
    g.fillRect(17, 17, 14, 2);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      g.fillStyle = "#33403f";
      g.fillRect(15 + i * 7, 26 + j * 4, 4, 2);
    }
  });
  SPR.lever = makeSprite(48, 48, (g) => {
    g.fillStyle = "#1c2324";
    g.fillRect(14, 30, 20, 12);
    g.strokeStyle = "#9aa5a1";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(24, 32);
    g.lineTo(30, 12);
    g.stroke();
    g.fillStyle = "#c95a44";
    g.beginPath();
    g.arc(30, 12, 4, 0, TAU);
    g.fill();
  });
  SPR.valve = makeSprite(48, 48, (g) => {
    g.strokeStyle = "#7d8987";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(24, 24, 12, 0, TAU);
    g.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      g.beginPath();
      g.moveTo(24, 24);
      g.lineTo(24 + Math.cos(a) * 12, 24 + Math.sin(a) * 12);
      g.stroke();
    }
    g.fillStyle = "#7fd8cc";
    g.beginPath();
    g.arc(24, 24, 3, 0, TAU);
    g.fill();
  });
  SPR.hack = makeSprite(48, 56, (g) => {
    g.fillStyle = "#101819";
    g.fillRect(8, 10, 32, 34);
    g.fillStyle = "#08100f";
    g.fillRect(11, 13, 26, 22);
    g.fillStyle = "rgba(89,198,182,0.55)";
    for (let i = 0; i < 5; i++) g.fillRect(13, 16 + i * 4, 10 + (i % 3) * 5, 1.5);
    glow(g, 24, 26, 16, "rgba(127,216,204,0.4)", 0.5);
  });
  SPR.npc = makeSprite(48, 72, (g) => {
    g.fillStyle = "#2b3335";
    g.fillRect(16, 26, 16, 30);
    g.fillStyle = "#3a4446";
    g.beginPath();
    g.arc(24, 20, 8, 0, TAU);
    g.fill();
    g.fillStyle = "#7fd8cc";
    g.fillRect(19, 18, 10, 2);
    g.fillStyle = "#20282a";
    g.fillRect(16, 56, 6, 10);
    g.fillRect(26, 56, 6, 10);
  });
  SPR.corpse = makeSprite(48, 32, (g) => {
    g.fillStyle = "rgba(40,10,8,0.55)";
    g.beginPath();
    g.ellipse(24, 22, 16, 7, 0.3, 0, TAU);
    g.fill();
    g.fillStyle = "#3a3330";
    g.beginPath();
    g.ellipse(24, 18, 11, 9, 0.5, 0, TAU);
    g.fill();
    g.fillStyle = "#4a423d";
    g.beginPath();
    g.arc(13, 14, 5, 0, TAU);
    g.fill();
  });
  SPR.exit = makeSprite(64, 96, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(240,200,120,0.95)");
    grad.addColorStop(1, "rgba(150,70,40,0.35)");
    g.fillStyle = grad;
    g.fillRect(12, 8, 40, 80);
    g.fillStyle = "rgba(10,16,17,0.85)";
    g.fillRect(20, 20, 24, 68);
    glow(g, 32, 40, 34, "rgba(255,210,130,0.35)", 0.7);
  });
  SPR.console = makeSprite(56, 56, (g) => {
    g.fillStyle = "#151b1c";
    g.fillRect(6, 20, 44, 30);
    g.fillStyle = "#0b1213";
    g.fillRect(10, 10, 16, 14);
    g.fillRect(30, 10, 16, 14);
    g.fillStyle = "rgba(127,216,204,0.75)";
    g.fillRect(12, 13, 12, 2);
    g.fillRect(32, 13, 12, 2);
    g.fillStyle = "#2c3638";
    g.fillRect(12, 30, 32, 8);
  });
  SPR.machine = makeSprite(56, 56, (g) => {
    g.fillStyle = "#191e1e";
    g.fillRect(6, 6, 44, 44);
    g.fillStyle = "#232b2b";
    g.fillRect(11, 11, 34, 20);
    g.strokeStyle = "rgba(0,0,0,0.55)";
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(11, 34 + i * 4);
      g.lineTo(45, 34 + i * 4);
      g.stroke();
    }
  });
  SPR.gate = makeSprite(48, 64, (g) => {
    g.strokeStyle = "#5a6461";
    g.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(10 + i * 9, 4);
      g.lineTo(10 + i * 9, 60);
      g.stroke();
    }
  });

  // enemies
  SPR.sweeper = makeSprite(64, 64, (g) => {
    g.fillStyle = "#2b3234";
    g.fillRect(10, 16, 44, 34);
    g.fillStyle = "#121718";
    g.fillRect(4, 20, 6, 26);
    g.fillRect(54, 20, 6, 26);
    g.fillStyle = "#394244";
    g.fillRect(20, 8, 24, 9);
    glow(g, 32, 26, 16, "rgba(230,140,70,0.75)", 0.9);
    g.fillStyle = "#f2a25a";
    g.beginPath();
    g.arc(32, 26, 5, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(120,140,140,0.5)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(32, 8);
    g.lineTo(32, 2);
    g.stroke();
  });
  SPR.sweeperChase = makeSprite(64, 64, (g) => {
    g.fillStyle = "#2b3234";
    g.fillRect(10, 16, 44, 34);
    g.fillStyle = "#121718";
    g.fillRect(4, 20, 6, 26);
    g.fillRect(54, 20, 6, 26);
    g.fillStyle = "#394244";
    g.fillRect(20, 8, 24, 9);
    glow(g, 32, 26, 22, "rgba(240,70,50,0.85)", 1);
    g.fillStyle = "#ff6a52";
    g.beginPath();
    g.arc(32, 26, 6, 0, TAU);
    g.fill();
  });
  SPR.crawler = makeSprite(64, 40, (g) => {
    g.strokeStyle = "#5b625c";
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      g.beginPath();
      g.moveTo(32 + side * 8, 20);
      g.lineTo(32 + side * 26, 14 + i * 6);
      g.stroke();
    }
    g.fillStyle = "#343a36";
    g.beginPath();
    g.ellipse(32, 22, 13, 10, 0, 0, TAU);
    g.fill();
    g.fillStyle = "#8b9187";
    g.beginPath();
    g.arc(32, 12, 6, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(190,45,35,0.95)";
    g.fillRect(27, 10, 10, 2);
  });
  SPR.auditor = makeSprite(64, 128, (g) => {
    g.strokeStyle = "rgba(200,120,120,0.25)";
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(32, 44, 14 + i * 8, 0, TAU);
      g.stroke();
    }
    g.fillStyle = "#0d0d10";
    g.beginPath();
    g.moveTo(22, 120);
    g.lineTo(25, 34);
    g.lineTo(39, 34);
    g.lineTo(42, 120);
    g.closePath();
    g.fill();
    g.strokeStyle = "#16161a";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(24, 46);
    g.lineTo(10, 86);
    g.moveTo(40, 46);
    g.lineTo(54, 86);
    g.stroke();
    g.fillStyle = "#101014";
    g.beginPath();
    g.ellipse(32, 22, 9, 12, 0, 0, TAU);
    g.fill();
    glow(g, 32, 22, 16, "rgba(255,240,235,0.75)", 0.9);
    g.fillStyle = "#faf3ef";
    g.fillRect(27, 20, 4, 2);
    g.fillRect(34, 20, 4, 2);
  });
}

// ------------------------------------------------------------------ setup
export function initRenderer(cv) {
  canvas = cv;
  ctx = canvas.getContext("2d");
  scene = document.createElement("canvas");
  sctx = scene.getContext("2d", { alpha: false });
  if (!TEX) buildTextures();
  if (!SPR) buildSprites();
  return scene;
}

export function resizeRenderer(w, h, ratio) {
  vw = Math.max(1, Math.round(w));
  vh = Math.max(1, Math.round(h));
  dpr = ratio || 1;
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const target = coarse ? 0.62 : 0.78;
  RW = clamp(Math.round(vw * target), 280, coarse ? 560 : 760);
  RH = Math.max(140, Math.round((RW * vh) / vw));
  focal = (RW / 2) / Math.tan(HALF_FOV);
  horizonY = RH * 0.5;
  scene.width = RW;
  scene.height = RH;
  img = sctx.createImageData(RW, RH);
  u32 = new Uint32Array(img.data.buffer);
  zBuf = new Float32Array(RW);
  beam = new Float32Array(RW);
}

// ------------------------------------------------------------------ zone data
function prepareZone(game) {
  const w = game.world.w, h = game.world.h;
  if (gridWorld === game.world && gridCooled === !!game.state.flags.foundry_cooled) return;
  gridWorld = game.world;
  gridCooled = !!game.state.flags.foundry_cooled;
  worldW = w;
  worldH = h;
  matGrid = new Uint8Array(w * h);
  lightGrid = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = game.world.tiles[y][x];
      let m = 1;
      if (ch === "#") m = 0;
      else if (ch === ",") m = 2;
      else if (ch === "=") m = 3;
      else if (ch === "~") m = 4;
      else if (ch === "^") m = gridCooled ? 1 : 5;
      matGrid[y * w + x] = m;
    }
  }
  for (const L of game.world.lights) {
    const r = Math.max(1, L.r);
    const R = Math.ceil(r);
    for (let j = -R; j <= R; j++) {
      for (let i = -R; i <= R; i++) {
        const x = Math.round(L.x) + i, y = Math.round(L.y) + j;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const d = Math.hypot(x + 0.5 - (L.x + 0.5), y + 0.5 - (L.y + 0.5));
        if (d > r) continue;
        const v = Math.round(255 * clamp(1 - d / r, 0, 1) ** 1.4);
        const idx = y * w + x;
        if (v > lightGrid[idx]) lightGrid[idx] = v;
      }
    }
  }
}

function tint(zone, key) {
  const t = ZONE_TINT[zone] || ZONE_TINT.cwing;
  return t[key] || t.wall;
}

function sampleTex(t, tx, ty) {
  return t.v[(ty & (t.n - 1)) * t.n + (tx & (t.n - 1))];
}

// ------------------------------------------------------------------ helpers
function castRay(world, state, px, py, rx, ry, maxDist) {
  let mapX = Math.floor(px), mapY = Math.floor(py);
  const deltaX = Math.abs(1 / (rx || 1e-9));
  const deltaY = Math.abs(1 / (ry || 1e-9));
  const stepX = rx < 0 ? -1 : 1;
  const stepY = ry < 0 ? -1 : 1;
  let sideX = rx < 0 ? (px - mapX) * deltaX : (mapX + 1 - px) * deltaX;
  let sideY = ry < 0 ? (py - mapY) * deltaY : (mapY + 1 - py) * deltaY;
  let side = 0;
  let dist = 0;
  for (let i = 0; i < 220; i++) {
    if (sideX < sideY) {
      dist = sideX;
      sideX += deltaX;
      mapX += stepX;
      side = 0;
    } else {
      dist = sideY;
      sideY += deltaY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapY < 0 || mapX >= world.w || mapY >= world.h) return { dist: maxDist, mat: 0, side, wallX: 0, mapX, mapY };
    const p = world.propAt.get(mapY * world.w + mapX);
    const solidProp = p && p.type !== "exit" && propBlocks(p, state);
    const wall = world.tiles[mapY][mapX] === "#";
    if (wall || solidProp) {
      let wallX = side === 0 ? py + dist * ry : px + dist * rx;
      wallX -= Math.floor(wallX);
      return { dist: Math.max(0.0001, dist), mat: wall ? 0 : 6, side, wallX, mapX, mapY };
    }
    if (dist > maxDist) break;
  }
  return { dist: maxDist, mat: 0, side, wallX: 0, mapX, mapY };
}

// ------------------------------------------------------------------ main draw
export function draw(game) {
  if (!img || !game.world || !game.player) return;
  prepareZone(game);

  const p = game.player;
  const st = game.state;
  const zone = st.zone;
  const px = p.x, py = p.y;
  const ang = p.dir;
  const dirX = Math.cos(ang), dirY = Math.sin(ang);
  const planeLen = Math.tan(HALF_FOV);
  const planeX = -dirY * planeLen, planeY = dirX * planeLen;

  const darkness = clamp(game.lightLevel == null ? 0.86 : game.lightLevel, 0, 1);
  const lampOn = !!(st.lamp && st.battery > 0 && st.hasLamp);
  const lampPow = lampOn ? clamp(0.55 + st.battery / 220, 0.5, 1.05) : 0;
  const ambient = 1.62 * (1 - darkness) + 0.16;

  // camera bob + shake
  const bob = Math.sin(p.bob * 0.5) * (p.boosting ? 2.6 : 1.7);
  const shake = game.shake > 0 ? game.shake : 0;
  const shx = shake ? (Math.random() - 0.5) * shake * 1.4 : 0;
  const shy = shake ? (Math.random() - 0.5) * shake : 0;
  const horizon = horizonY + bob + shy;

  // flashlight strength per screen column
  for (let i = 0; i < RW; i++) {
    const t = (i - RW / 2) / (RW / 2);
    const cone = clamp(1 - Math.abs(t) * 1.28, 0, 1);
    beam[i] = cone * cone * (0.75 + 0.25 * cone);
  }

  // ---------------- floor + ceiling ----------------
  const vLeftX = dirX - planeX, vLeftY = dirY - planeY;
  const vRightX = dirX + planeX, vRightY = dirY + planeY;
  const floorT = TEX.floor, ceilT = TEX.ceil;
  const fTint = tint(zone, "floor"), cTint = tint(zone, "ceil");
  const waterT = TEX.water, hotT = TEX.hot, grateT = TEX.grate, convT = TEX.conv;

  for (let y = 0; y < RH; y++) {
    const isFloor = y > horizon;
    const dy = isFloor ? y - horizon : horizon - y;
    if (dy < 0.6) {
      const rowStart = y * RW;
      for (let x = 0; x < RW; x++) u32[rowStart + x] = 0xff000000 | (6 << 16) | (7 << 8) | 9;
      continue;
    }
    const posZ = isFloor ? HCAM : 1 - HCAM;
    const rowDist = (posZ * focal) / dy;
    const stepX = (rowDist * (vRightX - vLeftX)) / RW;
    const stepY = (rowDist * (vRightY - vLeftY)) / RW;
    let fx = px + rowDist * vLeftX;
    let fy = py + rowDist * vLeftY;

    const fog = 1 / (1 + rowDist * rowDist * 0.042 + rowDist * 0.07);
    const ambRow = ambient * fog;
    const carry = lampOn ? 0.22 * lampPow * clamp(1 - rowDist / 6, 0, 1) : 0;
    const base = isFloor ? fTint : cTint;
    const rowStart = y * RW;

    for (let x = 0; x < RW; x++) {
      const ix = fx | 0, iy = fy | 0;
      let v = 0.55;
      let tr = base[0], tg = base[1], tb = base[2];
      if (ix >= 0 && iy >= 0 && ix < worldW && iy < worldH) {
        const mi = matGrid[iy * worldW + ix];
        if (mi === 2) v = sampleTex(grateT, (fx * 32) | 0, (fy * 32) | 0);
        else if (mi === 3) {
          v = sampleTex(convT, (fx * 32) | 0, (fy * 32) | 0);
          tr = base[0] * 1.05; tg = base[1] * 0.95; tb = base[2] * 0.72;
        } else if (mi === 4) {
          v = sampleTex(waterT, (fx * 26) | 0, (fy * 26) | 0);
          tr = 52; tg = 96; tb = 118;
        } else if (mi === 5) {
          v = sampleTex(hotT, (fx * 32) | 0, (fy * 32) | 0);
          tr = 212; tg = 78; tb = 34;
        } else {
          v = sampleTex(isFloor ? floorT : ceilT, (fx * 32) | 0, (fy * 32) | 0);
          if (mi === 0 && !isFloor) v *= 0.5;
        }
        const lg = lightGrid[iy * worldW + ix] / 255;
        const beamTerm = lampOn && isFloor ? beam[x] * lampPow * fog * 2.7 : (lampOn ? beam[x] * lampPow * fog * 0.5 : 0);
        let bright = ambRow + lg * 1.3 * fog + beamTerm + carry;
        if (mi === 5) bright = Math.max(bright, 0.55 + Math.sin(game.time * 2 + ix + iy) * 0.06);
        bright = clamp(bright, 0.02, 1.35);
        const r = (tr * v * bright) | 0;
        const g2 = (tg * v * bright) | 0;
        const b2 = (tb * v * bright) | 0;
        u32[rowStart + x] = 0xff000000 | (clamp(b2, 0, 255) << 16) | (clamp(g2, 0, 255) << 8) | clamp(r, 0, 255);
      } else {
        u32[rowStart + x] = 0xff000000;
      }
      fx += stepX;
      fy += stepY;
    }
  }

  // ---------------- walls ----------------
  const wallT = TEX.wall, doorT = TEX.door;
  const wTint = tint(zone, "wall");
  for (let x = 0; x < RW; x++) {
    const camX = (2 * x) / RW - 1;
    const rx = dirX + planeX * camX;
    const ry = dirY + planeY * camX;
    const hit = castRay(game.world, st, px, py, rx, ry, 22);
    zBuf[x] = hit.dist;
    const lineH = focal / hit.dist;
    const top = horizon - (1 - HCAM) * lineH;
    const bottom = horizon + HCAM * lineH;
    const texQ = hit.mat === 6 ? doorT : wallT;
    const tintQ = hit.mat === 6 ? [116, 128, 126] : wTint;

    let lx = hit.mapX, ly = hit.mapY;
    lx = clamp(lx, 0, worldW - 1);
    ly = clamp(ly, 0, worldH - 1);
    const lg = lightGrid[ly * worldW + lx] / 255;
    const fog = 1 / (1 + hit.dist * hit.dist * 0.04 + hit.dist * 0.06);
    const sideShade = hit.side === 1 ? 0.76 : 1;
    const beamTerm = lampOn ? beam[x] * lampPow * fog * 2.45 : 0;
    const bright = clamp((ambient * fog + lg * 1.28 * fog + beamTerm) * sideShade, 0.03, 1.35);

    const y0 = Math.max(0, Math.ceil(top));
    const y1 = Math.min(RH - 1, Math.floor(bottom));
    const texX = (hit.wallX * 32) | 0;
    const step = 32 / lineH;
    let texPos = (y0 - top) * step;
    const rr = tintQ[0], gg = tintQ[1], bb = tintQ[2];
    for (let y = y0; y <= y1; y++) {
      const ty = texPos & 31;
      texPos += step;
      const v = sampleTex(texQ, texX, ty);
      const b = clamp(v * bright, 0, 1.3);
      const idx = y * RW + x;
      u32[idx] = 0xff000000 | (clamp((bb * b) | 0, 0, 255) << 16) | (clamp((gg * b) | 0, 0, 255) << 8) | clamp((rr * b) | 0, 0, 255);
    }
  }

  // ---------------- sprites ----------------
  const list = [];
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const pushSprite = (worldX, worldY, tex, wUnits, hUnits, baseY) => {
    const dx = worldX - px, dy = worldY - py;
    const camY = invDet * (dirY * dx - dirX * dy);
    const camZ = invDet * (-planeY * dx + planeX * dy);
    if (camZ < 0.22 || camZ > 20) return;
    list.push({ camY, camZ, tex, wUnits, hUnits, baseY });
  };

  for (const pr of game.world.props) {
    if (st.taken[pr.key] && (pr.type === "item" || pr.type === "note" || pr.type === "shard" || pr.type === "corpse")) continue;
    if (pr.type === "door") continue;
    if (pr.type === "gate") {
      if (!st.flags[pr.flag]) continue;
    }
    if (pr.type === "keypad" && pr.solid && !st.flags[pr.flag]) continue;
    let tex = SPR.item;
    let wU = 0.42, hU = 0.42, baseY = 0;
    switch (pr.type) {
      case "note": tex = SPR.note; wU = 0.34; hU = 0.34; break;
      case "shard": tex = SPR.shard; wU = 0.5; hU = 0.5; baseY = 0.35 + Math.sin(game.time * 1.6 + pr.x) * 0.06; break;
      case "save": tex = SPR.save; wU = 0.62; hU = 0.9; break;
      case "item": tex = SPR.item; wU = 0.3; hU = 0.3; break;
      case "keypad": tex = SPR.keypad; wU = 0.5; hU = 0.6; break;
      case "lever": tex = SPR.lever; wU = 0.5; hU = 0.6; break;
      case "valve": tex = SPR.valve; wU = 0.5; hU = 0.5; break;
      case "hack": tex = SPR.hack; wU = 0.58; hU = 0.7; break;
      case "npc": tex = SPR.npc; wU = 0.62; hU = 1.05; break;
      case "corpse": tex = SPR.corpse; wU = 0.85; hU = 0.5; break;
      case "exit": tex = SPR.exit; wU = 1.0; hU = 1.5; break;
      case "console": tex = SPR.console; wU = 0.8; hU = 0.9; break;
      case "machine": tex = SPR.machine; wU = 0.85; hU = 0.95; break;
      case "gate": tex = SPR.gate; wU = 0.9; hU = 1.1; break;
      default: break;
    }
    pushSprite(pr.x + 0.5, pr.y + 0.5, tex, wU, hU, baseY);
  }

  for (const e of game.enemies) {
    let tex = SPR.sweeper;
    let wU = 0.95, hU = 0.95;
    if (e.kind === "crawler") { tex = SPR.crawler; wU = 1.05; hU = 0.6; }
    else if (e.kind === "sweeper") { tex = e.state === "chase" ? SPR.sweeperChase : SPR.sweeper; }
    else if (e.kind === "auditor") { tex = SPR.auditor; wU = 0.9; hU = 1.95; }
    pushSprite(e.x, e.y, tex, wU, hU, 0);
  }

  list.sort((a, b) => b.camZ - a.camZ);

  for (const s of list) {
    const screenX = (RW / 2) * (1 + s.camY / s.camZ);
    const w = (focal * s.wUnits) / s.camZ;
    const h = (focal * s.hUnits) / s.camZ;
    const floorY = horizon + (focal * HCAM) / s.camZ;
    const x0 = Math.round(screenX - w / 2);
    const y0 = Math.round(floorY - h - (s.baseY * focal) / s.camZ);
    const fog = 1 / (1 + s.camZ * s.camZ * 0.04 + s.camZ * 0.06);
    const col = clamp(Math.round(screenX), 0, RW - 1);
    const lg = lightGrid[clamp(Math.floor(py + (s.camZ * Math.sin(ang))), 0, worldH - 1) * worldW + clamp(Math.floor(px + (s.camZ * Math.cos(ang))), 0, worldW - 1)] / 255;
    const beamTerm = lampOn ? beam[col] * lampPow * fog * 2.0 : 0;
    const bright = clamp(ambient * fog + lg * 1.1 * fog + beamTerm + 0.12, 0.13, 1.4);
    blitSprite(s.tex, x0, y0, Math.round(w), Math.round(h), s.camZ, bright);
  }

  // ---------------- present ----------------
  sctx.putImageData(img, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, vw, vh);
  ctx.drawImage(scene, shx, shy, vw, vh);

  // beam haze
  if (lampOn) {
    const cxp = vw / 2 + shx, cyp = vh * 0.52 + shy;
    const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, Math.max(vw, vh) * 0.5);
    g.addColorStop(0, "rgba(255,226,166,0.07)");
    g.addColorStop(0.45, "rgba(255,220,160,0.035)");
    g.addColorStop(1, "rgba(255,220,160,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    ctx.restore();
  }

  // crosshair / reticle
  const cx2 = vw / 2, cy2 = vh / 2;
  ctx.strokeStyle = "rgba(207,214,211,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx2 - 7, cy2);
  ctx.lineTo(cx2 - 2, cy2);
  ctx.moveTo(cx2 + 2, cy2);
  ctx.lineTo(cx2 + 7, cy2);
  ctx.moveTo(cx2, cy2 - 7);
  ctx.lineTo(cx2, cy2 - 2);
  ctx.moveTo(cx2, cy2 + 2);
  ctx.lineTo(cx2, cy2 + 7);
  ctx.stroke();
  if (game.nearProp) {
    ctx.strokeStyle = "rgba(226,178,90,0.55)";
    ctx.beginPath();
    ctx.arc(cx2, cy2, 13, 0, TAU);
    ctx.stroke();
  }

  // hurt vignette
  if (game.hurtFlash > 0) {
    const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.18, vw / 2, vh / 2, vh * 0.8);
    g.addColorStop(0, "rgba(170,30,22,0)");
    g.addColorStop(1, `rgba(170,30,22,${Math.min(0.65, game.hurtFlash * 0.55)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
  }

  // the auditor distorts the room
  if (game.auditorDist > 0 && game.auditorDist < 9) {
    const a = (9 - game.auditorDist) / 9;
    ctx.fillStyle = `rgba(120,20,30,${a * 0.07})`;
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = `rgba(190,130,130,${a * 0.12})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const yy = (game.time * 47 + i * 131) % vh;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(vw, yy + Math.sin(game.time * 3 + i) * 9);
      ctx.stroke();
    }
  }
}

function blitSprite(sp, sx, sy, w, h, dist, bright) {
  if (w < 1 || h < 1) return;
  const x0 = Math.max(0, sx), x1 = Math.min(RW - 1, sx + w - 1);
  const y0 = Math.max(0, sy), y1 = Math.min(RH - 1, sy + h - 1);
  if (x1 < x0 || y1 < y0) return;
  const invW = sp.w / w, invH = sp.h / h;
  const b = bright;
  for (let x = x0; x <= x1; x++) {
    if (zBuf[x] <= dist) continue;
    const tx = clamp(((x - sx) * invW) | 0, 0, sp.w - 1);
    for (let y = y0; y <= y1; y++) {
      const ty = clamp(((y - sy) * invH) | 0, 0, sp.h - 1);
      const pxl = sp.data[ty * sp.w + tx];
      const a = (pxl >>> 24) & 255;
      if (a < 10) continue;
      const sr = clamp((pxl & 255) * b, 0, 255) | 0;
      const sg = clamp(((pxl >> 8) & 255) * b, 0, 255) | 0;
      const sb = clamp(((pxl >> 16) & 255) * b, 0, 255) | 0;
      const idx = y * RW + x;
      if (a >= 244) {
        u32[idx] = 0xff000000 | (sb << 16) | (sg << 8) | sr;
      } else {
        const q = u32[idx];
        const ia = 255 - a;
        const rr = ((sr * a + (q & 255) * ia) / 255) | 0;
        const gg = ((sg * a + ((q >> 8) & 255) * ia) / 255) | 0;
        const bb = ((sb * a + ((q >> 16) & 255) * ia) / 255) | 0;
        u32[idx] = 0xff000000 | (bb << 16) | (gg << 8) | rr;
      }
    }
  }
}
