// Touch controls for phones and tablets: virtual stick, drag-look and actions.
import { UI } from "./ui.js";
import { Audio } from "./audio.js";

let G = null;
let on = false;
let stickId = null;
let lookId = null;
let origin = { x: 0, y: 0 };
let lookPrev = { x: 0, y: 0 };
let lookStart = { x: 0, y: 0, t: 0 };
let layer = null;

const STICK_R = 52;

function setMove(mx, my) {
  G.input.mx = mx;
  G.input.my = my;
  const mag = Math.hypot(mx, my);
  G.input.sprint = mag > 0.92;
}

function moveKnob(dx, dy) {
  const knob = document.getElementById("stick-knob");
  if (!knob) return;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

export const Touch = {
  init(game) {
    G = game;
    on = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    document.body.classList.toggle("touch", on);
    document.body.dataset.touch = on ? "1" : "0";
    layer = document.getElementById("touch");
    if (!on) return;

    const stick = document.getElementById("stick");
    if (stick) {
      stick.addEventListener("pointerdown", (e) => {
        if (stickId !== null) return;
        e.preventDefault();
        stickId = e.pointerId;
        stick.setPointerCapture(e.pointerId);
        const r = stick.getBoundingClientRect();
        origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        Audio.resume();
      });
      stick.addEventListener("pointermove", (e) => {
        if (e.pointerId !== stickId) return;
        e.preventDefault();
        let dx = e.clientX - origin.x;
        let dy = e.clientY - origin.y;
        const mag = Math.hypot(dx, dy);
        if (mag > STICK_R) {
          dx = (dx / mag) * STICK_R;
          dy = (dy / mag) * STICK_R;
        }
        moveKnob(dx, dy);
        setMove(dx / STICK_R, -dy / STICK_R);
      });
      const release = (e) => {
        if (e.pointerId !== stickId) return;
        stickId = null;
        moveKnob(0, 0);
        setMove(0, 0);
        G.input.sprint = false;
      };
      stick.addEventListener("pointerup", release);
      stick.addEventListener("pointercancel", release);
    }

    const look = document.getElementById("touch-look");
    if (look) {
      look.addEventListener("pointerdown", (e) => {
        if (lookId !== null) return;
        e.preventDefault();
        Audio.resume();
        lookId = e.pointerId;
        look.setPointerCapture(e.pointerId);
        lookPrev = { x: e.clientX, y: e.clientY };
        lookStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      });
      look.addEventListener("pointermove", (e) => {
        if (e.pointerId !== lookId) return;
        e.preventDefault();
        const dx = e.clientX - lookPrev.x;
        lookPrev = { x: e.clientX, y: e.clientY };
        if (G.state && G.player && !G.paused && !UI.screenName()) {
          G.player.dir += dx * 0.0062;
        }
      });
      const lookEnd = (e) => {
        if (e.pointerId !== lookId) return;
        lookId = null;
        const moved = Math.hypot(e.clientX - lookStart.x, e.clientY - lookStart.y);
        const quick = performance.now() - lookStart.t < 320;
        if (moved < 10 && quick) tapAction();
      };
      look.addEventListener("pointerup", lookEnd);
      look.addEventListener("pointercancel", () => { lookId = null; });
    }

    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        Audio.resume();
        fn();
      });
    };
    bind("tb-use", () => {
      if (UI.isDialogue()) UI.advanceDialogue();
      else if (!UI.screenName() && !G.paused) G.interact();
    });
    bind("tb-lamp", () => { if (!UI.screenName()) G.toggleLamp(); });
    bind("tb-journal", () => {
      if (G.state && !G.paused) UI.openJournal("objectives");
      else UI.openJournal("objectives");
    });
    bind("tb-pause", () => { if (G.state && !G.state.ending) G.togglePause(); });
    bind("tb-run", () => {
      const r = document.getElementById("tb-run");
      const next = !G.input.runToggle;
      G.input.runToggle = next;
      G.input.sprint = next;
      if (r) r.classList.toggle("active", next);
    });

    // the interaction prompt says E on a keyboard; on a phone it should say USE
    const prompt = document.getElementById("prompt");
    if (prompt) {
      const badge = prompt.querySelector("b");
      const fix = () => { if (badge && badge.textContent !== "USE") badge.textContent = "USE"; };
      new MutationObserver(fix).observe(prompt, { attributes: true, attributeFilter: ["class"] });
      fix();
    }

    // tapping anywhere while a line is showing advances it
    document.addEventListener("pointerdown", (e) => {
      if (UI.isDialogue() && e.target && !e.target.closest("#screen-modal")) {
        UI.advanceDialogue();
      }
    }, true);
  },

  isTouch() { return on; },

  // called every frame by the game loop
  sync() {
    if (!on || !layer) return;
    const open = !G.state || G.dead || G.finished || G.fading || UI.screenName() === "title";
    layer.classList.toggle("dim", !!open);
    const runBtn = document.getElementById("tb-run");
    if (runBtn) runBtn.classList.toggle("active", !!G.input.runToggle);
  },
};

function tapAction() {
  if (!G.state) return;
  if (UI.isDialogue()) { UI.advanceDialogue(); return; }
  if (UI.screenName()) return;
  if (G.paused) return;
  G.interact();
}
