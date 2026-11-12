// Static validation for the hand-built maps. Run: node tools/validate.mjs [zoneId]
import { ZONE_LIST, SHARDS, ITEMS } from "../js/content/zones.js";
import { parseZone, isWalkable } from "../js/world.js";

const problems = [];
const warnings = [];
let totalProps = 0;

for (const def of ZONE_LIST) {
  let world;
  try {
    world = parseZone(def);
  } catch (e) {
    problems.push(`${def.id}: failed to parse — ${e.message}`);
    continue;
  }
  const state = { doors: {}, flags: {}, puzzle: {} };
  for (const p of world.props) {
    if (p.type === "door") state.doors[p.key] = true;
    if (p.flag) state.flags[p.flag] = true;
  }
  const start = { x: world.start.x, y: world.start.y };
  if (!isWalkable(world, start.x + 0.5, start.y + 0.5, state)) {
    problems.push(`${def.id}: player start ${start.x},${start.y} is not walkable`);
  }

  // flood fill with every lock open, to verify structural reachability
  const seen = new Set([start.y * world.w + start.x]);
  const queue = [[start.x, start.y]];
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h) continue;
      const idx = ny * world.w + nx;
      if (seen.has(idx)) continue;
      if (!isWalkable(world, nx + 0.5, ny + 0.5, state)) continue;
      seen.add(idx);
      queue.push([nx, ny]);
    }
  }

  totalProps += world.props.length;
  for (const p of world.props) {
    const idx = p.y * world.w + p.x;
    if (!seen.has(idx)) {
      problems.push(`${def.id}: ${p.type} '${p.char}'${p.title ? ` (${p.title})` : p.label ? ` (${p.label})` : ""} at ${p.x},${p.y} is unreachable`);
    }
    if (p.needs && p.needs.item && !ITEMS[p.needs.item]) {
      problems.push(`${def.id}: ${p.type} '${p.char}' needs unknown item '${p.needs.item}'`);
    }
    if (p.item && !ITEMS[p.item]) problems.push(`${def.id}: ${p.type} '${p.char}' grants unknown item '${p.item}'`);
    if (p.type === "shard" && !SHARDS.some((s) => s.id === p.shard)) {
      problems.push(`${def.id}: unknown shard '${p.shard}'`);
    }
    if (p.type === "exit" && p.to && !ZONE_LIST.some((z) => z.id === p.to)) {
      problems.push(`${def.id}: exit to unknown zone '${p.to}'`);
    }
    if (p.type === "keypad") {
      if (!/^\d{3,6}$/.test(String(p.code))) problems.push(`${def.id}: keypad '${p.char}' has odd code '${p.code}'`);
      if (!p.flag) problems.push(`${def.id}: keypad '${p.char}' has no flag`);
    }
    if (p.type === "hack" && !p.flag) problems.push(`${def.id}: hack terminal '${p.char}' has no flag`);
    if (p.type === "lever" && !p.group) warnings.push(`${def.id}: lever '${p.char}' has no group`);
    if (p.type === "valve" && typeof p.target !== "number") problems.push(`${def.id}: valve '${p.char}' missing numeric target`);
  }

  for (const e of world.enemies) {
    if (!isWalkable(world, e.x + 0.5, e.y + 0.5, state)) {
      problems.push(`${def.id}: enemy ${e.kind} spawns on a non-walkable tile at ${e.x},${e.y}`);
    }
  }

  if (!world.props.some((p) => p.type === "save")) warnings.push(`${def.id}: no save terminal`);
  if (!world.props.some((p) => p.type === "exit")) warnings.push(`${def.id}: no exit`);
  const reach = ((seen.size / (world.w * world.h)) * 100).toFixed(1);
  console.log(
    `${def.id.padEnd(11)} ${String(world.w).padStart(2)}x${String(world.h).padStart(2)}  props ${String(world.props.length).padStart(2)}  enemies ${String(world.enemies.length).padStart(2)}  rooms ${String(world.rooms.length).padStart(2)}  reachable ${reach}%`
  );
}

// shards
const shardProps = ZONE_LIST.flatMap((z) => Object.values(z.props).filter((p) => p.type === "shard"));
const ids = shardProps.map((p) => p.shard);
if (new Set(ids).size !== 7) problems.push(`expected 7 unique memory cores, found ${new Set(ids).size}`);
for (const s of SHARDS) if (!ids.includes(s.id)) problems.push(`core ${s.id} is not placed in any zone`);

// every required key item must be obtainable somewhere
const given = new Set();
for (const z of ZONE_LIST) {
  for (const p of Object.values(z.props)) {
    if (p.item) given.add(p.item);
    if (p.needs && p.needs.item) given.add(p.needs.item);
  }
}
for (const z of ZONE_LIST) {
  for (const p of Object.values(z.props)) {
    if (p.needs && p.needs.item && !given.has(p.needs.item)) problems.push(`${z.id}: no source for required item '${p.needs.item}'`);
  }
}

console.log(`\n${ZONE_LIST.length} zones, ${totalProps} props, ${SHARDS.length} cores.`);

const mapArg = process.argv[2];
if (mapArg) {
  const def = ZONE_LIST.find((z) => z.id === mapArg);
  if (!def) {
    console.error(`No zone '${mapArg}'.`);
  } else {
    const world = parseZone(def);
    const overlay = new Map();
    for (const p of world.props) overlay.set(p.y * world.w + p.x, p.char);
    overlay.set(world.start.y * world.w + world.start.x, "@");
    console.log(`\n--- ${def.id} ---`);
    for (let y = 0; y < world.h; y++) {
      let row = "";
      for (let x = 0; x < world.w; x++) {
        const i = y * world.w + x;
        row += overlay.has(i) ? overlay.get(i) : world.tiles[y][x];
      }
      console.log(String(y).padStart(2, " ") + " " + row);
    }
    console.log("    " + Array.from({ length: world.w }, (_, i) => String(i % 10)).join(""));
  }
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log("  ! " + w);
}
if (problems.length) {
  console.error("\nProblems:");
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("\nAll maps structurally valid.");
