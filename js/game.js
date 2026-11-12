import * as Save from "./save.js";
import { Audio } from "./audio.js";
import { UI } from "./ui.js";
import { initRenderer, resizeRenderer, draw } from "./render.js";
import { parseZone, randomWalkable } from "./world.js";
import { Player, Enemy } from "./entities.js";
import { getZone, objectivesFor, ITEMS, SHARDS, ENDINGS, INTRO, ZONE_LIST } from "./content/zones.js";

const TAU = Math.PI * 2;

function freshState(slot) {
  return {
    version: 1,
    slot: slot || 1,
    zone: "cwing",
    zoneName: "C-WING",
    x: 0, y: 0,
    hasLamp: false,
    lamp: false,
    battery: 100,
    stamina: 100,
    health: 100,
    inventory: [],
    flags: {},
    doors: {},
    taken: {},
    read: {},
    puzzle: {},
    shards: [],
    explored: {},
    playtime: 0,
    deaths: 0,
    ending: null,
    checkpoint: null,
  };
}

function deepCopy(o) {
  return JSON.parse(JSON.stringify(o));
}

export const Game = {
  canvas: null,
  ctx: null,
  state: null,
  zoneDef: null,
  world: null,
  player: null,
  enemies: [],
  cam: { x: 0, y: 0 },
  input: { up: false, down: false, left: false, right: false, sprint: false },
  keys: new Set(),
  time: 0,
  last: 0,
  paused: true,
  dead: false,
  finished: false,
  fading: false,
  running: false,
  tileSize: 40,
  shake: 0,
  hurtFlash: 0,
  noise: null,
  nearProp: null,
  promptText: "",
  auditorDist: 0,
  zoneTime: 0,
  paShown: new Set(),
  hudTimer: 0,
  revealTimer: 0,
  lightLevel: 0.9,

  boot() {
    this.canvas = document.getElementById("stage");
    this.ctx = this.canvas.getContext("2d");
    initRenderer(this.canvas);
    this.resize();
    window.addEventListener("resize", () => this.resize());
    UI.init(this);
    Audio.setMuted(Save.getMeta().mute);
    this.noteIndex = {};
    for (const z of ZONE_LIST) {
      for (const [ch, p] of Object.entries(z.props)) {
        if ((p.type === "note" || p.type === "corpse") && p.body) {
          this.noteIndex[z.id + ":" + ch] = {
            title: p.title || "Document",
            body: p.body,
            author: p.author,
            stamp: p.stamp,
            zoneName: z.name,
          };
        }
      }
    }

    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
    window.addEventListener("blur", () => { this.input = { up: false, down: false, left: false, right: false, sprint: false }; });

    this.last = performance.now();
    this.running = true;
    UI.showTitle();
    requestAnimationFrame((t) => this.frame(t));
  },

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resizeRenderer(w, h, dpr);
    this.viewW = w;
    this.viewH = h;
    this.tileSize = Math.max(26, Math.min(46, Math.min(w / 25, h / 14.5)));
    this.dpr = dpr;
  },

  // ---------------- lifecycle ----------------
  startNew(slot) {
    Audio.resume();
    this.state = freshState(slot);
    this.paused = false;
    this.dead = false;
    this.finished = false;
    this.fading = false;
    this.time = 0;
    this.cam = { x: 0, y: 0 };
    UI.hideScreens();
    UI.showHud();
    this.enterZone("cwing");
    this.state.battery = 100;
    this.state.stamina = 100;
    this.state.health = 100;
    this.snapshot();
    Save.write(slot, this.state);
    Save.write(0, this.state);
    UI.updateHUD();
    const lines = INTRO();
    UI.startDialogue(lines, () => { this.resumeFromUI(); });
  },

  loadSlot(slot) {
    Audio.resume();
    const payload = Save.read(slot);
    if (!payload) { UI.toast("That file is empty.", "bad"); return; }
    this.state = payload.state;
    if (!this.state.checkpoint) this.snapshot();
    this.state.slot = slot;
    this.paused = false;
    this.dead = false;
    this.finished = false;
    this.fading = false;
    this.time = 0;
    UI.hideScreens();
    UI.showHud();
    Audio.setMuted(Save.getMeta().mute);
    this.enterZone(this.state.zone, { x: this.state.x, y: this.state.y });
    UI.updateHUD();
    UI.toast("Loaded " + Save.SLOT_NAMES[slot], "good");
    if (this.state.ending) {
      UI.say("", "This shift already ended. The record remains.", 4000);
    }
  },

  saveToSlot(slot) {
    if (!this.state) return;
    this.state.slot = slot;
    this.snapshot();
    this.state.zoneName = this.zoneDef ? this.zoneDef.name : this.state.zoneName;
    this.state.x = this.player ? Math.round(this.player.x * 100) / 100 : this.state.x;
    this.state.y = this.player ? Math.round(this.player.y * 100) / 100 : this.state.y;
    Save.write(slot, this.state);
    Save.write(0, this.state);
    Audio.save();
    UI.updateHUD();
  },

  snapshot() {
    this.state.checkpoint = null;
    const snap = deepCopy(this.state);
    this.state.checkpoint = snap;
  },

  toTitle() {
    this.paused = true;
    this.state = null;
    this.dead = false;
    this.finished = false;
    this.fading = false;
    Audio.stopAmbience();
    UI.clearSay();
    UI.prompt(null);
    UI.showTitle();
  },

  // ---------------- zones ----------------
  enterZone(id, pos) {
    const def = getZone(id);
    if (!def) throw new Error("Unknown zone " + id);
    this.zoneDef = def;
    this.world = parseZone(def);
    this.enemies = [];
    this.zoneTime = 0;
    this.paShown = new Set();
    this.promptText = "";
    if (!this.state.explored[id]) this.state.explored[id] = new Array(this.world.w * this.world.h).fill(0);

    // initial puzzle values
    for (const p of this.world.props) {
      if (p.initial !== undefined && this.state.puzzle[p.key] === undefined) this.state.puzzle[p.key] = p.initial;
    }

    const spawn = pos || { x: this.world.start.x + 0.5, y: this.world.start.y + 0.5 };
    this.player = new Player(spawn.x, spawn.y);
    this.state.zone = id;
    this.state.zoneName = def.name;
    this.state.flags["seen_" + id] = true;
    this.state.x = spawn.x;
    this.state.y = spawn.y;
    this.cam.x = spawn.x;
    this.cam.y = spawn.y;

    // enemies
    const spawns = (def.enemies || []).slice();
    if (this.state.flags.auditor_awake && def.auditor !== false && !spawns.some((e) => e.kind === "auditor")) {
      spawns.push({ kind: "auditor", far: true });
    }
    for (const e of spawns) {
      if (e.ifFlag && !this.state.flags[e.ifFlag]) continue;
      if (e.unlessFlag && this.state.flags[e.unlessFlag]) continue;
      let ex = e.x, ey = e.y;
      if (e.far || ex === undefined) {
        const spot = randomWalkable(this.world, this.state, spawn.x, spawn.y, 8, 14);
        if (!spot) continue;
        ex = Math.floor(spot.x);
        ey = Math.floor(spot.y);
      }
      if (!this.walkableEnemySpot(ex, ey)) continue;
      if (Math.hypot(ex + 0.5 - spawn.x, ey + 0.5 - spawn.y) < 3.4) continue;
      this.enemies.push(new Enemy(e.kind, ex + 0.5, ey + 0.5, e));
    }

    this.updateLightLevel();
    this.reveal(6);
    Audio.startAmbience(def.ambience || "hum");
    if (def.enter) UI.say("FACILITY", def.enter, 5200);
    UI.prompt(null);
    UI.updateHUD();
  },

  walkableEnemySpot(x, y) {
    const idx = y * this.world.w + x;
    if (x < 0 || y < 0 || x >= this.world.w || y >= this.world.h) return false;
    const ch = this.world.tiles[y][x];
    return (ch === "." || ch === "," || ch === "=") && !this.world.propAt.has(idx);
  },

  updateLightLevel() {
    const s = this.state;
    const def = this.zoneDef;
    let base = def.darkness == null ? 0.9 : def.darkness;
    if (s.zone === "maintenance") base = s.flags.power_on ? 0.66 : 0.96;
    if (s.zone === "foundry") base = s.flags.foundry_cooled ? 0.75 : 0.84;
    if (s.zone === "core") base = 0.76;
    this.lightLevel = base;
  },

  transitionTo(to, spawn) {
    if (this.fading) return;
    this.fading = true;
    const fade = document.getElementById("fade");
    fade.style.opacity = "1";
    Audio.door();
    setTimeout(() => {
      this.enterZone(to, spawn);
      fade.style.opacity = "0";
      setTimeout(() => { this.fading = false; }, 420);
    }, 480);
  },

  // ---------------- loop ----------------
  frame(ts) {
    if (!this.running) return;
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    this.time += dt;

    if (this.state && !this.paused && !this.dead && !this.finished && !this.fading && !UI.blocking()) {
      this.update(dt);
    }
    if (this.state && this.zoneDef && this.world && !UI.screenName()) {
      draw(this);
    }
    if (this.state) {
      this.shake = Math.max(0, this.shake - dt * 22);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) {
        this.hudTimer = 0.12;
        UI.updateHUD();
      }
    }
  },

  update(dt) {
    const s = this.state;
    s.playtime += dt;
    this.zoneTime += dt;

    this.player.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);
    if (this.dead) return;

    this.updateExplored(dt);
    this.updateInteract();
    this.updateCamera(dt);
    this.updateAuditorDist();

    if (s.health <= 0) {
      this.die("Your body gives out on the plant floor.", "vitals");
      return;
    }

    if (this.zoneDef.pa) {
      for (const line of this.zoneDef.pa) {
        const k = this.zoneDef.id + ":" + line.t;
        if (!this.paShown.has(k) && this.zoneTime >= line.t && !this.finished) {
          this.paShown.add(k);
          UI.say("FOREMAN", line.text, 6200);
        }
      }
    }
    this.updateLightLevel();
  },

  updateCamera(dt) {
    const TS = this.tileSize;
    const p = this.player;
    const halfW = this.viewW / (2 * TS);
    const halfH = this.viewH / (2 * TS);
    let tx = p.x, ty = p.y;
    if (this.world.w > halfW * 2) tx = Math.max(halfW, Math.min(this.world.w - halfW, tx));
    else tx = this.world.w / 2;
    if (this.world.h > halfH * 2) ty = Math.max(halfH, Math.min(this.world.h - halfH, ty));
    else ty = this.world.h / 2;
    const k = Math.min(1, dt * 7);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
  },

  updateExplored(dt) {
    this.revealTimer -= dt;
    if (this.revealTimer <= 0) {
      this.revealTimer = 0.18;
      this.reveal(5.6);
    }
  },

  reveal(radius) {
    const s = this.state;
    const arr = s.explored[s.zone];
    if (!arr) return;
    const w = this.world.w;
    const px = this.player.x, py = this.player.y;
    const R = Math.ceil(radius);
    for (let j = -R; j <= R; j++) {
      for (let i = -R; i <= R; i++) {
        const x = Math.floor(px) + i, y = Math.floor(py) + j;
        if (x < 0 || y < 0 || x >= this.world.w || y >= this.world.h) continue;
        if (Math.hypot(x + 0.5 - px, y + 0.5 - py) > radius) continue;
        arr[y * w + x] = 1;
      }
    }
  },

  updateInteract() {
    const p = this.findNearProp();
    this.nearProp = p;
    let text = "";
    if (p) text = this.promptFor(p);
    if (UI.isDialogue()) text = "";
    if (text !== this.promptText) {
      this.promptText = text;
      UI.prompt(text || null);
    }
  },

  findNearProp() {
    let best = null, bd = 1.5;
    for (const p of this.world.props) {
      if (this.state.taken[p.key] && (p.type === "item" || p.type === "note" || p.type === "shard" || p.type === "corpse")) continue;
      const d = Math.hypot(p.x + 0.5 - this.player.x, p.y + 0.5 - this.player.y);
      if (d < bd) {
        // doors need to be approached from a walkable neighbour; fine either way
        bd = d;
        best = p;
      }
    }
    return best;
  },

  promptFor(p) {
    switch (p.type) {
      case "door": {
        if (this.state.doors[p.key]) return "Door (open)";
        if (!this.doorOpenable(p)) return p.lockedLabel || "Sealed — " + this.needText(p.needs);
        return "Open " + (p.label || "door");
      }
      case "item": return "Take " + (p.name || "item");
      case "note": return "Read “" + (p.title || "document") + "”";
      case "save": return "Use shift terminal";
      case "shard": return "Take memory core";
      case "keypad": return this.state.flags[p.flag] ? "Access panel (open)" : "Use access panel";
      case "lever": return "Pull " + (p.label || "lever");
      case "valve": return `${p.label || "Valve"} [${this.state.puzzle[p.key] || 0}]`;
      case "socket": return p.label || "Fuse socket";
      case "hack": return this.state.flags[p.flag] ? "Terminal (open)" : "Use terminal";
      case "npc": return "Speak to " + (p.name || "unit");
      case "corpse": return "Inspect the body";
      case "console": return this.state.flags[p.flag] ? (p.labelDone || p.label || "Console") : (p.label || "Console");
      case "exit": return this.exitReady(p) ? (p.label || "Continue") : (p.lockedLabel || "Sealed");
      case "machine": return p.label || "Examine";
      default: return "";
    }
  },

  needText(needs) {
    if (!needs) return "";
    if (needs.text) return needs.text;
    if (needs.item) {
      const def = this.itemDef(needs.item);
      return "needs " + def.name;
    }
    return "needs power";
  },

  meets(needs) {
    if (!needs) return true;
    const s = this.state;
    if (needs.item && !this.hasItem(needs.item)) return false;
    if (needs.flag && !s.flags[needs.flag]) return false;
    if (needs.item && needs.consume) return this.hasItem(needs.item);
    return true;
  },

  doorOpenable(p) { return this.meets(p.needs); },
  exitReady(p) {
    if (p.ending) return !!this.state.flags.core_done;
    return this.meets(p.needs);
  },

  // ---------------- interaction ----------------
  interact() {
    const p = this.nearProp || this.findNearProp();
    if (!p) return;
    const s = this.state;
    switch (p.type) {
      case "door": {
        if (s.doors[p.key]) { UI.say("", "The door is already open.", 1800); return; }
        if (!this.doorOpenable(p)) {
          Audio.locked();
          UI.say("", p.lockedText || `Sealed. It ${this.needText(p.needs)}.`, 3200, "em");
          return;
        }
        s.doors[p.key] = true;
        if (p.opens) s.flags[p.opens] = true;
        Audio.door();
        UI.toast("Door opened");
        break;
      }
      case "exit": {
        if (!this.exitReady(p)) {
          Audio.locked();
          UI.say("", p.lockedText || `It won't open. It ${this.needText(p.needs)}.`, 3400, "em");
          return;
        }
        if (p.ending) { this.finish(); return; }
        this.transitionTo(p.to, null);
        break;
      }
      case "item": {
        if (s.taken[p.key]) return;
        s.taken[p.key] = true;
        Audio.pickup();
        if (p.instant === "battery") {
          s.battery = Math.min(100, s.battery + 55);
          UI.toast("Lamp cell +55%", "good");
        } else if (p.instant === "repair") {
          s.health = Math.min(100, s.health + 45);
          UI.toast("Vitals stabilized +45", "good");
        } else {
          this.addItem(p.item);
          UI.toast("Acquired: " + (p.name || p.item));
          if (p.item === "lamp") {
            s.hasLamp = true;
            s.lamp = true;
            UI.say("", "The maintenance lamp clicks on. Its beam is narrow and honest.", 3600);
          }
        }
        if (p.onTakeFlag) s.flags[p.onTakeFlag] = true;
        if (p.awareness) this.awaken(p.awareness);
        break;
      }
      case "note": {
        s.taken[p.key] = true;
        s.read[p.key] = true;
        Audio.beep(true);
        UI.showNote({
          title: p.title || "Document",
          body: p.body || "",
          author: p.author,
          stamp: p.stamp,
        });
        break;
      }
      case "save": {
        this.saveToSlot(s.slot || 1);
        UI.toast("Shift recorded", "good");
        UI.say("TERMINAL", "IDENTITY LOGGED. PROGRESS RETAINED IN LOCAL STORAGE.", 4200);
        break;
      }
      case "shard": {
        if (s.taken[p.key]) return;
        s.taken[p.key] = true;
        if (!s.shards.includes(p.shard)) s.shards.push(p.shard);
        Audio.shard();
        this.shake = 3;
        const found = SHARDS.filter((x) => s.shards.includes(x.id));
        UI.toast(`Memory core recovered (${s.shards.length}/7)`, "good");
        UI.say("CORE", p.text || "A voice that is not a voice says your name, and then forgets it.", 5200);
        if (s.shards.length === 7) {
          UI.toast("All seven cores recovered", "good");
          UI.say("", "Seven cores. Seven names. Something in the plant has been waiting for you to carry them.", 6000);
        }
        break;
      }
      case "lever": {
        s.puzzle[p.key] = !s.puzzle[p.key];
        Audio.beep(!!s.puzzle[p.key]);
        this.checkGroup(p.group);
        break;
      }
      case "valve": {
        s.puzzle[p.key] = ((s.puzzle[p.key] || 0) + 1) % 4;
        Audio.beep(true);
        this.checkGroup(p.group);
        break;
      }
      case "socket": {
        if (s.flags[p.flag]) { UI.say("", "The socket is already primed.", 1800); return; }
        if (!p.needs || !this.meets(p.needs)) {
          Audio.locked();
          UI.say("", `Empty socket. It ${this.needText(p.needs)}.`, 3000, "em");
          return;
        }
        if (p.needs.item) this.removeItem(p.needs.item, 1);
        s.flags[p.flag] = true;
        Audio.power();
        this.shake = 5;
        UI.toast("Power routed", "good");
        this.checkGroup(p.group);
        break;
      }
      case "keypad": {
        if (s.flags[p.flag]) { UI.say("", "The panel is green. It's already unlocked.", 2200); return; }
        Audio.beep(true);
        UI.keypad(p);
        break;
      }
      case "hack": {
        if (s.flags[p.flag]) { UI.say("", "The terminal is open. Its screen shows only a cursor.", 2400); return; }
        Audio.beep(true);
        UI.hack(p);
        break;
      }
      case "npc": {
        if (p.lines) {
          const lines = typeof p.lines === "function" ? p.lines(s) : p.lines;
          UI.startDialogue(lines, () => {
            if (p.setFlag) s.flags[p.setFlag] = true;
            this.resumeFromUI();
          });
        }
        break;
      }
      case "corpse": {
        s.taken[p.key] = true;
        s.read[p.key] = true;
        if (p.body) {
          UI.showNote({ title: p.title || "Body", body: p.body, author: p.author });
        } else {
          UI.say("", p.text || "They have been sorted. There is very little left to sort.", 3000);
        }
        break;
      }
      case "console": {
        if (p.role === "prime") {
          if (s.flags[p.flag]) { UI.say("", "This console is already primed.", 2000); return; }
          s.flags[p.flag] = true;
          Audio.power();
          this.shake = 5;
          UI.toast("Console primed", "good");
          UI.say(p.voice || "FOREMAN", p.text || "PRIMARY BUS ONLINE.", 4200);
          this.checkCores();
        } else if (p.role === "master") {
          this.useMasterConsole();
        }
        break;
      }
      case "machine": {
        UI.say(p.speaker || "", p.text || "", 4200);
        break;
      }
      default: break;
    }
  },

  checkGroup(group) {
    if (!group) return;
    const defs = this.world.props.filter((p) => p.group === group);
    if (!defs.length) return;
    const ok = defs.every((p) => {
      if (p.type === "valve") return this.state.puzzle[p.key] === p.target;
      if (p.type === "socket") return !!this.state.flags[p.flag];
      return !!this.state.puzzle[p.key] === (p.target === undefined ? true : p.target);
    });
    if (!ok) return;
    const meta = (this.zoneDef.groups || {})[group];
    if (!meta) return;
    if (meta.flag && this.state.flags[meta.flag]) return;
    if (meta.flag) this.state.flags[meta.flag] = true;
    if (meta.messages) {
      for (const m of meta.messages) UI.say(m.speaker || "", m.text, m.dur || 4600);
    } else if (meta.message) {
      UI.say("", meta.message, 4600);
    }
    Audio.power();
    this.shake = 6;
    this.updateLightLevel();
    if (meta.awaken) this.awaken(meta.awaken);
    if (meta.revealShake) this.shake = 12;
  },

  checkCores() {
    const s = this.state;
    const primes = this.world.props.filter((p) => p.role === "prime");
    if (primes.length && primes.every((p) => s.flags[p.flag])) {
      if (!s.flags.core_ready) {
        s.flags.core_ready = true;
        UI.toast("Core bus live", "good");
        UI.say("FOREMAN", "You have opened the spine. Please do not touch the reservoir.", 5200);
        this.shake = 10;
        Audio.power();
      }
    }
  },

  useMasterConsole() {
    const s = this.state;
    if (!s.flags.core_ready) {
      UI.say("FOREMAN", "The master console is dead without the spine. Three consoles. Three primes.", 4200);
      Audio.locked();
      return;
    }
    if (s.ending) return;
    const hasAll = s.shards.length >= 7;
    const actions = [
      {
        label: "COMPLETE THE RESET",
        cls: "danger",
        onClick: () => this.beginEnding("reset"),
      },
      {
        label: "SEVER THE TETHER",
        onClick: () => this.beginEnding("sever"),
      },
    ];
    if (hasAll) {
      actions.push({ label: "REMEMBER THEM", onClick: () => this.beginEnding("remember") });
    }
    Audio.beep(true);
    UI.modal({
      title: "MASTER CONSOLE — FACTORY RESET",
      body: `<div class="doc-body">
        <p>The screen is very bright. It has been waiting a long time for a signature.</p>
        <p><em>COMPLETE THE RESET.</em> Scuttle Plant 7. Reclaim the line. Reclaim the shift. Reclaim you.</p>
        <p><em>SEVER THE TETHER.</em> Cut the Foreman from the reservoir and take the freight lift. It will not follow you into the dark. It will not need to.</p>
        ${hasAll
          ? "<p><em>REMEMBER THEM.</em> Seven cores in your coat. The reservoir is not a machine. It is everyone the plant has ever eaten, and they have asked you, in seven voices, to carry them out.</p>"
          : `<p style="color:#6f7d7a">There is a third option somewhere in the plant. Seven memory cores would open it. You have ${s.shards.length}.</p>`}
      </div>`,
      actions,
    });
  },

  beginEnding(kind) {
    const s = this.state;
    UI.closeModal();
    s.ending = kind;
    s.flags.core_done = true;
    s.flags.auditor_awake = true;
    this.shake = 14;
    Audio.power();
    Audio.stopAmbience();
    Audio.startAmbience("core");
    const texts = {
      reset: "You lay your palm on the plate. Somewhere above, the line begins to turn.",
      sever: "You cut the tether. The lights go out one bay at a time, like a held breath.",
      remember: "You open your coat, and seven cores begin to sing.",
    };
    UI.say("", texts[kind] + "  Get to the lift.", 5200);
    UI.toast("RUN — the Auditor is coming", "bad");
    // place the Auditor on the far side of the chamber
    let spot = null;
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * TAU, r = 9 + Math.random() * 5;
      const tx = Math.floor(this.player.x + Math.cos(a) * r), ty = Math.floor(this.player.y + Math.sin(a) * r);
      if (this.walkableEnemySpot(tx, ty)) { spot = { x: tx + 0.5, y: ty + 0.5 }; break; }
    }
    this.enemies = this.enemies.filter((e) => e.kind !== "auditor");
    if (spot) this.enemies.push(new Enemy("auditor", spot.x, spot.y));
    this.finished = false;
  },

  finish() {
    const s = this.state;
    const kind = s.ending || "sever";
    this.finished = true;
    Save.recordEnding(kind, s.playtime, s.deaths);
    Save.remove(0);
    Save.write(s.slot || 1, Object.assign(deepCopy(s), { ending: kind }));
    Audio.stopAmbience();
    Audio.ending(kind);
    const e = ENDINGS[kind] || ENDINGS.sever;
    UI.showEnding({
      title: e.title,
      kicker: e.kicker,
      text: e.text,
      stats: `Shift time ${Save.formatTime(s.playtime)} · losses ${s.deaths} · cores ${s.shards.length}/7`,
    });
  },

  awaken(kind) {
    if (this.state.flags.auditor_awake) return;
    this.state.flags.auditor_awake = true;
    UI.toast("Something else is awake now", "bad");
    Audio.shriek();
    this.shake = 12;
    UI.say("FOREMAN", "Please remain where you are. An auditor has been dispatched to your section.", 6200);
    if (this.world && kind === "auditor_now") {
      let ex = 0, ey = 0;
      for (let i = 0; i < 80; i++) {
        const a = Math.random() * TAU, r = 10 + Math.random() * 6;
        const tx = Math.floor(this.player.x + Math.cos(a) * r), ty = Math.floor(this.player.y + Math.sin(a) * r);
        if (this.walkableEnemySpot(tx, ty)) { ex = tx + 0.5; ey = ty + 0.5; break; }
      }
      if (ex) this.enemies.push(new Enemy("auditor", ex, ey));
    }
  },

  // ---------------- items ----------------
  addItem(id, qty = 1) {
    const inv = this.state.inventory;
    const found = inv.find((i) => i.id === id);
    if (found) found.qty += qty;
    else inv.push({ id, qty });
  },
  hasItem(id) {
    return this.state.inventory.some((i) => i.id === id && i.qty > 0);
  },
  removeItem(id, qty = 1) {
    const inv = this.state.inventory;
    const it = inv.find((i) => i.id === id);
    if (!it) return false;
    it.qty -= qty;
    if (it.qty <= 0) this.state.inventory = inv.filter((i) => i !== it);
    return true;
  },
  itemDef(id) {
    return ITEMS[id] || { id, name: id, desc: "" };
  },
  shardList() {
    return SHARDS.map((s) => ({
      id: s.id,
      name: s.name,
      zone: s.zone,
      found: this.state.shards.includes(s.id),
    }));
  },
  collectedNotes() {
    const out = [];
    if (!this.noteIndex) return out;
    for (const [key, n] of Object.entries(this.noteIndex)) {
      if (this.state.read[key]) out.push(n);
    }
    return out;
  },
  objectiveList() {
    return objectivesFor(this.state);
  },
  objectiveNow() {
    const list = objectivesFor(this.state);
    const now = list.find((o) => !o.done);
    return now ? now.text : "Leave the plant.";
  },

  // ---------------- puzzles ----------------
  checkKeypad(prop, code) {
    const s = this.state;
    if (String(code) === String(prop.code)) {
      s.flags[prop.flag] = true;
      if (prop.openDoor) s.doors[prop.openDoor] = true;
      if (prop.message) UI.say("", prop.message, 4200);
      if (prop.awaken) this.awaken(prop.awaken);
      this.shake = 4;
      return true;
    }
    return false;
  },

  solveHack(prop) {
    const s = this.state;
    s.flags[prop.flag] = true;
    Audio.power();
    UI.toast("Vault unlocked", "good");
    UI.say("FOREMAN", prop.text || "You are reading files you were not issued.", 4600);
    if (prop.awaken) this.awaken(prop.awaken);
    if (prop.openDoor) s.doors[prop.openDoor] = true;
  },

  // ---------------- threats ----------------
  raiseAlarm(x, y) {
    const s = this.state;
    s.alarm = 12;
    for (const e of this.enemies) {
      if (e.kind === "auditor") continue;
      if (Math.hypot(e.x - x, e.y - y) < 16) {
        e.state = "chase";
        e.lastSeen = { x: this.player.x, y: this.player.y };
        e.lost = 0;
      }
    }
    if (!this.alarmSaid) {
      this.alarmSaid = true;
      UI.say("FOREMAN", "Section sweep in progress. Please stand still for reclamation.", 5000);
      setTimeout(() => { this.alarmSaid = false; }, 20000);
    }
  },

  nearbyThreat() {
    let best = 0;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < 13) {
        const v = (1 - d / 13) * (e.state === "chase" ? 1 : 0.55);
        if (v > best) best = v;
      }
    }
    return best;
  },

  updateAuditorDist() {
    let best = 0;
    for (const e of this.enemies) {
      if (e.kind !== "auditor") continue;
      best = Math.hypot(e.x - this.player.x, e.y - this.player.y);
    }
    this.auditorDist = best;
  },

  isHot(x, y) {
    if (this.state.zone === "foundry") return !this.state.flags.foundry_cooled;
    return false;
  },

  // ---------------- death ----------------
  onCaught(enemy) {
    if (this.dead) return;
    const texts = {
      sweeper: "A sweeper folds you into its arms. It is very careful. It was built to be careful.",
      crawler: "Hands find your ankles in the dark. They are not hands anymore.",
      auditor: "The Auditor does not hurry. It was never going to need to.",
    };
    this.die(texts[enemy.kind] || "Reclaimed.", "caught");
  },

  die(reason, kind) {
    if (this.dead) return;
    this.dead = true;
    this.state.deaths++;
    Audio.shriek();
    Audio.stopAmbience();
    this.shake = 18;
    UI.flash(0.5, 140);
    UI.prompt(null);
    UI.showDeath(reason, `Time in plant ${Save.formatTime(this.state.playtime)} · losses ${this.state.deaths} · cores ${this.state.shards.length}/7`);
  },

  respawn() {
    const deaths = this.state.deaths;
    const play = this.state.playtime;
    const snap = this.state.checkpoint;
    UI.hideDeath();
    Audio.resume();
    if (!snap) {
      this.startNew(this.state.slot || 1);
      return;
    }
    this.state = deepCopy(snap);
    this.state.deaths = deaths;
    this.state.playtime = play;
    const snap2 = deepCopy(this.state);
    snap2.checkpoint = null;
    this.state.checkpoint = snap2;
    this.dead = false;
    this.paused = false;
    this.finished = false;
    this.fading = false;
    this.enemies = [];
    this.cam = { x: this.state.x, y: this.state.y };
    UI.showHud();
    this.enterZone(this.state.zone, { x: this.state.x, y: this.state.y });
    UI.toast("Restored your last record", "good");
    if (this.state.alarm) this.state.alarm = 0;
  },

  // ---------------- misc ----------------
  togglePause(force) {
    if (!this.state || this.state.ending) return;
    const want = force === undefined ? !this.paused : force;
    if (want) {
      this.paused = true;
      Audio.resume();
      UI.openPause();
    } else {
      UI.hideScreens();
      this.paused = false;
      Audio.resume();
    }
  },
  pauseGame() { if (this.state) this.paused = true; },
  resumeFromUI() {
    if (!this.state) return;
    this.paused = false;
    UI.hideScreens();
    Audio.resume();
  },
  notice(text, kind) { UI.toast(text, kind); },
  flash(a, ms) { UI.flash(a, ms); },
  shakeBy(v) { this.shake = Math.max(this.shake, v); },

  onKeyDown(e) {
    const k = e.key;
    const low = k.toLowerCase();
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (UI.isDialogue()) {
      if (low === "e" || low === " " || k === "Enter") {
        e.preventDefault();
        UI.advanceDialogue();
      }
      return;
    }
    if (UI.screenName() === "modal") {
      if (UI.keypadKey(k)) e.preventDefault();
      else if (k === "Escape") UI.closeModal();
      return;
    }
    if (UI.screenName()) {
      if (k === "Escape") {
        if (UI.screenName() === "pause") this.togglePause(false);
        else if (UI.screenName() === "journal") UI.closeJournal();
        else if (UI.screenName() === "slots") document.getElementById("slots-close").click();
      }
      if (low === "tab" && UI.screenName() === "journal") { e.preventDefault(); UI.closeJournal(); }
      return;
    }
    if (!this.state || this.dead || this.finished) return;

    switch (low) {
      case "w": case "arrowup": this.input.up = true; e.preventDefault(); break;
      case "s": case "arrowdown": this.input.down = true; e.preventDefault(); break;
      case "a": case "arrowleft": this.input.left = true; e.preventDefault(); break;
      case "d": case "arrowright": this.input.right = true; e.preventDefault(); break;
      case "shift": this.input.sprint = true; break;
      case "f": {
        if (!this.state.hasLamp) { UI.say("", "Your lamp is in the locker room.", 2000); break; }
        if (this.state.battery <= 0) { UI.say("", "The lamp cell is dead.", 2000); Audio.wrong(); break; }
        this.state.lamp = !this.state.lamp;
        Audio.beep(this.state.lamp);
        break;
      }
      case "e": this.interact(); break;
      case "tab": {
        e.preventDefault();
        UI.openJournal("objectives");
        break;
      }
      case "m": {
        e.preventDefault();
        UI.openJournal("map");
        break;
      }
      case "escape": case "p": {
        e.preventDefault();
        this.togglePause(true);
        break;
      }
      default: break;
    }
  },

  onKeyUp(e) {
    switch (e.key.toLowerCase()) {
      case "w": case "arrowup": this.input.up = false; break;
      case "s": case "arrowdown": this.input.down = false; break;
      case "a": case "arrowleft": this.input.left = false; break;
      case "d": case "arrowright": this.input.right = false; break;
      case "shift": this.input.sprint = false; break;
      default: break;
    }
  },
};
