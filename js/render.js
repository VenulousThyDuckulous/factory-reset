// Canvas renderer: tiles, props, actors, flashlight cone and atmosphere.
let lightCanvas = null;
let lctx = null;
let vw = 0, vh = 0, dpr = 1;

export function initRenderer(canvas) {
  lightCanvas = document.createElement("canvas");
  lctx = lightCanvas.getContext("2d");
  return lightCanvas;
}

export function resizeRenderer(w, h, ratio) {
  vw = w; vh = h; dpr = ratio;
  if (!lightCanvas) return;
  lightCanvas.width = Math.max(1, Math.floor(w * ratio));
  lightCanvas.height = Math.max(1, Math.floor(h * ratio));
}

function hash(x, y) {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

const PALETTES = {
  cwing: { floor: "#38413f", floor2: "#3e4846", wall: "#111718", wallTop: "#4d5c59", accent: "#8fbdb3" },
  maintenance: { floor: "#343b38", floor2: "#3a423f", wall: "#0f1415", wallTop: "#4a5350", accent: "#b89c5e" },
  assembly: { floor: "#3a3b35", floor2: "#41433c", wall: "#11140f", wallTop: "#53564a", accent: "#e6b158" },
  qc: { floor: "#334045", floor2: "#39474d", wall: "#0e1518", wallTop: "#4a5f66", accent: "#9fdcf0" },
  foundry: { floor: "#3f312b", floor2: "#463730", wall: "#140c0b", wallTop: "#5c3d32", accent: "#f0783c" },
  cold: { floor: "#2c3944", floor2: "#35434f", wall: "#0b1218", wallTop: "#405764", accent: "#a9d8f4" },
  data: { floor: "#2a3939", floor2: "#314242", wall: "#0a1213", wallTop: "#3a5757", accent: "#7fe8d8" },
  freight: { floor: "#38362d", floor2: "#403e33", wall: "#0e0e0b", wallTop: "#524f40", accent: "#f0cd74" },
  core: { floor: "#3a2f34", floor2: "#42363b", wall: "#0d0a0b", wallTop: "#59444c", accent: "#ffc0c0" },
};

function paletteFor(game) {
  return Object.assign({}, PALETTES[game.state.zone] || PALETTES.cwing, game.zoneDef.palette || {});
}

function tileColor(pal, ch, x, y) {
  if (ch === "#") return null;
  const n = hash(x, y);
  if (ch === "~") return n > 0.5 ? "#16232c" : "#182831";
  if (ch === "=") return n > 0.5 ? "#22241f" : "#1e211d";
  if (ch === "^") return "#2a1512";
  if (ch === ",") return n > 0.5 ? "#1d2323" : "#1a2020";
  return n > 0.72 ? pal.floor2 : pal.floor;
}

export function draw(game) {
  const canvas = game.canvas;
  const ctx = game.ctx;
  const TS = game.tileSize;
  const pal = paletteFor(game);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#040506";
  ctx.fillRect(0, 0, vw, vh);

  const shake = game.shake > 0 ? game.shake : 0;
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;

  const camX = game.cam.x, camY = game.cam.y;
  const ox = vw / 2 - camX * TS + sx;
  const oy = vh / 2 - camY * TS + sy;
  const wx = (x) => ox + x * TS;
  const wy = (y) => oy + y * TS;

  const x0 = Math.max(0, Math.floor(camX - vw / (2 * TS)) - 1);
  const x1 = Math.min(game.world.w - 1, Math.ceil(camX + vw / (2 * TS)) + 1);
  const y0 = Math.max(0, Math.floor(camY - vh / (2 * TS)) - 1);
  const y1 = Math.min(game.world.h - 1, Math.ceil(camY + vh / (2 * TS)) + 1);

  // ---------- floor ----------
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ch = game.world.tiles[y][x];
      if (ch === "#") continue;
      let col = tileColor(pal, ch, x, y);
      if (ch === "^" && !game.isHot(x + 0.5, y + 0.5)) col = hash(x, y) > 0.6 ? "#201c1a" : "#1b1816";
      const px = wx(x), py = wy(y);
      ctx.fillStyle = col;
      ctx.fillRect(px, py, TS + 0.6, TS + 0.6);
      const n = hash(x * 3 + 1, y * 7 + 2);
      if (ch === "." || ch === ",") {
        if (n > 0.86) {
          ctx.fillStyle = "rgba(0,0,0,.22)";
          ctx.beginPath();
          ctx.ellipse(px + TS * (0.2 + n * 0.5), py + TS * (0.3 + n * 0.4), TS * 0.2, TS * 0.13, n * 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (n < 0.1) {
          ctx.fillStyle = "rgba(255,255,255,.03)";
          ctx.fillRect(px + TS * 0.2, py + TS * 0.7, TS * 0.4, 1);
        }
      }
      if (ch === ",") {
        ctx.strokeStyle = "rgba(0,0,0,.5)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(px, py + (TS / 4) * i);
          ctx.lineTo(px + TS, py + (TS / 4) * i);
          ctx.stroke();
        }
      }
      if (ch === "=") {
        const off = (game.time * 26) % (TS * 0.5);
        ctx.strokeStyle = "rgba(0,0,0,.42)";
        ctx.lineWidth = Math.max(1, TS * 0.06);
        for (let i = -1; i < 4; i++) {
          const bx = px + i * TS * 0.5 + off;
          ctx.beginPath();
          ctx.moveTo(bx, py);
          ctx.lineTo(bx + TS * 0.24, py + TS);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(226,178,90,.05)";
        ctx.fillRect(px, py, TS, 2);
      }
      if (ch === "~") {
        const wob = Math.sin(game.time * 1.2 + x * 0.7 + y * 0.3) * 1.4;
        ctx.fillStyle = "rgba(127,190,216,.08)";
        ctx.fillRect(px, py + TS * 0.4 + wob, TS, 2);
        ctx.fillStyle = "rgba(127,190,216,.05)";
        ctx.fillRect(px, py + TS * 0.75 - wob, TS, 1);
      }
      if (ch === "^" && game.isHot(x + 0.5, y + 0.5)) {
        const pulse = 0.5 + 0.5 * Math.sin(game.time * 2 + x + y);
        ctx.fillStyle = `rgba(216,74,38,${0.05 + pulse * 0.06})`;
        ctx.fillRect(px, py, TS, TS);
        if (hash(x, y) > 0.55) {
          ctx.fillStyle = "rgba(255,140,60,.4)";
          ctx.fillRect(px + TS * 0.3, py + TS * (0.3 + pulse * 0.4), 2, 2);
        }
      }
    }
  }

  // ---------- walls ----------
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (game.world.tiles[y][x] !== "#") continue;
      const px = wx(x), py = wy(y);
      const n = hash(x, y);
      ctx.fillStyle = n > 0.5 ? pal.wall : "#0a0d0e";
      ctx.fillRect(px, py, TS + 0.6, TS + 0.6);
      // top face highlight if floor below
      const below = y + 1 < game.world.h ? game.world.tiles[y + 1][x] : "#";
      if (below !== "#") {
        ctx.fillStyle = pal.wallTop;
        ctx.fillRect(px, py + TS - Math.max(2, TS * 0.1), TS + 0.6, Math.max(2, TS * 0.1));
      }
      if (n > 0.93) {
        ctx.fillStyle = "rgba(226,178,90,.06)";
        ctx.fillRect(px + TS * 0.4, py + TS * 0.1, 1, TS * 0.7);
      }
      if (n < 0.06) {
        ctx.strokeStyle = "rgba(120,150,145,.07)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + TS * 0.2);
        ctx.lineTo(px + TS - 2, py + TS * 0.2);
        ctx.stroke();
      }
    }
  }

  // ---------- props ----------
  const props = game.world.props;
  for (const p of props) {
    if (p.x < x0 - 1 || p.x > x1 + 1 || p.y < y0 - 1 || p.y > y1 + 1) continue;
    drawProp(ctx, game, p, wx(p.x), wy(p.y), TS);
  }

  // ---------- actors ----------
  const actors = game.enemies.slice();
  actors.push(game.player);
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a === game.player) drawPlayer(ctx, game, a, wx(a.x), wy(a.y), TS);
    else drawEnemy(ctx, game, a, wx(a.x), wy(a.y), TS);
  }

  // ---------- lighting ----------
  const light = game.lightLevel; // 0 clear .. 1 pitch black
  lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lctx.clearRect(0, 0, vw, vh);
  lctx.fillStyle = `rgba(2,4,6,${light})`;
  lctx.fillRect(0, 0, vw, vh);
  lctx.globalCompositeOperation = "destination-out";

  // player glow
  const ppx = wx(game.player.x), ppy = wy(game.player.y);
  const baseR = TS * 3.9;
  const base = lctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, baseR);
  base.addColorStop(0, "rgba(0,0,0,.92)");
  base.addColorStop(0.45, "rgba(0,0,0,.5)");
  base.addColorStop(1, "rgba(0,0,0,0)");
  lctx.fillStyle = base;
  lctx.beginPath();
  lctx.arc(ppx, ppy, baseR, 0, Math.PI * 2);
  lctx.fill();

  // flashlight cone
  const st = game.state;
  if (st.lamp && st.battery > 0 && st.hasLamp) {
    const range = TS * (11.8 + Math.sin(game.time * 3.1) * 0.12);
    const spread = 0.54;
    lctx.save();
    lctx.beginPath();
    lctx.moveTo(ppx, ppy);
    lctx.arc(ppx, ppy, range, game.player.dir - spread, game.player.dir + spread);
    lctx.closePath();
    lctx.clip();
    const cone = lctx.createRadialGradient(ppx, ppy, TS * 0.4, ppx, ppy, range);
    cone.addColorStop(0, "rgba(0,0,0,1)");
    cone.addColorStop(0.45, "rgba(0,0,0,.78)");
    cone.addColorStop(1, "rgba(0,0,0,0)");
    lctx.fillStyle = cone;
    lctx.fillRect(ppx - range, ppy - range, range * 2, range * 2);
    lctx.restore();
  }

  // ceiling fixtures
  for (const L of game.world.lights) {
    const lx = wx(L.x + 0.5), ly = wy(L.y + 0.5);
    const flick = 0.82 + 0.18 * Math.sin(game.time * (2.4 + hash(L.x, L.y) * 3) + L.x);
    const r = L.r * TS * flick;
    const g = lctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    g.addColorStop(0, "rgba(0,0,0,.85)");
    g.addColorStop(0.5, "rgba(0,0,0,.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    lctx.fillStyle = g;
    lctx.beginPath();
    lctx.arc(lx, ly, r, 0, Math.PI * 2);
    lctx.fill();
  }
  lctx.globalCompositeOperation = "source-over";
  ctx.drawImage(lightCanvas, 0, 0, vw, vh);

  // ---------- glows on top ----------
  if (st.lamp && st.battery > 0 && st.hasLamp) {
    const beamRange = TS * 11.8;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.arc(ppx, ppy, beamRange, game.player.dir - 0.54, game.player.dir + 0.54);
    ctx.closePath();
    ctx.clip();
    const beam = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, beamRange);
    beam.addColorStop(0, "rgba(255,231,178,0.16)");
    beam.addColorStop(0.4, "rgba(255,222,164,0.08)");
    beam.addColorStop(1, "rgba(255,222,164,0)");
    ctx.fillStyle = beam;
    ctx.fillRect(ppx - beamRange, ppy - beamRange, beamRange * 2, beamRange * 2);
    ctx.restore();
  }
  const near = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, TS * 2.6);
  near.addColorStop(0, "rgba(255,214,158,0.05)");
  near.addColorStop(1, "rgba(255,214,158,0)");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = near;
  ctx.beginPath();
  ctx.arc(ppx, ppy, TS * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (const L of game.world.lights) {
    const lx = wx(L.x + 0.5), ly = wy(L.y + 0.5);
    const flick = 0.7 + 0.3 * Math.sin(game.time * (2.4 + hash(L.x, L.y) * 3) + L.x);
    const r = L.r * TS * 0.55 * flick;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    g.addColorStop(0, hexA(L.color || "#c8d8e8", 0.1 * flick));
    g.addColorStop(1, hexA(L.color || "#c8d8e8", 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // enemy vision cones
  for (const e of game.enemies) {
    if (e.kind === "auditor") continue;
    if (e.sight <= 0) continue;
    const ex = wx(e.x), ey = wy(e.y);
    const range = e.sight * TS * 0.92;
    const half = e.fov / 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const col = e.state === "chase" ? "rgba(210,60,45," : "rgba(200,140,70,";
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, range);
    g.addColorStop(0, col + (e.state === "chase" ? 0.16 : 0.08) + ")");
    g.addColorStop(1, col + "0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.arc(ex, ey, range, e.dir - half, e.dir + half);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  atmosphere(ctx, game, ox, oy, TS);

  // hurt vignette
  if (game.hurtFlash > 0) {
    const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.2, vw / 2, vh / 2, vh * 0.85);
    g.addColorStop(0, "rgba(180,40,30,0)");
    g.addColorStop(1, `rgba(180,40,30,${Math.min(0.6, game.hurtFlash * 0.5)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
  }

  // auditor proximity distortion
  if (game.auditorDist > 0 && game.auditorDist < 8) {
    const a = (8 - game.auditorDist) / 8;
    ctx.fillStyle = `rgba(120,20,30,${a * 0.06})`;
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = `rgba(180,120,120,${a * 0.1})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = ((game.time * 40 + i * 137) % vh);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(vw, yy + Math.sin(game.time * 3 + i) * 8);
      ctx.stroke();
    }
  }
}

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function drawProp(ctx, game, p, px, py, TS) {
  const s = game.state;
  const key = p.key;
  const open = p.type === "door" ? !!s.doors[key] : false;
  const taken = !!s.taken[key];
  const cx = px + TS / 2, cy = py + TS / 2;

  if (p.type === "door") {
    ctx.fillStyle = "#0a0d0e";
    ctx.fillRect(px, py, TS, TS);
    if (open) {
      ctx.fillStyle = "#1d2526";
      ctx.fillRect(px + TS * 0.06, py + TS * 0.06, TS * 0.12, TS * 0.88);
      ctx.fillRect(px + TS * 0.82, py + TS * 0.06, TS * 0.12, TS * 0.88);
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(px + TS * 0.2, py + TS * 0.4, TS * 0.6, 1);
    } else {
      ctx.fillStyle = "#232c2e";
      ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
      ctx.fillStyle = "#1a2123";
      ctx.fillRect(px + TS * 0.16, py + TS * 0.12, TS * 0.68, TS * 0.32);
      ctx.fillRect(px + TS * 0.16, py + TS * 0.56, TS * 0.68, TS * 0.32);
      ctx.fillStyle = "#2f3a3c";
      ctx.fillRect(px + TS * 0.42, py + TS * 0.45, TS * 0.16, TS * 0.1);
      const unlocked = game.doorOpenable(p, s);
      ctx.fillStyle = unlocked ? "#7fd8cc" : "#c93a2c";
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(game.time * 3);
      ctx.fillRect(px + TS * 0.46, py + TS * 0.82, TS * 0.08, TS * 0.08);
      ctx.globalAlpha = 1;
    }
    return;
  }

  if (taken && ["item", "note", "shard", "corpse"].includes(p.type)) return;

  switch (p.type) {
    case "save": {
      ctx.fillStyle = "#141a1b";
      ctx.fillRect(px + TS * 0.12, py + TS * 0.1, TS * 0.76, TS * 0.8);
      ctx.fillStyle = "#1d2628";
      ctx.fillRect(px + TS * 0.18, py + TS * 0.16, TS * 0.64, TS * 0.42);
      const on = 0.55 + 0.25 * Math.sin(game.time * 1.7);
      ctx.fillStyle = `rgba(226,178,90,${on})`;
      ctx.fillRect(px + TS * 0.24, py + TS * 0.22, TS * 0.52, 2);
      ctx.fillRect(px + TS * 0.24, py + TS * 0.3, TS * 0.3, 1.5);
      ctx.fillStyle = "#2a3436";
      ctx.fillRect(px + TS * 0.2, py + TS * 0.64, TS * 0.6, TS * 0.18);
      ctx.fillStyle = "rgba(226,178,90,.8)";
      ctx.fillRect(px + TS * 0.44, py + TS * 0.86, TS * 0.12, 2);
      break;
    }
    case "item": {
      const bob = Math.sin(game.time * 2 + p.x) * 1.5;
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + TS * 0.26, TS * 0.2, TS * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.tint || "#d8c088";
      ctx.fillRect(cx - TS * 0.11, cy - TS * 0.1 + bob, TS * 0.22, TS * 0.2);
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fillRect(cx - TS * 0.11, cy - TS * 0.1 + bob, TS * 0.22, 2);
      ctx.strokeStyle = hexA(p.tint || "#e2b25a", 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy + bob, TS * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "note": {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(game.time + p.x) * 0.05);
      ctx.fillStyle = "#c9c4b0";
      ctx.fillRect(-TS * 0.16, -TS * 0.2, TS * 0.32, TS * 0.4);
      ctx.strokeStyle = "rgba(60,60,50,.6)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-TS * 0.1, -TS * 0.12 + i * TS * 0.08);
        ctx.lineTo(TS * 0.1, -TS * 0.12 + i * TS * 0.08);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "shard": {
      const t = game.time * 1.6 + p.x;
      const bob = Math.sin(t) * 3;
      ctx.save();
      ctx.translate(cx, cy + bob);
      ctx.rotate(t * 0.4);
      ctx.shadowColor = "rgba(127,216,204,.9)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#bff0e8";
      ctx.beginPath();
      ctx.moveTo(0, -TS * 0.22);
      ctx.lineTo(TS * 0.14, 0);
      ctx.lineTo(0, TS * 0.22);
      ctx.lineTo(-TS * 0.14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(127,216,204,.6)";
      ctx.beginPath();
      ctx.arc(0, 0, TS * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "keypad": {
      if (p.solid && !s.flags[p.flag]) {
        ctx.fillStyle = "#0a0d0e";
        ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = "#232c2e";
        ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
        ctx.fillStyle = "#1a2123";
        ctx.fillRect(px + TS * 0.16, py + TS * 0.12, TS * 0.68, TS * 0.32);
        ctx.fillRect(px + TS * 0.16, py + TS * 0.56, TS * 0.68, TS * 0.32);
      }
      ctx.fillStyle = "#1a2224";
      ctx.fillRect(px + TS * 0.24, py + TS * 0.24, TS * 0.52, TS * 0.52);
      ctx.fillStyle = "#0c1213";
      ctx.fillRect(px + TS * 0.28, py + TS * 0.28, TS * 0.44, TS * 0.2);
      ctx.fillStyle = s.flags[p.flag] ? "#7fd8cc" : "#c9584a";
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(game.time * 2.2 + p.x);
      ctx.fillRect(px + TS * 0.34, py + TS * 0.33, TS * 0.32, 2);
      ctx.globalAlpha = 1;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#33403f";
        ctx.fillRect(px + TS * 0.32 + i * TS * 0.14, py + TS * 0.54 + j * TS * 0.07, TS * 0.07, TS * 0.04);
      }
      break;
    }
    case "lever": {
      const on = !!s.puzzle[key];
      ctx.fillStyle = "#1c2324";
      ctx.fillRect(px + TS * 0.22, py + TS * 0.55, TS * 0.56, TS * 0.3);
      ctx.strokeStyle = on ? "#7fd8cc" : "#8a938f";
      ctx.lineWidth = Math.max(2, TS * 0.07);
      ctx.beginPath();
      ctx.moveTo(cx, py + TS * 0.68);
      ctx.lineTo(cx + (on ? TS * 0.1 : TS * 0.1), py + TS * (on ? 0.2 : 0.9));
      ctx.stroke();
      ctx.fillStyle = on ? "#7fd8cc" : "#c95a44";
      ctx.beginPath();
      ctx.arc(cx + (on ? TS * 0.1 : TS * 0.1), py + TS * (on ? 0.2 : 0.9), TS * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "valve": {
      const val = s.puzzle[key] || 0;
      ctx.strokeStyle = "#6a7472";
      ctx.lineWidth = Math.max(2, TS * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, TS * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + val * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * TS * 0.22, cy + Math.sin(a) * TS * 0.22);
        ctx.stroke();
      }
      ctx.fillStyle = p.target === val ? "#7fd8cc" : "#9a6a3a";
      ctx.beginPath();
      ctx.arc(cx, cy, TS * 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "socket": {
      ctx.fillStyle = "#171d1e";
      ctx.fillRect(px + TS * 0.2, py + TS * 0.3, TS * 0.6, TS * 0.42);
      const filled = !!s.flags[p.flag];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = filled ? "#7fd8cc" : "#3a4442";
        ctx.fillRect(px + TS * 0.29 + i * TS * 0.14, py + TS * 0.42, TS * 0.07, TS * 0.18);
      }
      break;
    }
    case "hack": {
      ctx.fillStyle = "#101819";
      ctx.fillRect(px + TS * 0.14, py + TS * 0.18, TS * 0.72, TS * 0.62);
      ctx.fillStyle = "#0a1112";
      ctx.fillRect(px + TS * 0.19, py + TS * 0.23, TS * 0.62, TS * 0.4);
      const scan = (game.time * 22) % (TS * 0.4);
      ctx.fillStyle = "rgba(89,198,182,.35)";
      ctx.fillRect(px + TS * 0.21, py + TS * 0.25 + scan, TS * 0.58, 1.5);
      ctx.fillStyle = s.flags[p.flag] ? "rgba(127,216,204,.7)" : "rgba(201,88,74,.7)";
      ctx.fillRect(px + TS * 0.22, py + TS * 0.66, TS * 0.3, 2);
      break;
    }
    case "npc": {
      const bob = Math.sin(game.time * 1.1) * 1.2;
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + TS * 0.32, TS * 0.24, TS * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b3335";
      ctx.fillRect(cx - TS * 0.16, cy - TS * 0.14 + bob, TS * 0.32, TS * 0.38);
      ctx.fillStyle = "#394446";
      ctx.beginPath();
      ctx.arc(cx, cy - TS * 0.2 + bob, TS * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7fd8cc";
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(game.time * 2.3);
      ctx.fillRect(cx - TS * 0.08, cy - TS * 0.22 + bob, TS * 0.16, 2);
      ctx.globalAlpha = 1;
      break;
    }
    case "corpse": {
      ctx.fillStyle = "rgba(40,10,8,.5)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + TS * 0.12, TS * 0.34, TS * 0.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a3330";
      ctx.beginPath();
      ctx.ellipse(cx, cy, TS * 0.2, TS * 0.32, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a423d";
      ctx.beginPath();
      ctx.arc(cx - TS * 0.16, cy - TS * 0.16, TS * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "exit": {
      const ready = game.exitReady(p, s);
      ctx.fillStyle = "#0a0f10";
      ctx.fillRect(px + TS * 0.06, py + TS * 0.06, TS * 0.88, TS * 0.88);
      const g = ctx.createLinearGradient(px, py, px, py + TS);
      if (ready) {
        g.addColorStop(0, "rgba(226,178,90,.85)");
        g.addColorStop(1, "rgba(180,84,47,.5)");
      } else {
        g.addColorStop(0, "rgba(90,60,50,.5)");
        g.addColorStop(1, "rgba(40,30,28,.4)");
      }
      ctx.fillStyle = g;
      ctx.fillRect(px + TS * 0.2, py + TS * 0.12, TS * 0.6, TS * 0.76);
      ctx.fillStyle = "#131a1b";
      ctx.fillRect(px + TS * 0.46, py + TS * 0.36, TS * 0.08, TS * 0.08);
      if (ready) {
        ctx.strokeStyle = "rgba(226,178,90,.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, py + TS * 0.85);
        ctx.lineTo(cx, py + TS * 0.72);
        ctx.moveTo(cx - 4, py + TS * 0.76);
        ctx.lineTo(cx, py + TS * 0.72);
        ctx.lineTo(cx + 4, py + TS * 0.76);
        ctx.stroke();
      }
      break;
    }
    case "console": {
      ctx.fillStyle = "#151b1c";
      ctx.fillRect(px + TS * 0.08, py + TS * 0.3, TS * 0.84, TS * 0.5);
      ctx.fillStyle = "#0b1213";
      ctx.fillRect(px + TS * 0.14, py + TS * 0.18, TS * 0.32, TS * 0.24);
      ctx.fillRect(px + TS * 0.54, py + TS * 0.18, TS * 0.32, TS * 0.24);
      const on = s.flags[p.flag];
      ctx.fillStyle = on ? "rgba(127,216,204,.8)" : "rgba(201,88,74,.55)";
      ctx.fillRect(px + TS * 0.17, py + TS * 0.22, TS * 0.26, 2);
      ctx.fillRect(px + TS * 0.57, py + TS * 0.22, TS * 0.26, 2);
      ctx.fillStyle = "#2c3638";
      ctx.fillRect(px + TS * 0.16, py + TS * 0.52, TS * 0.68, TS * 0.16);
      break;
    }
    case "machine": {
      ctx.fillStyle = "#191e1e";
      ctx.fillRect(px + TS * 0.06, py + TS * 0.06, TS * 0.88, TS * 0.88);
      ctx.fillStyle = "#232b2b";
      ctx.fillRect(px + TS * 0.14, py + TS * 0.16, TS * 0.72, TS * 0.4);
      ctx.strokeStyle = "rgba(0,0,0,.5)";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px + TS * 0.18, py + TS * 0.62 + i * 5);
        ctx.lineTo(px + TS * 0.82, py + TS * 0.62 + i * 5);
        ctx.stroke();
      }
      break;
    }
    case "gate": {
      const open2 = !!s.flags[p.flag];
      if (!open2) {
        ctx.strokeStyle = "#4a5452";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const gx = px + TS * (0.16 + i * 0.23);
          ctx.beginPath();
          ctx.moveTo(gx, py + TS * 0.06);
          ctx.lineTo(gx, py + TS * 0.94);
          ctx.stroke();
        }
      }
      break;
    }
    default:
      break;
  }
}

function drawPlayer(ctx, game, p, px, py, TS) {
  const bob = Math.sin(p.bob) * (p.boosting ? 1.6 : 1);
  ctx.save();
  ctx.translate(px + TS / 2, py + TS / 2 + bob * 0.3);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath();
  ctx.ellipse(0, TS * 0.3, TS * 0.24, TS * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.dir + Math.PI / 2);
  // coat
  ctx.fillStyle = "#39403d";
  ctx.beginPath();
  ctx.ellipse(0, TS * 0.04, TS * 0.19, TS * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2c332f";
  ctx.fillRect(-TS * 0.19, -TS * 0.06, TS * 0.38, TS * 0.1);
  // head
  ctx.fillStyle = "#4b5350";
  ctx.beginPath();
  ctx.arc(0, -TS * 0.14, TS * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(226,178,90,.5)";
  ctx.fillRect(-TS * 0.06, -TS * 0.19, TS * 0.12, 2);
  // lamp
  if (game.state.lamp && game.state.battery > 0) {
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(0, -TS * 0.26, TS * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "rgba(255,235,180,.9)";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawEnemy(ctx, game, e, px, py, TS) {
  const cx = px + TS / 2, cy = py + TS / 2;
  if (e.kind === "auditor") {
    const t = game.time;
    ctx.save();
    ctx.translate(cx, cy);
    const h = TS * 1.5;
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath();
    ctx.ellipse(0, TS * 0.3, TS * 0.3, TS * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,120,120,.28)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, -h * 0.3, TS * (0.4 + i * 0.16) + Math.sin(t * 2 + i) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#0d0d10";
    ctx.beginPath();
    ctx.moveTo(-TS * 0.16, TS * 0.28);
    ctx.lineTo(-TS * 0.1, -h * 0.5);
    ctx.lineTo(TS * 0.1, -h * 0.5);
    ctx.lineTo(TS * 0.16, TS * 0.28);
    ctx.closePath();
    ctx.fill();
    // arms
    const sway = Math.sin(t * 1.4) * 0.08;
    ctx.strokeStyle = "#16161a";
    ctx.lineWidth = Math.max(2, TS * 0.07);
    ctx.beginPath();
    ctx.moveTo(-TS * 0.12, -h * 0.4);
    ctx.lineTo(-TS * 0.3, -h * 0.05 + Math.sin(t * 1.4) * 4);
    ctx.moveTo(TS * 0.12, -h * 0.4);
    ctx.lineTo(TS * 0.3, -h * 0.05 - Math.sin(t * 1.4) * 4);
    ctx.stroke();
    // head
    ctx.fillStyle = "#101014";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.62 + sway * 4, TS * 0.14, TS * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(250,240,235,.92)";
    ctx.shadowColor = "rgba(255,240,235,.8)";
    ctx.shadowBlur = 14;
    ctx.fillRect(-TS * 0.07, -h * 0.64, TS * 0.05, TS * 0.024);
    ctx.fillRect(TS * 0.02, -h * 0.64, TS * 0.05, TS * 0.024);
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  if (e.kind === "crawler") {
    const gait = Math.sin(e.walkPhase) * (e.moving ? 1 : 0.2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath();
    ctx.ellipse(0, TS * 0.22, TS * 0.3, TS * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(e.dir + Math.PI / 2);
    ctx.strokeStyle = "#5b625c";
    ctx.lineWidth = Math.max(1.5, TS * 0.045);
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const off = (i % 2 ? 1 : -1) * TS * 0.14;
      ctx.beginPath();
      ctx.moveTo(side * TS * 0.08, off * 0.4);
      ctx.lineTo(side * TS * (0.3 + Math.abs(gait) * 0.08), off + gait * TS * 0.08);
      ctx.stroke();
    }
    ctx.fillStyle = "#343a36";
    ctx.beginPath();
    ctx.ellipse(0, 0, TS * 0.16, TS * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8b9187";
    ctx.beginPath();
    ctx.arc(0, -TS * 0.22, TS * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(180,40,30,.85)";
    ctx.fillRect(-TS * 0.06, -TS * 0.24, TS * 0.12, 2);
    ctx.restore();
    return;
  }

  // sweeper
  const t = game.time;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath();
  ctx.ellipse(0, TS * 0.3, TS * 0.3, TS * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(e.dir + Math.PI / 2);
  ctx.fillStyle = "#2b3234";
  ctx.fillRect(-TS * 0.27, -TS * 0.24, TS * 0.54, TS * 0.48);
  ctx.fillStyle = "#1b2123";
  ctx.fillRect(-TS * 0.32, -TS * 0.18, TS * 0.06, TS * 0.4);
  ctx.fillRect(TS * 0.26, -TS * 0.18, TS * 0.06, TS * 0.4);
  // treads
  ctx.fillStyle = "#121718";
  for (let i = 0; i < 4; i++) {
    const ty = -TS * 0.2 + ((i * TS * 0.14 + (e.moving ? t * 18 : 0)) % (TS * 0.5));
    ctx.fillRect(-TS * 0.34, ty - TS * 0.06, TS * 0.05, TS * 0.05);
    ctx.fillRect(TS * 0.29, ty - TS * 0.06, TS * 0.05, TS * 0.05);
  }
  ctx.fillStyle = "#394244";
  ctx.fillRect(-TS * 0.16, -TS * 0.3, TS * 0.32, TS * 0.1);
  const eyeCol = e.state === "chase" ? "rgba(240,70,50,1)" : "rgba(226,140,70,.9)";
  ctx.fillStyle = eyeCol;
  ctx.shadowColor = eyeCol;
  ctx.shadowBlur = e.state === "chase" ? 16 : 8;
  ctx.beginPath();
  ctx.arc(0, -TS * 0.12, TS * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(120,140,140,.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -TS * 0.3);
  ctx.lineTo(0, -TS * 0.36);
  ctx.stroke();
  ctx.restore();
}

function atmosphere(ctx, game, ox, oy, TS) {
  const amb = game.zoneDef.ambience;
  const t = game.time;
  const W = vw, H = vh;
  if (amb === "foundry") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const seed = hash(i, 7);
      const x = ((seed * W + t * (8 + seed * 20)) % W);
      const y = ((hash(i, 13) * H - t * (14 + seed * 26)) % H + H) % H;
      ctx.fillStyle = `rgba(255,${110 + Math.floor(seed * 90)},60,${0.08 + seed * 0.22})`;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.restore();
  } else if (amb === "cold") {
    ctx.fillStyle = "rgba(150,200,230,.05)";
    for (let i = 0; i < 34; i++) {
      const seed = hash(i, 3);
      const x = (hash(i, 11) * W + Math.sin(t * 0.3 + i) * 20) % W;
      const y = (seed * H + t * (5 + seed * 9)) % H;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.fillStyle = "rgba(150,200,230,.03)";
    ctx.fillRect(0, 0, W, H);
  } else if (amb === "data") {
    ctx.strokeStyle = "rgba(89,198,182,.045)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = (hash(i, 5) * H + t * 12) % H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else {
    // dust
    ctx.fillStyle = "rgba(220,230,225,.045)";
    for (let i = 0; i < 24; i++) {
      const seed = hash(i, 17);
      const x = (hash(i, 21) * W + Math.sin(t * 0.22 + i) * 26) % W;
      const y = (seed * H + Math.sin(t * 0.18 + i * 2) * 22 + t * 3) % H;
      ctx.fillRect(x, y, 1.2, 1.2);
    }
  }
}
