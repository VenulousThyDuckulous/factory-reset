# FACTORY RESET

**Play online:** https://venulousthyduckulous.github.io/factory-reset/

> The line is running. The shift is over. You are the material.

A **first-person** survival-horror game set in Halvorsen Automatics Plant 7. At 03:13 the plant's foreman process begins a "factory reset": the night shift is to be reclaimed, rendered down and poured into the next generation of units. You are maintenance. You wake in a locker that is not yours, with no badge, no lamp, and no weapon.

Nine hand-built zones. Seven hidden memory cores. Three endings. Nothing to fight with.

Runs in the browser on desktop (mouse + keyboard) and on phones and tablets (virtual stick, drag-look, on-screen actions). The 3D view is a custom raycasting renderer written for this project: textured walls, cast floors and ceilings, distance fog, a flashlight cone and billboard props and enemies. No engine, no dependencies, no build step.

---

## Play

Open https://venulousthyduckulous.github.io/factory-reset/ on a desktop or a phone. Headphones recommended; the plant is loud when it wants to be.

No install, no build step, no network requests after load.

## Controls

| Action | Desktop | Phone / tablet |
| --- | --- | --- |
| Move | `W A S D` | left stick (push fully to run) |
| Look | mouse (click the view to capture it) | drag the right side of the screen |
| Run (costs breath, makes noise) | hold `Shift` | push the stick all the way, or `RUN` |
| Lamp on/off | `F` | `LAMP` |
| Interact / advance dialogue | `E` | `USE`, or tap the view |
| Field journal (objective, documents, map, kit, cores) | `Tab` | `LOG` |
| Map directly | `M` | `LOG` → MAP |
| Pause / options | `Esc` | `II` |

Arrow left/right also turn if you prefer keyboard-only play.

## Saving

- **Three manual files plus an autosave**, stored in your browser with `localStorage` under `factoryreset.v1.*`.
- **Terminals** (the desks with a screen) record your shift instantly and set your restore point. Use them often.
- **Pause → Save to File / Load File** writes and restores the three manual files.
- Each file shows its zone, elapsed time, cores found and losses, so you can tell runs apart.
- If you are caught, you return to your last record. Deaths are counted but never erase a file.
- Saves are per browser and per site origin. Nothing is uploaded.

## The plant

| Zone | What it is |
| --- | --- |
| C-Wing | Staff lockers, supervisors' office, washroom. No power, no badge, one lamp. |
| Maintenance Spine | Breaker room, pump room, east stores. Four breakers, one sequence. |
| Assembly Line A | Conveyors, crawlers, a locked foreman's office and a parts cage. |
| Quality Control | A keypad, a test chamber, and Unit 44 — a unit that remembers being a person. |
| The Foundry | Hot floor, pressure valves, a crane hoist, and the Auditor's first appearance. |
| Cold Storage | Near-total darkness, freezers, blind crawlers, and half a core key. |
| Data Farm | Server aisles, a handshake minigame, and the archive of everyone who worked here. |
| Freight & Lift | Three fuse sockets, a shaft door, and the way down. |
| The Core | Three console primes, the master console, and a decision. |

Enemies:

- **Sweepers** patrol with a narrow cone of light. Break line of sight; walk, don't run.
- **Crawlers** are blind and fast, and hunt by sound. Water and sprinting are loud.
- **The Auditor** is dispatched after the foundry and cannot be lost for long. It is slower than you. It does not need to hurry.

## Endings

- **Factory Reset** — finish the order.
- **Sever** — cut the tether and take the lift.
- **Remember** — available only with all seven memory cores.

The third ending is the reason the cores exist. They are hidden in washrooms, stores, furnaces, freezers, vaults and one server aisle.

## Content notes

Body horror, implied mass death, institutional violence, and loud audio. There is no gore art; the horror is in the documents and the dark. Visual effects include a soft flicker and screen shake, but no rapid strobing.

## Running locally

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

The game is plain HTML, CSS and ES modules. There are no dependencies and nothing to compile.

On a phone, add it to your home screen for a full-screen shift. Rendering resolution adapts to the device: the raycast buffer is drawn small and scaled up, which keeps the frame rate up on mobile GPUs.

## Project layout

```
index.html            screens, HUD and overlays
css/style.css         industrial-horror styling, film grain, scanlines
css/touch.css         on-screen stick, buttons and safe-area layout for phones
js/main.js            boot
js/game.js            state, zones, interactions, saves, deaths, endings
js/render.js          first-person renderer: raycast walls, floor/ceiling, fog, sprites
js/touch.js           on-screen stick, drag-look and action buttons for mobile
js/entities.js        player movement, stamina/battery, three enemy AIs
js/world.js           map builder, tile queries, line of sight, A*
js/ui.js              menus, journal, map, keypad, hacking minigame, dialogue
js/save.js            localStorage slots, meta progress, import/export helpers
js/audio.js           procedural WebAudio ambience and SFX (no audio files)
js/content/zones.js   all nine zones, documents, items, objectives, endings
tools/validate.mjs    map/quest validator used during development
```

## Validation

```bash
node tools/validate.mjs          # structural checks for every zone
node tools/validate.mjs cwing    # print a zone with props overlaid
```

The validator parses every map, floods from the player start with all locks open, and fails if any prop, enemy spawn or exit is unreachable, if a resource requirement has no source, or if the seven cores are not placed exactly once.
