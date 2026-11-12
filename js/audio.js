// All sound is generated with WebAudio. No audio assets, no network requests.
export const Audio = {
  ctx: null,
  master: null,
  muted: false,
  noiseBuf: null,
  amb: null,
  ambTimer: null,
  lastHeart: 0,
  tension: 0,

  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      this.makeNoise();
    } catch (e) {
      this.ctx = null;
    }
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  },

  ok() { return !!(this.ctx && this.master); },

  setMuted(v) {
    this.muted = !!v;
    if (this.ok()) this.master.gain.setTargetAtTime(v ? 0 : 0.55, this.ctx.currentTime, 0.05);
  },

  makeNoise() {
    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  },

  tone(o) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + (o.delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + (o.dur || 0.2));
    const peak = o.gain == null ? 0.12 : o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.2));
    osc.connect(g);
    let node = g;
    if (o.filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.filter;
      g.connect(f);
      node = f;
    }
    node.connect(this.master);
    osc.start(t);
    osc.stop(t + (o.dur || 0.2) + 0.05);
  },

  noise(o) {
    if (!this.ok() || !this.noiseBuf) return;
    const t = this.ctx.currentTime + (o.delay || 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = o.type || "bandpass";
    f.frequency.setValueAtTime(o.freq || 900, t);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.slide), t + (o.dur || 0.2));
    f.Q.value = o.q == null ? 0.9 : o.q;
    const g = this.ctx.createGain();
    const peak = o.gain == null ? 0.09 : o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.2));
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
    src.stop(t + (o.dur || 0.2) + 0.05);
  },

  // ---- ambience ----
  startAmbience(mode) {
    if (!this.ok()) return;
    this.stopAmbience();
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.075, t + 2.0);
    g.connect(this.master);

    const cfg = {
      hum: { base: 46, base2: 61, lp: 320, noise: 180, gain: 1 },
      foundry: { base: 38, base2: 57, lp: 260, noise: 420, gain: 1.25 },
      cold: { base: 34, base2: 51, lp: 200, noise: 300, gain: 1.1 },
      data: { base: 58, base2: 87, lp: 900, noise: 1400, gain: 0.8 },
      core: { base: 30, base2: 45, lp: 180, noise: 240, gain: 1.4 },
    }[mode] || { base: 44, base2: 60, lp: 300, noise: 200, gain: 1 };

    const nodes = [];
    [cfg.base, cfg.base2].forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      o.type = i === 0 ? "sawtooth" : "sine";
      o.frequency.value = freq;
      const lf = this.ctx.createBiquadFilter();
      lf.type = "lowpass";
      lf.frequency.value = cfg.lp;
      const og = this.ctx.createGain();
      og.gain.value = i === 0 ? 0.22 : 0.12;
      o.connect(lf); lf.connect(og); og.connect(g);
      o.start();
      nodes.push(o);
    });

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = "lowpass"; nf.frequency.value = cfg.noise;
    const ng = this.ctx.createGain(); ng.gain.value = 0.05 * cfg.gain;
    src.connect(nf); nf.connect(ng); ng.connect(g);
    src.start();
    nodes.push(src);

    this.amb = { g, nodes };

    // distant plant noises
    this.ambTimer = setInterval(() => {
      if (this.muted || !this.ok()) return;
      const r = Math.random();
      if (r < 0.34) {
        this.noise({ dur: 0.5, freq: 260, slide: 120, gain: 0.05, q: 0.7, delay: Math.random() * 0.2 });
        this.tone({ freq: 82, dur: 0.7, type: "sine", gain: 0.035, slide: 48 });
      } else if (r < 0.6) {
        this.tone({ freq: 1200, dur: 0.05, type: "square", gain: 0.012 });
      } else if (r < 0.78) {
        this.noise({ dur: 0.9, freq: 1600, slide: 300, gain: 0.02, q: 1.4 });
      }
    }, 5200);
  },

  stopAmbience() {
    if (this.ambTimer) { clearInterval(this.ambTimer); this.ambTimer = null; }
    if (this.amb && this.ok()) {
      const { g, nodes } = this.amb;
      const t = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      nodes.forEach((n) => { try { n.stop(t + 1.3); } catch (e) {} });
    }
    this.amb = null;
  },

  // ---- one-shots ----
  step(sprint) {
    this.noise({ dur: sprint ? 0.1 : 0.13, freq: sprint ? 1500 : 900, gain: sprint ? 0.055 : 0.035, q: 1.1, type: "lowpass" });
    this.tone({ freq: sprint ? 74 : 58, dur: 0.1, type: "sine", gain: 0.03, slide: 40 });
  },
  pickup() {
    this.tone({ freq: 740, dur: 0.09, type: "square", gain: 0.05 });
    this.tone({ freq: 1180, dur: 0.12, type: "sine", gain: 0.05, delay: 0.06 });
  },
  shard() {
    [520, 780, 1040, 1560].forEach((f, i) => this.tone({ freq: f, dur: 0.5, type: "sine", gain: 0.055, delay: i * 0.09 }));
    this.noise({ dur: 0.7, freq: 3200, slide: 800, gain: 0.02, delay: 0.05 });
  },
  door() {
    this.noise({ dur: 0.42, freq: 220, slide: 90, gain: 0.08, q: 0.6 });
    this.tone({ freq: 62, dur: 0.4, type: "square", gain: 0.045, slide: 38 });
  },
  locked() {
    this.tone({ freq: 130, dur: 0.13, type: "square", gain: 0.06 });
    this.tone({ freq: 96, dur: 0.18, type: "square", gain: 0.05, delay: 0.1 });
  },
  save() {
    this.tone({ freq: 523, dur: 0.2, type: "sine", gain: 0.07 });
    this.tone({ freq: 784, dur: 0.35, type: "sine", gain: 0.06, delay: 0.13 });
    this.noise({ dur: 0.2, freq: 2400, gain: 0.02, type: "highpass" });
  },
  beep(ok) {
    this.tone({ freq: ok ? 880 : 220, dur: 0.09, type: "square", gain: 0.05 });
  },
  wrong() {
    this.tone({ freq: 180, dur: 0.22, type: "sawtooth", gain: 0.06, slide: 92 });
    this.noise({ dur: 0.2, freq: 600, gain: 0.04 });
  },
  power() {
    this.tone({ freq: 40, dur: 1.4, type: "sawtooth", gain: 0.09, slide: 120, filter: 420 });
    this.noise({ dur: 0.5, freq: 300, slide: 2400, gain: 0.05 });
  },
  shriek() {
    this.tone({ freq: 1500, dur: 0.5, type: "sawtooth", gain: 0.09, slide: 240 });
    this.noise({ dur: 0.6, freq: 2400, slide: 500, gain: 0.07, q: 2 });
  },
  hurt() {
    this.noise({ dur: 0.3, freq: 420, slide: 120, gain: 0.1 });
    this.tone({ freq: 90, dur: 0.24, type: "square", gain: 0.05, slide: 45 });
  },
  heartbeat(intensity) {
    if (!this.ok()) return;
    const now = this.ctx.currentTime;
    if (now - this.lastHeart < 0.42) return;
    this.lastHeart = now;
    const g = 0.045 + intensity * 0.075;
    this.tone({ freq: 54, dur: 0.16, type: "sine", gain: g, slide: 36 });
    this.tone({ freq: 46, dur: 0.14, type: "sine", gain: g * 0.75, slide: 32, delay: 0.17 });
  },
  hit() {
    this.noise({ dur: 0.22, freq: 900, slide: 120, gain: 0.1 });
  },
  ending(kind) {
    if (kind === "remember") {
      [262, 330, 392, 523, 659].forEach((f, i) => this.tone({ freq: f, dur: 2.4, type: "sine", gain: 0.05, delay: i * 0.28 }));
    } else if (kind === "reset") {
      this.tone({ freq: 90, dur: 4, type: "sawtooth", gain: 0.07, slide: 30, filter: 300 });
      this.noise({ dur: 3.5, freq: 400, slide: 60, gain: 0.06 });
    } else {
      this.tone({ freq: 180, dur: 3, type: "triangle", gain: 0.05, slide: 120 });
      this.noise({ dur: 2.2, freq: 800, slide: 200, gain: 0.04 });
    }
  },
};
