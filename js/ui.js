import * as Save from "./save.js";
import { Audio } from "./audio.js";

const el = (id) => document.getElementById(id);
const $ = (sel) => document.querySelector(sel);
const SCREENS = ["title", "slots", "journal", "pause", "modal", "death", "ending"];

let G = null;
let sayTimer = null;
let slotsMode = "load";
let journalTab = "objectives";
let dialogue = null;
let keypadState = null;
let hackState = null;
let modalStack = 0;
let modalReturn = null;

function showScreen(name) {
  for (const s of SCREENS) {
    const node = el("screen-" + s);
    if (!node) continue;
    node.classList.toggle("hidden", s !== name);
  }
  document.body.dataset.screen = name || "";
}
function hideScreens() {
  for (const s of SCREENS) el("screen-" + s).classList.add("hidden");
  document.body.dataset.screen = "";
}

export const UI = {
  init(game) {
    G = game;
    el("btn-new").addEventListener("click", () => { Audio.resume(); UI.openSlots("new"); });
    el("btn-continue").addEventListener("click", () => {
      Audio.resume();
      const slot = Save.latestSlot();
      if (slot == null) { UI.modal({ title: "NO RECORDS", body: '<div class="doc-body"><p>There is no shift record in this browser yet.</p></div>', actions: [{ label: "BACK", onClick: () => UI.closeModal() }] }); return; }
      game.loadSlot(slot);
    });
    el("btn-load").addEventListener("click", () => { Audio.resume(); UI.openSlots("load"); });
    el("btn-help").addEventListener("click", () => {
      Audio.resume();
      UI.modal({
        title: "HOW TO PLAY",
        body: `<div class="doc-body">
          <p><em>You are unarmed.</em> The plant is full of machines that will take you apart. Your lamp is a tool and a beacon: it helps you see, and it helps them see you.</p>
          <p><em>Move</em> with W A S D or the arrow keys. Hold <em>SHIFT</em> to run (it costs breath and makes noise). <em>F</em> toggles the lamp. <em>E</em> interacts. <em>TAB</em> opens your journal and map. <em>ESC</em> pauses.</p>
          <p><em>Record your shift</em> at any terminal marked with a screen. Saving also creates a restore point; if you are caught, you return to it. Manual save files live in your browser (and persist between visits).</p>
          <p><em>Sweepers</em> hunt with a narrow cone of light. Break line of sight, and walk, don't run.<br /><em>Crawlers</em> are blind but hear footsteps and splashing.<br /><em>The Auditor</em> cannot be lost for long. Keep moving.</p>
          <p>Seven <em>memory cores</em> are hidden in the plant. Collecting them changes what you are allowed to do at the end.</p>
          <p>Headphones recommended. The plant is loud when it wants to be.</p>
        </div>`,
        actions: [{ label: "UNDERSTOOD", onClick: () => UI.closeModal() }],
      });
    });
    el("btn-resume").addEventListener("click", () => game.togglePause(false));
    el("btn-save").addEventListener("click", () => UI.openSlots("save"));
    el("btn-pause-load").addEventListener("click", () => UI.openSlots("load"));
    el("btn-mute").addEventListener("click", () => {
      const next = !Save.getMeta().mute;
      Save.setMeta({ mute: next });
      Audio.setMuted(next);
      UI.refreshMute();
    });
    el("btn-to-title").addEventListener("click", () => {
      UI.modal({
        title: "ABANDON SHIFT",
        body: '<div class="doc-body"><p>Return to the title screen? Unsaved progress since your last record will be lost.</p></div>',
        actions: [
          { label: "ABANDON", cls: "danger", onClick: () => { UI.closeModal(); game.toTitle(); } },
          { label: "KEEP GOING", cls: "ghost", onClick: () => UI.closeModal() },
        ],
      });
    });
    el("slots-close").addEventListener("click", () => {
      if (slotsMode === "save") { UI.closeSlots(); UI.openPause(); }
      else if (G && G.state && !G.state.ending) { UI.closeSlots(); UI.openPause(); }
      else { UI.closeSlots(); UI.showTitle(); }
    });
    el("journal-close").addEventListener("click", () => UI.closeJournal());
    el("btn-respawn").addEventListener("click", () => game.respawn());
    el("btn-death-load").addEventListener("click", () => UI.openSlots("load"));
    el("btn-ending-menu").addEventListener("click", () => game.toTitle());

    document.querySelectorAll(".tab").forEach((b) => {
      b.addEventListener("click", () => {
        journalTab = b.dataset.tab;
        document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === b));
        UI.renderJournal();
      });
    });

    // clicking backdrop of a modal closes it
    el("screen-modal").addEventListener("mousedown", (e) => {
      if (e.target === el("screen-modal") && !keypadState && !hackState) UI.closeModal();
    });
  },

  // ---------------- screens ----------------
  showTitle() {
    hideScreens();
    el("screen-title").classList.remove("hidden");
    document.body.dataset.screen = "title";
    el("hud").classList.add("hidden");
    el("prompt").classList.add("hidden");
    el("subtitle").classList.add("hidden");
    const has = Save.hasAnySave();
    el("btn-continue").disabled = !has;
    el("btn-load").disabled = !has;
    UI.refreshMute();
  },

  hideScreens() { hideScreens(); },
  showHud() { el("hud").classList.remove("hidden"); el("screen-title").classList.add("hidden"); },

  blocking() { return !!document.body.dataset.screen; },
  screenName() { return document.body.dataset.screen || ""; },

  openSlots(mode) {
    slotsMode = mode;
    const titles = { new: "SELECT A FILE", load: "LOAD SHIFT", save: "SAVE SHIFT" };
    el("slots-title").textContent = titles[mode] || "SHIFT FILES";
    el("slots-sub").textContent = mode === "new"
      ? "Choose a file for this shift. Files are stored in this browser."
      : mode === "save"
        ? "Overwrite a file with your current progress. The autosave is always written at terminals."
        : "Restore a shift. Autosave is written whenever you use a terminal.";
    const list = el("slots-list");
    list.innerHTML = "";
    for (const s of Save.listSlots()) {
      const available = mode === "load" || s.slot !== 0;
      const div = document.createElement("div");
      div.className = "slot" + (s.empty ? " empty" : "");
      if (!available) div.style.opacity = ".4";
      const meta = s.meta
        ? `${s.meta.zoneName} &middot; ${Save.formatTime(s.meta.time)} &middot; ◇ ${s.meta.shards}/7 &middot; ${s.meta.deaths} loss${s.meta.deaths === 1 ? "" : "es"}<br />${Save.formatDate(s.savedAt)}`
        : "— empty —";
      div.innerHTML = `<div><div class="sname">${s.name}</div><div class="smeta">${meta}</div></div>
        <div class="sgo">${mode === "save" ? "WRITE" : s.empty ? "NEW" : "LOAD"}</div>`;
      div.addEventListener("click", () => {
        if (!available) return;
        Audio.resume();
        if (mode === "new") {
          if (!s.empty) {
            UI.modal({
              title: "OVERWRITE FILE",
              body: `<div class="doc-body"><p>${s.name} already holds a shift. Starting a new one will erase it.</p></div>`,
              actions: [
                { label: "ERASE & START", cls: "danger", onClick: () => { UI.closeModal(); G.startNew(s.slot); } },
                { label: "CANCEL", cls: "ghost", onClick: () => UI.closeModal() },
              ],
            });
          } else G.startNew(s.slot);
        } else if (mode === "save") {
          G.saveToSlot(s.slot);
          UI.closeSlots();
          UI.openPause();
          UI.toast("Shift recorded in " + s.name, "good");
        } else {
          G.loadSlot(s.slot);
        }
      });
      list.appendChild(div);
    }
    hideScreens();
    el("screen-slots").classList.remove("hidden");
    document.body.dataset.screen = "slots";
  },

  closeSlots() { hideScreens(); },
  closeJournal() { hideScreens(); if (G && G.state && !G.state.ending) G.togglePause(false); },
  closeModal() {
    const back = modalReturn;
    modalReturn = null;
    UI.clearHack();
    hideScreens();
    modalStack = 0;
    keypadState = null;
    hackState = null;
    if (back === "journal") UI.openJournal();
    else if (back === "slots") UI.openSlots(slotsMode);
    else if (back === "pause") UI.openPause();
    else if (back === "title") UI.showTitle();
    else if (G && G.state && !G.state.ending) G.resumeFromUI();
  },

  openPause() {
    el("pause-stats").textContent = `Time in plant ${Save.formatTime(G.state.playtime)} · losses ${G.state.deaths} · cores ${G.state.shards.length}/7`;
    UI.refreshMute();
    hideScreens();
    el("screen-pause").classList.remove("hidden");
    document.body.dataset.screen = "pause";
    G.pauseGame();
  },
  refreshMute() {
    const m = Save.getMeta();
    if (el("btn-mute")) el("btn-mute").textContent = "SOUND: " + (m.mute ? "OFF" : "ON");
  },

  // ---------------- HUD ----------------
  updateHUD() {
    const s = G.state;
    el("zone-name").textContent = G.zoneDef.name;
    el("zone-sub").textContent = G.zoneDef.sub || "";
    el("clock").textContent = Save.formatTime(s.playtime);
    el("shard-count").textContent = `◇ ${s.shards.length}/7`;
    el("objective-text").textContent = G.objectiveNow();
    el("battery-bar").style.width = Math.max(0, Math.min(100, s.battery)) + "%";
    el("stamina-bar").style.width = Math.max(0, Math.min(100, s.stamina)) + "%";
    el("health-bar").style.width = Math.max(0, Math.min(100, s.health)) + "%";
    el("battery-bar").style.background = s.battery < 18 ? "linear-gradient(90deg,#7a2318,#c95a44)" : "";
    el("battery-bar").style.opacity = s.lamp ? 1 : 0.55;
  },

  prompt(text) {
    const p = el("prompt");
    if (!text) { p.classList.add("hidden"); return; }
    el("prompt-text").textContent = text;
    p.classList.remove("hidden");
  },

  say(speaker, text, dur = 4200, cls = "") {
    if (sayTimer) clearTimeout(sayTimer);
    el("sub-speaker").textContent = speaker || "";
    const t = el("sub-text");
    t.textContent = text;
    t.className = cls;
    el("subtitle").classList.remove("hidden");
    if (dur > 0) {
      sayTimer = setTimeout(() => {
        if (!dialogue) el("subtitle").classList.add("hidden");
      }, dur);
    }
  },
  clearSay() {
    if (sayTimer) clearTimeout(sayTimer);
    el("subtitle").classList.add("hidden");
  },

  toast(text, kind = "") {
    const d = document.createElement("div");
    d.className = "toast " + kind;
    d.textContent = text;
    el("toasts").appendChild(d);
    setTimeout(() => d.remove(), 3200);
  },

  // ---------------- journal ----------------
  openJournal(tab) {
    if (tab) journalTab = tab;
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x.dataset.tab === journalTab));
    UI.renderJournal();
    hideScreens();
    el("screen-journal").classList.remove("hidden");
    document.body.dataset.screen = "journal";
    G.pauseGame();
  },

  renderJournal() {
    const body = el("journal-body");
    const s = G.state;
    body.innerHTML = "";
    if (journalTab === "objectives") {
      const list = G.objectiveList();
      for (const o of list) {
        const div = document.createElement("div");
        div.className = "obj-line" + (o.done ? " done" : o.now ? " now" : "");
        div.innerHTML = `<span class="mark">${o.done ? "✓" : o.now ? "▸" : "·"}</span><span>${o.text}</span>`;
        body.appendChild(div);
      }
      const n = document.createElement("div");
      n.className = "obj-line";
      n.innerHTML = `<span class="mark">i</span><span style="color:#6d7b78">${s.deaths > 0 ? `You have been reclaimed ${s.deaths} time${s.deaths === 1 ? "" : "s"}. The plant is patient.` : "The plant has not noticed you yet. It will."}</span>`;
      body.appendChild(n);
    } else if (journalTab === "notes") {
      const notes = G.collectedNotes();
      if (!notes.length) body.innerHTML = '<div class="empty-note">No documents recovered.</div>';
      for (const n of notes) {
        const d = document.createElement("div");
        d.className = "doc-item";
        d.innerHTML = `<b>${n.title}</b><span>${n.zoneName}${n.author ? " · " + n.author : ""}</span>`;
        d.addEventListener("click", () => UI.showNote(n));
        body.appendChild(d);
      }
    } else if (journalTab === "map") {
      const wrap = document.createElement("div");
      wrap.className = "map-wrap";
      const cv = document.createElement("canvas");
      cv.id = "journal-map";
      wrap.appendChild(cv);
      const legend = document.createElement("div");
      legend.className = "map-legend";
      legend.innerHTML = `<span><i class="you"></i>YOU</span><span><i class="core"></i>TERMINAL</span><span><i class="door"></i>POINT OF INTEREST</span>`;
      wrap.appendChild(legend);
      body.appendChild(wrap);
      UI.drawMap(cv);
    } else if (journalTab === "inventory") {
      const grid = document.createElement("div");
      grid.className = "inv-grid";
      if (!s.inventory.length) grid.innerHTML = '<div class="empty-note">Nothing but your gloves.</div>';
      for (const it of s.inventory) {
        const def = G.itemDef(it.id);
        const d = document.createElement("div");
        d.className = "inv-item" + (def.key ? " key" : "");
        d.innerHTML = `<b>${def.name}${it.qty > 1 ? " ×" + it.qty : ""}</b><span>${def.desc}</span>`;
        grid.appendChild(d);
      }
      body.appendChild(grid);
    } else {
      const cores = G.shardList();
      const grid = document.createElement("div");
      grid.className = "cores";
      for (const c of cores) {
        const d = document.createElement("div");
        d.className = "core" + (c.found ? " found" : "");
        d.innerHTML = `<b>◇</b>${c.name}<br /><span style="opacity:.65">${c.zone}</span>`;
        grid.appendChild(d);
      }
      body.appendChild(grid);
      const hint = document.createElement("div");
      hint.className = "empty-note";
      hint.textContent = `${cores.filter((c) => c.found).length} of 7 memory cores recovered. With all seven, the core will offer you something else.`;
      body.appendChild(hint);
    }
  },

  drawMap(cv) {
    const s = G.state;
    const zone = G.zoneDef;
    const world = G.world;
    const explored = s.explored[s.zone] || [];
    const cell = 8;
    cv.width = world.w * cell;
    cv.height = world.h * cell;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#050707";
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const seen = explored[y * world.w + x];
        if (!seen) continue;
        const ch = world.tiles[y][x];
        if (ch === "#") ctx.fillStyle = "#141b1c";
        else if (ch === "~") ctx.fillStyle = "#123038";
        else if (ch === "^") ctx.fillStyle = "#3a1a12";
        else if (ch === "=") ctx.fillStyle = "#2a2a20";
        else ctx.fillStyle = "#28383a";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    // points of interest
    for (const p of world.props) {
      const idx = p.y * world.w + p.x;
      if (!explored[idx]) continue;
      let col = null;
      if (p.type === "save") col = "#7fd8cc";
      else if (p.type === "exit") col = "#e2b25a";
      else if (p.type === "shard") col = "#bff0e8";
      else if (p.type === "door" && !s.doors[p.key]) col = "#b4542f";
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(p.x * cell + 2, p.y * cell + 2, cell - 4, cell - 4);
    }
    // player
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(G.player.x * cell, G.player.y * cell, cell * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e2b25a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(G.player.x * cell, G.player.y * cell, cell * 0.95, 0, Math.PI * 2);
    ctx.stroke();
  },

  // ---------------- modal / notes ----------------
  modal({ title, body, actions = [], cls = "" }) {
    el("modal-title").textContent = title || "";
    el("modal-body").innerHTML = body || "";
    const act = el("modal-actions");
    act.innerHTML = "";
    for (const a of actions) {
      const b = document.createElement("button");
      b.textContent = a.label;
      if (a.cls) b.className = a.cls;
      b.addEventListener("click", () => { Audio.beep(true); a.onClick && a.onClick(); });
      act.appendChild(b);
    }
    el("modal-panel").className = "panel modal-panel " + cls;
    modalReturn = document.body.dataset.screen || null;
    hideScreens();
    el("screen-modal").classList.remove("hidden");
    document.body.dataset.screen = "modal";
    modalStack = 1;
    G.pauseGame();
  },

  showNote(note) {
    const paras = note.body.split("\n\n").map((p) => {
      const html = p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*(.+?)\*/g, "<em>$1</em>");
      return `<p>${html}</p>`;
    }).join("");
    const stamp = note.stamp ? `<div class="stamp">${note.stamp}</div>` : "";
    UI.modal({
      title: note.title,
      body: `<div class="doc-body">${stamp}${paras}${note.author ? `<p class="sig">— ${note.author}</p>` : ""}</div>`,
      actions: [{ label: "CLOSE", onClick: () => UI.closeModal() }],
    });
  },

  // ---------------- keypad ----------------
  keypad(prop) {
    keypadState = { prop, input: "", locked: false };
    const render = () => {
      const st = keypadState;
      const html = `<div class="keypad">
        <div class="keypad-display ${st.bad ? "bad" : ""}" id="kp-display">${(st.input || "·").padEnd(4, "·").split("").join(" ")}</div>
        <div class="pad" id="kp-pad">
          ${[1,2,3,4,5,6,7,8,9].map((n) => `<button data-k="${n}">${n}</button>`).join("")}
          <button data-k="clear" class="ghost">C</button>
          <button data-k="0">0</button>
          <button data-k="enter" class="ghost">⏎</button>
        </div>
        <div class="keypad-hint">${st.hint || "ENTER ACCESS CODE"}</div>
      </div>`;
      el("modal-title").textContent = "ACCESS PANEL";
      el("modal-body").innerHTML = html;
      el("modal-actions").innerHTML = "";
      const close = document.createElement("button");
      close.className = "ghost";
      close.textContent = "STEP AWAY";
      close.addEventListener("click", () => UI.closeModal());
      el("modal-actions").appendChild(close);
      el("modal-body").querySelectorAll("[data-k]").forEach((b) => {
        b.addEventListener("click", () => UI.keypadPress(b.dataset.k));
      });
    };
    keypadState.render = render;
    keypadState.hint = prop.hint || "ENTER ACCESS CODE";
    hideScreens();
    el("screen-modal").classList.remove("hidden");
    document.body.dataset.screen = "modal";
    render();
    G.pauseGame();
  },

  keypadPress(k) {
    if (!keypadState) return;
    const st = keypadState;
    if (st.bad) { st.bad = false; }
    if (k === "clear") { st.input = ""; Audio.beep(false); }
    else if (k === "enter") {
      const code = st.input;
      const ok = G.checkKeypad(st.prop, code);
      if (ok) {
        Audio.save();
        UI.closeModal();
        return;
      } else {
        st.bad = true;
        Audio.wrong();
        G.shake = Math.max(G.shake, 3);
        st.input = "";
      }
    } else if (st.input.length < 6) {
      st.input += k;
      Audio.beep(true);
    }
    st.render();
  },

  keypadKey(key) {
    if (!keypadState) return false;
    if (/^[0-9]$/.test(key)) { UI.keypadPress(key); return true; }
    if (key === "Enter") { UI.keypadPress("enter"); return true; }
    if (key === "Backspace") { keypadState.input = keypadState.input.slice(0, -1); keypadState.render(); return true; }
    if (key === "Escape") { UI.closeModal(); return true; }
    return false;
  },

  // ---------------- hack minigame ----------------
  hack(prop) {
    const seq = [];
    for (let i = 0; i < 6; i++) seq.push(Math.floor(Math.random() * 9));
    hackState = { prop, phase: "watch", seq, idx: 0, input: [], timers: [] };
    const html = `<div class="hack">
      <div class="hack-status" id="hack-status">OBSERVE THE HANDSHAKE</div>
      <div class="hack-grid" id="hack-grid">
        ${Array.from({ length: 9 }, (_, i) => `<button data-i="${i}"></button>`).join("")}
      </div>
      <div class="keypad-hint">Repeat the sequence. Six pulses.</div>
    </div>`;
    el("modal-title").textContent = "SIGNAL HANDSHAKE";
    el("modal-body").innerHTML = html;
    el("modal-actions").innerHTML = "";
    const close = document.createElement("button");
    close.className = "ghost";
    close.textContent = "DISCONNECT";
    close.addEventListener("click", () => { UI.clearHack(); UI.closeModal(); });
    el("modal-actions").appendChild(close);
    el("hack-grid").querySelectorAll("[data-i]").forEach((b) => {
      b.addEventListener("click", () => UI.hackInput(Number(b.dataset.i)));
    });
    hideScreens();
    el("screen-modal").classList.remove("hidden");
    document.body.dataset.screen = "modal";
    G.pauseGame();
    UI.playHack();
  },

  playHack() {
    const st = hackState;
    if (!st) return;
    st.phase = "watch";
    st.input = [];
    st.idx = 0;
    el("hack-status").textContent = "OBSERVE THE HANDSHAKE";
    const lit = (i, on) => {
      const btn = el("hack-grid")?.querySelector(`[data-i="${i}"]`);
      if (btn) btn.classList.toggle("lit", on);
    };
    st.seq.forEach((v, i) => {
      st.timers.push(setTimeout(() => {
        lit(v, true);
        Audio.tone({ freq: 420 + v * 62, dur: 0.16, type: "sine", gain: 0.06 });
        st.timers.push(setTimeout(() => lit(v, false), 300));
      }, 480 + i * 520));
    });
    st.timers.push(setTimeout(() => {
      if (!hackState) return;
      st.phase = "input";
      el("hack-status").textContent = "YOUR TURN";
    }, 480 + st.seq.length * 520));
  },

  hackInput(i) {
    const st = hackState;
    if (!st || st.phase !== "input") return;
    const btn = el("hack-grid").querySelector(`[data-i="${i}"]`);
    if (btn) {
      btn.classList.add("lit");
      setTimeout(() => btn && btn.classList.remove("lit"), 140);
    }
    Audio.tone({ freq: 420 + i * 62, dur: 0.12, type: "sine", gain: 0.05 });
    if (st.seq[st.input.length] === i) {
      st.input.push(i);
      if (st.input.length === st.seq.length) {
        st.phase = "done";
        el("hack-status").textContent = "HANDSHAKE ACCEPTED";
        Audio.save();
        setTimeout(() => { if (hackState) { UI.closeModal(); G.solveHack(st.prop); } }, 600);
      }
    } else {
      st.phase = "fail";
      el("hack-status").textContent = "SIGNAL LOST — RESETTING";
      Audio.wrong();
      G.shake = Math.max(G.shake, 5);
      st.timers.push(setTimeout(() => { if (hackState) UI.playHack(); }, 1100));
    }
  },

  clearHack() {
    if (!hackState) return;
    hackState.timers.forEach((t) => clearTimeout(t));
    hackState = null;
  },
  clearKeypad() { keypadState = null; },

  // ---------------- dialogue ----------------
  startDialogue(lines, onEnd) {
    dialogue = { lines, i: 0, onEnd };
    document.body.dataset.dialogue = "1";
    UI.showDialogueLine();
    G.pauseGame();
  },
  showDialogueLine() {
    if (!dialogue) return;
    const l = dialogue.lines[dialogue.i];
    UI.say(l.speaker, l.text, 0, l.cls || "");
    el("subtitle").classList.remove("hidden");
    const last = dialogue.i >= dialogue.lines.length - 1;
    el("sub-speaker").textContent = (l.speaker || "") + (last ? "   ▸ E" : "   ▸ E");
  },
  advanceDialogue() {
    if (!dialogue) return false;
    dialogue.i++;
    if (dialogue.i >= dialogue.lines.length) {
      const end = dialogue.onEnd;
      dialogue = null;
      delete document.body.dataset.dialogue;
      UI.clearSay();
      el("prompt").classList.add("hidden");
      if (end) end();
      return true;
    }
    Audio.beep(true);
    UI.showDialogueLine();
    return true;
  },
  isDialogue() { return !!dialogue; },

  // ---------------- death / ending ----------------
  showDeath(reason, stats) {
    el("death-reason").textContent = reason || "Reclaimed.";
    el("death-stats").textContent = stats || "";
    hideScreens();
    el("screen-death").classList.remove("hidden");
    el("hud").classList.add("hidden");
    document.body.dataset.screen = "death";
  },
  hideDeath() { hideScreens(); },

  showEnding({ title, kicker, text, stats }) {
    el("ending-kicker").textContent = kicker || "END OF SHIFT";
    el("ending-title").textContent = title;
    el("ending-text").textContent = text;
    el("ending-stats").textContent = stats || "";
    hideScreens();
    el("screen-ending").classList.remove("hidden");
    el("hud").classList.add("hidden");
    document.body.dataset.screen = "ending";
  },

  flash(alpha, ms) {
    const f = el("flash");
    f.style.opacity = String(alpha);
    setTimeout(() => { f.style.opacity = "0"; }, ms || 100);
  },
};
