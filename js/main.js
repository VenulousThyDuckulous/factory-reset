import { Game } from "./game.js";

window.addEventListener("error", (e) => {
  const hud = document.getElementById("hud");
  if (hud) hud.classList.add("hidden");
  document.body.insertAdjacentHTML(
    "beforeend",
    '<div style="position:fixed;inset:0;z-index:999;background:#07080a;color:#e2b25a;font:12px monospace;padding:32px;white-space:pre-wrap">FACTORY RESET failed to start.\n\n' +
      String((e.error && e.error.stack) || e.message) +
      "</div>"
  );
});

Game.boot();

// handy for debugging in the console; harmless in play
window.FACTORY = Game;
