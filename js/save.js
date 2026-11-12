// Save files, stored in the browser. Three manual slots + one autosave.
const PREFIX = "factoryreset.v1.";
const META_KEY = "factoryreset.meta.v1";

export const SLOT_NAMES = { 0: "AUTOSAVE", 1: "FILE 01", 2: "FILE 02", 3: "FILE 03" };

function key(slot) {
  return PREFIX + (slot === 0 ? "auto" : "slot" + slot);
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch (e) { return null; }
}

export function write(slot, state) {
  const payload = {
    savedAt: new Date().toISOString(),
    meta: {
      zone: state.zone,
      zoneName: state.zoneName || state.zone,
      time: Math.round(state.playtime || 0),
      shards: (state.shards || []).length,
      deaths: state.deaths || 0,
      ending: state.ending || null,
    },
    state,
  };
  try {
    localStorage.setItem(key(slot), JSON.stringify(payload));
    return true;
  } catch (e) {
    return false;
  }
}

export function read(slot) {
  const raw = localStorage.getItem(key(slot));
  if (!raw) return null;
  const payload = safeParse(raw);
  if (!payload || !payload.state) return null;
  if (payload.state.version !== 1) return null;
  return payload;
}

export function remove(slot) {
  localStorage.removeItem(key(slot));
}

export function listSlots() {
  return [0, 1, 2, 3].map((slot) => {
    const p = read(slot);
    return { slot, name: SLOT_NAMES[slot], empty: !p, meta: p ? p.meta : null, savedAt: p ? p.savedAt : null };
  });
}

export function hasAnySave() {
  return [0, 1, 2, 3].some((s) => !!read(s));
}

export function latestSlot() {
  let best = null;
  for (const slot of [1, 2, 3, 0]) {
    const p = read(slot);
    if (!p) continue;
    const t = Date.parse(p.savedAt || 0) || 0;
    if (!best || t > best.t) best = { slot, t };
  }
  return best ? best.slot : null;
}

export function getMeta() {
  return Object.assign(
    { endings: {}, runs: 0, deaths: 0, bestTime: null, mute: false },
    safeParse(localStorage.getItem(META_KEY)) || {}
  );
}

export function setMeta(patch) {
  const next = Object.assign(getMeta(), patch);
  try { localStorage.setItem(META_KEY, JSON.stringify(next)); } catch (e) {}
  return next;
}

export function recordEnding(kind, time, deaths) {
  const m = getMeta();
  m.endings = m.endings || {};
  m.endings[kind] = (m.endings[kind] || 0) + 1;
  m.deaths = (m.deaths || 0) + (deaths || 0);
  m.runs = (m.runs || 0) + 1;
  if (!m.bestTime || time < m.bestTime) m.bestTime = Math.round(time);
  setMeta(m);
  return m;
}

export function exportText(state) {
  return JSON.stringify({ game: "factory-reset", version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function parseImport(text) {
  const data = safeParse(text);
  if (!data) return null;
  const state = data.state || data;
  if (!state || state.version !== 1 || typeof state.zone !== "string") return null;
  return state;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return (h > 0 ? h + ":" + String(m).padStart(2, "0") : String(m).padStart(2, "0")) + ":" + String(r).padStart(2, "0");
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
