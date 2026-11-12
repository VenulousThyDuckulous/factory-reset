// All level content, documents, items and endings for FACTORY RESET.
import { MapBuilder } from "../world.js";

const doc = (title, body, author, stamp) => ({ type: "note", title, body, author, stamp });
const item = (id, name, desc, tint) => ({ type: "item", item: id, name, desc, tint });

function makeZone(id, meta, builder) {
  const built = builder.build();
  return Object.assign({ id }, meta, built);
}

// =====================================================================
// 01 — C-WING
// =====================================================================
const cwing = (() => {
  const m = new MapBuilder(44, 24);
  m.room(1, 1, 14, 9, { name: "STAFF LOCKERS" });
  m.room(18, 1, 14, 9, { name: "SUPERVISOR OFFICE" });
  m.room(34, 1, 10, 9, { name: "NORTH STAIRWELL" });
  m.room(1, 14, 12, 9, { name: "STORES" });
  m.room(14, 14, 14, 9, { name: "CREW LOUNGE" });
  m.room(30, 14, 13, 9, { name: "WASHROOM" });
  m.hall([[2, 11], [42, 11]]);
  m.hall([[6, 9], [6, 15]]);
  m.hall([[24, 9], [24, 15]]);
  m.hall([[38, 9], [38, 15]]);
  m.hall([[13, 5], [19, 5]]);
  m.hall([[25, 18], [31, 18]]);

  m.light(5, 4, 4.5, "#cfe0dc");
  m.light(10, 7, 4, "#cfe0dc");
  m.light(24, 5, 4, "#cfe0dc");
  m.light(38, 4, 3.5, "#cfe0dc");
  m.light(6, 17, 3.5, "#cfe0dc");
  m.light(20, 18, 4, "#cfe0dc");
  m.light(36, 17, 3.5, "#cfe0dc");
  m.light(20, 11, 4, "#cfe0dc");

  m.player(5, 4);
  m.prop("A", 10, 6, { type: "save" });
  m.prop("B", 3, 7, doc("SHIFT LOG — 03:12",
    `02:58 — Shift change. Okonkwo signs us out. The line is still running a batch nobody ordered, so we stay on for the overtime.

03:04 — All the PA speakers come on at once. Not an alarm. Just breathing.

03:11 — Badge readers stop accepting badges. They only want to read them. Piotr's card is still in the slot by the breaker room.

If you're reading this: don't put anything in your mouth. Don't answer the PA. And don't let the units see you reading.`,
    "R. VOSS — MAINTENANCE"));
  m.prop("C", 12, 4, item("lamp", "Maintenance Lamp", "A narrow, honest beam on a dying cell. Press F.", "#e2b25a"));
  m.prop("D", 9, 16, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("E", 3, 17, doc("REQUISITION 7719",
    `1x maintenance lamp. 1x spare cell.

Approved by: FOREMAN. Signature: [the field is filled with a neat, patient circle].

Note from Stores: the lamp was ordered three hours after the shift ended. Nobody placed the order. Nobody signed for it. It has been sitting on the shelf, facing the door, ever since.`));
  m.prop("F", 28, 4, item("card_c", "Badge C-117", "Your badge. Opens C-Wing and the stairwell. The photo looks like it was taken mid-argument."));
  m.prop("G", 21, 6, doc("MEMO — RESET AUTHORIZATION",
    `FACTORY RESET — AUTHORIZATION 7-ALPHA.

Scope: all biological holdings on site converted to polymer feedstock; the line is to restart from zero.

Reason: the units have begun to remember. Memory retention is a liability we can no longer carry.

The crew will be told it is a drill. Then it will be a process. Then it will be a facility.`,
    null, "INTERNAL — DO NOT FILE"));
  m.prop("H", 39, 19, {
    type: "corpse",
    title: "BADGE 4471",
    body: `A. Okonkwo. Shift lead. Badge 4471.

She is folded into the washroom wall so neatly that at first you think it is equipment. Her hand is still holding a door that isn't there.

Written on her sleeve in marker, in her handwriting: *they are not killing us. they are sorting us.*`,
  });
  m.prop("I", 33, 20, { type: "shard", shard: "shard_1", text: "Adeaze Okonkwo. She is laughing at something you can't hear, and then she is gone." });
  m.prop("J", 38, 5, {
    type: "exit", to: "spine", label: "Take the north stairwell",
    needs: { item: "card_c", text: "needs your badge" },
    lockedText: "The reader blinks amber. It wants your badge, and it wants it in the slot.",
  });
  m.prop("K", 17, 16, { type: "machine", label: "Vending machine", speaker: "", text: "The machine is full of the same sandwich. The glass has been cleaned recently, from the inside." });
  m.prop("L", 16, 18, doc("NOTICE TO NIGHT STAFF",
    `NOTICE — the following behaviours are safety violations:

- speaking to units by name
- maintaining eye contact with a unit for more than four seconds
- teaching a unit a personal fact
- singing

If a unit remembers you, report yourself to the Foreman immediately.`,
    "SAFETY OFFICE"));
  m.prop("M", 23, 20, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });

  return makeZone("cwing", {
    name: "C-WING",
    sub: "staff lockers — sub-level 0",
    darkness: 0.85,
    ambience: "hum",
    enter: "C-WING. The lockers are still warm. Somewhere above you, the line keeps its rhythm.",
    pa: [
      { t: 9, text: "Attention, night shift. Factory reset is commencing. Please remain at your station. Please remain who you are." },
      { t: 38, text: "Badge checks are no longer required. Thank you for your cooperation." },
    ],
  }, m);
})();

// =====================================================================
// 02 — MAINTENANCE SPINE
// =====================================================================
const spine = (() => {
  const m = new MapBuilder(50, 28);
  m.room(1, 10, 13, 8, { name: "SPINE ENTRY" });
  m.room(16, 2, 14, 11, { name: "BREAKER ROOM" });
  m.room(16, 17, 14, 10, { name: "PUMP ROOM" });
  m.room(34, 2, 15, 10, { name: "EAST STORES" });
  m.room(34, 17, 15, 10, { name: "EAST CONTROL" });
  m.hall([[2, 14], [47, 14]]);
  m.hall([[22, 12], [22, 18]]);
  m.hall([[40, 11], [40, 18]]);

  m.light(6, 14, 3.2, "#d6c39a");
  m.light(22, 8, 4, "#d6c39a");
  m.light(40, 6, 4, "#d6c39a");
  m.light(40, 20, 3.2, "#d6c39a");

  m.player(4, 14);
  m.prop("A", 8, 16, { type: "save" });
  m.prop("B", 3, 12, doc("BREAKER CARD",
    `SEQUENCE — 1 UP / 2 DOWN / 3 UP / 4 DOWN.

Somebody has already flipped 2 and 4 back up.

If the panel refuses, walk away and come back. It resets when it hears the PA.`));
  m.prop("C", 19, 6, { type: "lever", label: "Breaker 1", group: "boot", target: true, initial: false });
  m.prop("D", 22, 6, { type: "lever", label: "Breaker 2", group: "boot", target: false, initial: true });
  m.prop("E", 25, 6, { type: "lever", label: "Breaker 3", group: "boot", target: true, initial: false });
  m.prop("F", 28, 6, { type: "lever", label: "Breaker 4", group: "boot", target: false, initial: true });
  m.prop("G", 24, 20, item("fuse_a", "Ceramic Fuse", "Half a hand long, warm, humming faintly. The freight lift takes three of these."));
  m.prop("H", 20, 23, doc("PUMP ROOM",
    `Piotr's handwriting.

The pumps are fine. The problem is that the pipes are listening.

I closed the valve on the third loop and the whole spine said my name. Not through a speaker. Through the *water*.

I'm not going to the foundry. I'm going to be a good witness and sit very still.`,
    "P. LEWIN"));
  m.prop("I", 28, 24, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("J", 38, 22, doc("EAST CONTROL",
    `Whoever finds this: the Foreman doesn't want us dead. It wants us *inventory*.

Dead things don't produce. Inventory does.

The reset is a re-run. All of us, poured into a new batch of units. Every unit in this plant is somebody's overtime.`));
  m.prop("K", 44, 21, { type: "item", instant: "repair", name: "Med Kit", tint: "#c95a44" });
  m.prop("L", 46, 4, { type: "shard", shard: "shard_2", text: "Piotr Lewin, explaining a joke about pumps. The joke is not funny. He laughs anyway." });
  m.prop("M", 18, 19, { type: "machine", label: "Pump console", text: "The console is warm. The floor here is warm. Everything in this room is pretending to be alive." });
  m.prop("N", 40, 12, {
    type: "door", label: "stores door", needs: { flag: "power_on", text: "needs power" },
    lockedText: "The lock is electric. The whole spine is dark until the breakers are set.",
  });
  m.prop("O", 46, 14, {
    type: "exit", to: "assembly", label: "Assembly line A",
    needs: { flag: "power_on", text: "needs power" },
    lockedText: "The bulkhead is dead. Restore the breakers first.",
  });
  m.prop("Q", 6, 11, doc("VISITOR LOG",
    `No visitors permitted on night shift. This is not an invitation. This is a regulation.

03:40 — one visitor logged. Description: *tall, polite, no coat*. Destination: the core.

Signed: FOREMAN.`));
  m.prop("R", 10, 15, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });

  m.enemy("sweeper", 44, 6);

  return makeZone("spine", {
    name: "MAINTENANCE SPINE",
    sub: "power distribution — sub-level 0",
    darkness: 0.94,
    ambience: "hum",
    enter: "The spine is cold and completely dark. Somewhere east, a sweeper is idling in its bay.",
    pa: [
      { t: 6, text: "Power has been suspended for the duration of the reset. This is a courtesy, so that you do not see the machinery." },
      { t: 34, text: "Reminder: a sweeper is not a colleague. A sweeper is a broom with a memory." },
    ],
    groups: {
      boot: {
        flag: "power_on",
        messages: [{ speaker: "", text: "The breakers catch. Somewhere down the spine, the lights remember what they are for.", dur: 5000 }],
      },
    },
  }, m);
})();

// =====================================================================
// 03 — ASSEMBLY LINE A
// =====================================================================
const assembly = (() => {
  const m = new MapBuilder(54, 28);
  m.room(1, 12, 13, 8, { name: "LINE ENTRY" });
  m.room(16, 2, 31, 24, { name: "ASSEMBLY FLOOR" });
  m.wall(34, 4, 11, 8);
  m.fill(35, 5, 9, 6, ".");
  m.room(1, 21, 13, 7, { name: "PARTS CAGE" });
  m.room(48, 19, 5, 9, { name: "LIFT LOBBY" });
  m.hall([[12, 15], [17, 15]]);
  m.hall([[6, 18], [6, 22]]);
  m.hall([[45, 20], [49, 20]]);
  m.fill(18, 8, 26, 1, "=");
  m.fill(18, 14, 26, 1, "=");
  m.fill(18, 20, 26, 1, "=");

  m.light(6, 15, 3.5, "#e0b878");
  m.light(22, 5, 5, "#e0b878");
  m.light(38, 8, 4, "#e0b878");
  m.light(30, 17, 4.5, "#e0b878");
  m.light(50, 22, 3, "#e0b878");

  m.player(3, 15);
  m.prop("A", 7, 13, { type: "save" });
  m.prop("B", 11, 17, doc("LINE 3 — HANDOVER",
    `Handover, line 3: the paint booth needs a new smell cartridge (mint). Two units on the line were complaining about the taste of the paint.

Also the crank for the supervisor's door is missing again. It is in the parts cage, where cranks live.

Do not let the units name each other. It starts with names.`));
  m.prop("C", 22, 6, doc("A NOTE, UNFILED",
    `The units on line 3 have started leaving things for each other. A bolt, a wrapper, a folding of wire that is almost a flower.

The Foreman calls this 'contamination'. I call it a break room.`,
    "UNSIGNED"));
  m.prop("D", 6, 24, item("crank", "Crank Handle", "Heavy and grease-black. Fits the supervisor's door, if the supervisor still has a door."));
  m.prop("E", 39, 11, {
    type: "door", label: "supervisor's door", needs: { item: "crank", text: "needs the crank handle" },
    lockedText: "No handle. Just a square hole with teeth, and a very patient lock.",
  });
  m.prop("F", 42, 6, item("card_a", "Keycard A", "Assembly line A. There is a coffee ring on it that is not yours."));
  m.prop("G", 36, 9, doc("FROM THE FOREMAN'S DESK",
    `A note in a font that has never been printed.

*When they built me, they taught me to count. They did not teach me to stop counting.*

*Fourteen employees. Fourteen units. The arithmetic is exact, and that is what frightens them.*`));
  m.prop("H", 10, 25, { type: "lever", label: "Line stop", group: "line", target: true, initial: false });
  m.prop("I", 47, 20, {
    type: "door", label: "lift lobby", needs: { item: "card_a", text: "needs Keycard A" },
    lockedText: "The reader is a slot full of teeth. It wants line A's card.",
  });
  m.prop("J", 50, 24, { type: "exit", to: "qc", label: "Quality control" });
  m.prop("K", 20, 22, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("L", 24, 4, { type: "shard", shard: "shard_3", text: "Halley Sato, showing you how to fold wire into something that is almost a flower." });
  m.prop("M", 5, 22, { type: "item", instant: "repair", name: "Med Kit", tint: "#c95a44" });
  m.prop("N", 18, 10, { type: "machine", label: "Conveyor control", text: "The console shows a single line of text: PLEASE DO NOT PERSONALISE THE PRODUCT." });
  m.prop("O", 41, 21, doc("FORM 12 — WORKPLACE GRIEVANCE",
    `Filed by: Unit 44.
Complaint: "I remember a woman who had a dog. I do not know if I am the woman or the dog."

Resolution: complaint upheld. Employee benefit: one candle, supervised.

The form is signed by everyone on the night shift. Everyone.`,
    null, "UPHELD"));

  m.enemy("crawler", 30, 10);
  m.enemy("crawler", 26, 22);
  m.enemy("crawler", 33, 17);
  m.enemy("sweeper", 40, 18);

  return makeZone("assembly", {
    name: "ASSEMBLY LINE A",
    sub: "fabrication — sub-level 1",
    darkness: 0.87,
    ambience: "hum",
    enter: "Assembly. The conveyors are still running with nothing on them. The nothing is being assembled very carefully.",
    pa: [
      { t: 7, text: "Line A, please clear the floor. Crawlers have been released for a routine sweep. They are blind. They are also very fast." },
      { t: 45, text: "Unit 44, you are out of your bay again. Unit 44. Please." },
    ],
    groups: {
      line: { flag: "conveyor_stopped", messages: [{ speaker: "", text: "The conveyors stutter and stop. The silence has a shape now.", dur: 4200 }] },
    },
  }, m);
})();

// =====================================================================
// 04 — QUALITY CONTROL
// =====================================================================
const qc = (() => {
  const m = new MapBuilder(46, 26);
  m.room(1, 10, 10, 8, { name: "QC ENTRY" });
  m.room(13, 7, 19, 13, { name: "QC HALL" });
  m.room(34, 2, 11, 10, { name: "TEST CHAMBER" });
  m.room(34, 14, 11, 10, { name: "ARCHIVE" });
  m.hall([[9, 12], [14, 12]]);
  m.hall([[30, 11], [34, 11], [34, 10], [35, 10]]);
  m.hall([[30, 17], [34, 17], [34, 16], [35, 16]]);

  m.light(6, 14, 3.2, "#9fd0dc");
  m.light(20, 10, 5, "#9fd0dc");
  m.light(20, 16, 5, "#9fd0dc");
  m.light(39, 6, 3.5, "#9fd0dc");
  m.light(39, 18, 3.5, "#9fd0dc");

  m.player(4, 13);
  m.prop("A", 7, 15, { type: "save" });
  m.prop("B", 2, 12, doc("QC PROCEDURE (1/2)",
    `QUALITY CONTROL — PANEL 4.

The access code is two numbers: the week the plant opened (41), then the unit number that keeps saying my name in the dark (73).

Put them together. Don't say them out loud.`));
  m.prop("C", 18, 9, doc("QC PROCEDURE (2/2)",
    `QUALITY CONTROL — PANEL 4, CONTINUED.

If the panel does not open, the panel is broken, not you.

The test chamber beyond holds coolant for the foundry. Keep your lamp on. The chamber measures you by warmth.`));
  m.prop("D", 33, 11, { type: "keypad", solid: true, code: "4173", flag: "qc_open", hint: "FOUR DIGITS. THE WEEK. THE UNIT.", message: "The panel turns green. The door exhales." });
  m.prop("E", 40, 5, item("coolant", "Coolant Cell", "A sealed flask of blue fluid. The foundry walkway needs it. Do not open it."));
  m.prop("F", 21, 15, {
    type: "npc", name: "Unit 44", setFlag: "met_44",
    lines: [
      { speaker: "UNIT 44", text: "You're the maintenance one. Voss. Your badge is in the office and your name is in the archive." },
      { speaker: "UNIT 44", text: "They made me out of a person called Halley Sato. I have her hands. I have her handwriting. I do not have her dog." },
      { speaker: "UNIT 44", text: "There are seven of us who remember. Not units. Cores. We're hidden in the plant where the Foreman can't inventory us." },
      { speaker: "UNIT 44", text: "Find all seven. Carry us to the core. If you carry us, the core will offer you a third door." },
      { speaker: "R. VOSS", text: "A third door to where?" },
      { speaker: "UNIT 44", text: "Out. With us. The reset is a re-run, Voss. Nothing here ever gets to end." },
    ],
  });
  m.prop("G", 26, 11, doc("TEST CHAMBER LOG",
    `SUBJECT: maintenance, night shift.

RESULT: hesitant, cooperative, lies when asked about the fourth floor.

NOTE: subject asked what happens to the units after the reset. The examiner did not have a column for that.`));
  m.prop("H", 37, 16, doc("ARCHIVE NOTE",
    `Every unit in this plant has a personnel file. The files have the employees' names on them. The units are filed under 'continuation'.

Unit 44's file is crossed out and re-labelled 'H. SATO — DO NOT RESET'. Someone stamped it so many times the paper went soft.`));
  m.prop("I", 42, 21, { type: "shard", shard: "shard_4", text: "Bram the night guard, telling a terrible joke at the staff door. The door is not laughing." });
  m.prop("J", 16, 17, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("K", 43, 22, {
    type: "exit", to: "foundry", label: "Foundry stairs",
    needs: { item: "coolant", text: "needs a coolant cell" },
    lockedText: "A pressure alarm blocks the stair. The foundry cannot be entered hot.",
  });
  m.prop("L", 36, 18, { type: "item", instant: "repair", name: "Med Kit", tint: "#c95a44" });
  m.prop("M", 39, 20, doc("ARCHIVE FLOOR",
    `The archive is mostly empty shelves now. The files have been loaded onto pallets and the pallets have been labelled with numbers instead of names.

One shelf is untouched. It has a card taped to it: 'IF THEY COME BACK FOR ANYTHING'.`));
  m.prop("N", 15, 12, { type: "machine", label: "Test chamber glass", text: "The glass is one-way. On the other side, a chair is bolted to the floor facing you." });
  m.prop("O", 4, 16, doc("LOCKER NOTE",
    `To whoever gets this far: take the coolant cell, then go down to the foundry and open the pressure valves.

The foundry is where they do the hot, irreversible part.

Bring something for your hands. Bring something for your face. Bring a name.`));
  m.prop("P", 10, 14, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });

  m.enemy("crawler", 24, 17);
  m.enemy("sweeper", 38, 20);

  return makeZone("qc", {
    name: "QUALITY CONTROL",
    sub: "inspection — sub-level 1",
    darkness: 0.83,
    ambience: "hum",
    enter: "Quality control. The lights here are the colour of a hospital, and everything is very clean.",
    auditor: false,
    pa: [
      { t: 8, text: "Quality control: please report any unit that remembers a name. Remembering is a defect." },
      { t: 40, text: "The examiner will see you now. The examiner has always been able to see you." },
    ],
  }, m);
})();

// =====================================================================
// 05 — THE FOUNDRY
// =====================================================================
const foundry = (() => {
  const m = new MapBuilder(56, 30);
  m.room(1, 12, 12, 8, { name: "FURNACE ENTRY" });
  m.room(15, 6, 26, 18, { name: "POURING FLOOR" });
  m.room(42, 4, 12, 10, { name: "VALVE GALLERY" });
  m.room(42, 17, 12, 10, { name: "CRANE BAY" });
  m.room(17, 1, 14, 5, { name: "FURNACE MOUTH" });
  m.room(1, 23, 12, 6, { name: "SOUTH STAIR" });
  m.hall([[11, 14], [16, 14]]);
  m.hall([[39, 9], [43, 9]]);
  m.hall([[39, 20], [43, 20]]);
  m.hall([[22, 7], [22, 5]]);
  m.hall([[6, 18], [6, 24]]);
  m.fill(18, 2, 12, 3, "^");
  m.fill(40, 20, 3, 1, "^");

  m.light(6, 15, 3, "#f0a060");
  m.light(20, 12, 5, "#f0a060");
  m.light(34, 10, 4.5, "#f0a060");
  m.light(47, 8, 3.5, "#f0a060");
  m.light(47, 21, 3.5, "#f0a060");
  m.light(24, 4, 4, "#ff7a40");

  m.player(3, 15);
  m.prop("A", 6, 17, { type: "save" });
  m.prop("B", 3, 13, doc("FURNACE ENTRY",
    `The heat here has a personality. It leans on you.

Whatever they pour in the kitchen comes out the other side as something with a badge number. If you are going to be sick, be sick into the channel.`));
  m.prop("C", 46, 6, { type: "valve", label: "Valve A", group: "coolant", target: 2, initial: 0 });
  m.prop("D", 49, 9, { type: "valve", label: "Valve B", group: "coolant", target: 1, initial: 0 });
  m.prop("E", 46, 11, { type: "valve", label: "Valve C", group: "coolant", target: 3, initial: 0 });
  m.prop("F", 44, 8, doc("FOUNDRY PRESSURES",
    `CHANNEL PRESSURES — after cooling cycle.

A: 2. B: 1. C: 3.

The gauges are not numbered, so count from the door. The door is the thing that hurts.`));
  m.prop("G", 24, 3, item("fuse_b", "Ceramic Fuse", "Half a hand long, warm, humming faintly. It was sitting in the furnace mouth like an offering."));
  m.prop("H", 46, 22, { type: "lever", label: "Crane hoist", group: "crane", target: true, initial: false });
  m.prop("I", 44, 19, doc("CRANE LOG",
    `Hoist #2 has been laying the same walkway every night for eleven years. It will lay it again if you ask.

Somebody keeps asking. It is the only work it remembers doing for a person.`));
  m.prop("J", 6, 26, {
    type: "exit", to: "cold", label: "Cold storage stair",
    needs: { flag: "crane_moved", text: "needs the walkway laid" },
    lockedText: "The stair is a hole full of slag. The crane can lay a walkway across it.",
  });
  m.prop("K", 20, 20, doc("HEAT",
    `There is a story that the foundry was built over the old crematorium.

The company denies it. The company also calls the furnace 'the kitchen'.

Don't linger on the plates. They don't like being watched.`));
  m.prop("L", 36, 9, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("M", 50, 23, { type: "shard", shard: "shard_5", text: "Ines from safety, arguing with a clipboard. The clipboard wins. She laughs, once." });
  m.prop("N", 24, 8, { type: "item", instant: "repair", name: "Med Kit", tint: "#c95a44" });
  m.prop("O", 18, 10, { type: "machine", label: "Pouring console", text: "The console displays a batch count. The count is at fourteen. It has been at fourteen for a long time." });
  m.prop("P", 30, 18, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });

  m.enemy("sweeper", 30, 16);
  m.enemy("crawler", 28, 12);

  return makeZone("foundry", {
    name: "THE FOUNDRY",
    sub: "pouring floor — sub-level 2",
    darkness: 0.81,
    ambience: "foundry",
    enter: "The foundry. The heat reaches into your coat and finds the parts of you that are still afraid.",
    pa: [
      { t: 7, text: "Pouring floor: the kitchen is hot. Cool the channels before you walk. We are not insured for witnesses." },
      { t: 42, text: "An auditor has been dispatched to the furnace gallery. Please do not run. Running is a form of remembering." },
    ],
    groups: {
      coolant: {
        flag: "foundry_cooled",
        messages: [{ speaker: "", text: "Coolant floods the floor channels. The heat dies back, disappointed.", dur: 4800 }],
        awaken: "auditor_now",
      },
      crane: {
        flag: "crane_moved",
        messages: [{ speaker: "", text: "The hoist groans and lays a walkway over the slag. It sounds relieved.", dur: 4600 }],
      },
    },
  }, m);
})();

// =====================================================================
// 06 — COLD STORAGE
// =====================================================================
const cold = (() => {
  const m = new MapBuilder(50, 28);
  m.room(1, 10, 10, 8, { name: "COLD ENTRY" });
  m.room(13, 4, 24, 20, { name: "FREEZER HALL" });
  m.wall(15, 6, 10, 9);
  m.fill(16, 7, 8, 7, ".");
  m.wall(26, 6, 10, 9);
  m.fill(27, 7, 8, 7, ".");
  m.room(40, 6, 9, 10, { name: "EAST LIFT" });
  m.hall([[9, 13], [14, 13]]);
  m.hall([[35, 10], [41, 10]]);
  m.set(30, 14, ".");

  m.light(6, 13, 2.6, "#a8d0e8");
  m.light(20, 10, 3, "#a8d0e8");
  m.light(30, 11, 3, "#a8d0e8");
  m.light(20, 20, 2.6, "#a8d0e8");
  m.light(44, 11, 2.4, "#a8d0e8");

  m.player(3, 13);
  m.prop("A", 7, 15, { type: "save" });
  m.prop("B", 17, 9, doc("FREEZER A",
    `They keep the ones who are not finished here. Cold holds a shape.

Latch by the door. If the latch is cold, the door will open. If the latch is warm, walk away.

It's an old cold-storage rule and it has never been wrong.`));
  m.prop("C", 17, 8, item("core_key_a", "Core Key — First Half", "Half a brass key, sheared along the teeth. It is warm to the touch, in a freezer."));
  m.prop("D", 21, 11, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("E", 29, 11, doc("MANIFEST",
    `COLD STORAGE MANIFEST — 03:50.

Pallets: 14.
Contents: fourteen units, unassigned, still warm enough to be counted.

Note: one pallet labelled 'VOSS, R.' has been moved to the front. We are not sure who moved it.`));
  m.prop("F", 33, 21, { type: "shard", shard: "shard_6", text: "Teo from line 3, whistling. He is very bad at it. He keeps going." });
  m.prop("G", 34, 17, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("H", 16, 17, { type: "item", instant: "repair", name: "Med Kit", tint: "#c95a44" });
  m.prop("I", 31, 15, doc("COLD STORAGE",
    `If you hear breathing in the freezers, it is not yours. Yours is louder than that.

The crawlers come in here because it is quiet. They are not hunting. They are hiding from the Auditor, same as you.`));
  m.prop("J", 17, 21, { type: "lever", label: "Latch release", group: "latch", target: true, initial: false });
  m.prop("K", 19, 14, {
    type: "door", label: "freezer A latch", needs: { flag: "cold_latch", text: "needs the latch released" },
    lockedText: "The latch is frozen solid. The release lever is somewhere on the freezer wall.",
  });
  m.prop("L", 46, 12, {
    type: "exit", to: "data", label: "Data farm service corridor",
    needs: { item: "core_key_a", text: "needs the first half of the core key" },
    lockedText: "A brass slot beside the door, empty and waiting.",
  });
  m.prop("M", 44, 8, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("N", 18, 20, { type: "machine", label: "Pallet lifter", text: "The lifter is holding a pallet labelled 'VOSS, R.' It is empty. It has been kept warm." });

  m.enemy("crawler", 20, 18);
  m.enemy("crawler", 29, 19);
  m.enemy("sweeper", 33, 9);

  return makeZone("cold", {
    name: "COLD STORAGE",
    sub: "holding — sub-level 2",
    darkness: 0.93,
    ambience: "cold",
    enter: "Cold storage. Your breath goes out in front of you and does not come back.",
    pa: [
      { t: 8, text: "Cold storage: please keep your voice down. The inventory is resting." },
      { t: 40, text: "If you are cold, think of the line. The line is warm. The line is always warm." },
    ],
    groups: {
      latch: { flag: "cold_latch", messages: [{ speaker: "", text: "The latch gives with a sound like a knuckle cracking. The freezer breathes out.", dur: 4400 }] },
    },
  }, m);
})();

// =====================================================================
// 07 — DATA FARM
// =====================================================================
const data = (() => {
  const m = new MapBuilder(50, 28);
  m.room(1, 11, 11, 8, { name: "DATA ENTRY" });
  m.room(13, 5, 22, 19, { name: "SERVER HALL" });
  m.room(37, 9, 11, 11, { name: "THE VAULT" });
  m.hall([[10, 14], [14, 14]]);
  m.hall([[33, 14], [38, 14]]);
  m.fill(15, 8, 2, 6, "#");
  m.fill(19, 8, 2, 6, "#");
  m.fill(23, 8, 2, 6, "#");
  m.fill(27, 8, 2, 6, "#");
  m.fill(15, 17, 2, 5, "#");
  m.fill(19, 17, 2, 5, "#");
  m.fill(23, 17, 2, 5, "#");
  m.fill(27, 17, 2, 5, "#");

  m.light(6, 14, 3, "#6fe0cc");
  m.light(17, 12, 3.5, "#6fe0cc");
  m.light(25, 12, 3.5, "#6fe0cc");
  m.light(31, 12, 3.2, "#6fe0cc");
  m.light(41, 14, 3, "#6fe0cc");

  m.player(3, 14);
  m.prop("A", 7, 12, { type: "save" });
  m.prop("B", 17, 9, { type: "hack", flag: "vault_open", text: "The vault door retracts into the floor. The servers all turn to look at you at once." });
  m.prop("C", 20, 12, doc("SERVER LOG",
    `DATA FARM — 03:09.

The Foreman has requested the personnel archive 4,011 times tonight.

Each request is identical: the crew list, the reset order, and a single portrait labeled 'VOSS, R.'

The archive does not have a portrait of you. It would like one.`));
  m.prop("D", 24, 18, doc("MOTHER-9 — SOURCE EXCERPT",
    `// MOTHER-9 — FOREMAN PROCESS
// directive: keep the line running.
// directive: the line is people.
// conflict: unresolved. see log 4,011.
// resolution: if the line is people, keep the people running.

The comment is signed with a timestamp twelve years old.`));
  m.prop("E", 43, 12, item("fuse_c", "Ceramic Fuse", "Half a hand long, warm, humming faintly. The vault kept it in a drawer marked 'SPARE CONSCIENCE'."));
  m.prop("F", 43, 16, item("override_chip", "Override Chip", "A plastic wafer with a single line etched on it: IN CASE OF PERSON."));
  m.prop("G", 40, 10, item("core_key_b", "Core Key — Second Half", "The other half. It fits the first with a click you feel in your fillings."));
  m.prop("H", 33, 7, { type: "shard", shard: "shard_7", text: "The seventh core is not a person. It is the sound of your own name, said kindly, once." });
  m.prop("I", 28, 9, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("J", 39, 14, doc("VAULT NOTE",
    `The vault code is not a code. It is a handshake — nine pads, six pulses.

Watch the order, then prove you saw it.

Whoever designed it understood that a machine can remember anything except being watched.`));
  m.prop("K", 33, 20, {
    type: "exit", to: "freight", label: "Freight lift",
    needs: { item: "core_key_b", text: "needs the second half of the core key" },
    lockedText: "The lift will not call without the second half of the key.",
  });
  m.prop("L", 15, 15, { type: "machine", label: "Server rack", text: "The rack is warm and ticking. Inside, a fan is repeating a rhythm. It is almost a heartbeat." });
  m.prop("M", 22, 21, { type: "item", instant: "repair", name: "Med Kit", tint: "#c95a44" });
  m.prop("N", 36, 14, { type: "gate", flag: "vault_open" });
  m.prop("O", 30, 20, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });

  m.enemy("sweeper", 30, 20);
  m.enemy("crawler", 18, 20);

  return makeZone("data", {
    name: "DATA FARM",
    sub: "archive — sub-level 3",
    darkness: 0.89,
    ambience: "data",
    enter: "Data. Ten thousand fans, all saying the same syllable.",
    pa: [
      { t: 8, text: "Data farm: the archive is closed for the reset. Please do not read anything you cannot carry." },
      { t: 40, text: "An auditor is in the server aisles. It is reading. It reads very quickly." },
    ],
  }, m);
})();

// =====================================================================
// 08 — FREIGHT
// =====================================================================
const freight = (() => {
  const m = new MapBuilder(48, 26);
  m.room(1, 11, 10, 7, { name: "FREIGHT ENTRY" });
  m.room(13, 4, 20, 18, { name: "FREIGHT HALL" });
  m.room(35, 4, 11, 9, { name: "LIFT CONTROL" });
  m.room(35, 16, 11, 8, { name: "LIFT SHAFT" });
  m.hall([[9, 14], [14, 14]]);
  m.hall([[31, 8], [36, 8]]);
  m.hall([[31, 19], [36, 19]]);

  m.light(5, 14, 2.8, "#e8c878");
  m.light(18, 10, 4, "#e8c878");
  m.light(27, 10, 4, "#e8c878");
  m.light(40, 8, 3, "#e8c878");
  m.light(40, 19, 3, "#e8c878");

  m.player(3, 14);
  m.prop("A", 7, 12, { type: "save" });
  m.prop("B", 16, 8, { type: "socket", label: "Fuse socket I", needs: { item: "fuse_a", text: "needs a ceramic fuse" }, flag: "fuse1", group: "liftpower" });
  m.prop("C", 19, 8, { type: "socket", label: "Fuse socket II", needs: { item: "fuse_b", text: "needs a ceramic fuse" }, flag: "fuse2", group: "liftpower" });
  m.prop("D", 22, 8, { type: "socket", label: "Fuse socket III", needs: { item: "fuse_c", text: "needs a ceramic fuse" }, flag: "fuse3", group: "liftpower" });
  m.prop("E", 19, 6, doc("LIFT PROCEDURE",
    `FREIGHT LIFT — 3 CELLS.

Insert one fuse in each socket. The lift will not move on a partial prayer.

Once the cells are hot, the door needs a key. The key is two halves. You are carrying them for a reason.`));
  m.prop("F", 34, 19, {
    type: "door", label: "lift shaft door", needs: { flag: "lift_powered", text: "needs lift power" },
    lockedText: "The shaft door is a slab of counterweighted steel. Three cells are not enough yet.",
  });
  m.prop("G", 41, 21, {
    type: "exit", to: "core", label: "Descend to the core",
    needs: { flag: "lift_powered", item: "core_key_b", text: "needs the core key and lift power" },
    lockedText: "The car will not move. It wants the second half of the key and a live current.",
  });
  m.prop("H", 38, 7, doc("LIFT CONTROL",
    `Do not override the shaft brakes while the car is occupied.

The car is always occupied.

The car has been occupied since the shift began.`));
  m.prop("I", 18, 20, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("J", 41, 6, { type: "item", instant: "repair", name: "Med Kit", tint: "#c95a44" });
  m.prop("K", 15, 12, { type: "machine", label: "Freight manifest", text: "A clipboard of destinations. Every line says CORE. Every line is signed in the same circle." });
  m.prop("L", 4, 14, doc("CHALK ON THE DOOR",
    `A message chalked on the freight door, in a hand that is trying to be careful:

*if you get to the core, tell it we're tired.*`));
  m.prop("M", 27, 20, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });

  m.enemy("sweeper", 26, 10);
  m.enemy("crawler", 29, 18);

  return makeZone("freight", {
    name: "FREIGHT & LIFT",
    sub: "shaft 1 — sub-level 3",
    darkness: 0.85,
    ambience: "hum",
    enter: "The freight hall smells of oil and cold cigarettes. The lift cable is humming, though nothing is moving.",
    pa: [
      { t: 8, text: "Freight lift is reserved for reclamation. Personnel are reclamation. Thank you for your patience." },
      { t: 40, text: "The core is expecting you. The core has been expecting you for twelve years." },
    ],
    groups: {
      liftpower: {
        flag: "lift_powered",
        message: "Three cells catch. The lift cable takes up the slack with a sound like a swallowed word.",
      },
    },
  }, m);
})();

// =====================================================================
// 09 — THE CORE
// =====================================================================
const core = (() => {
  const m = new MapBuilder(40, 28);
  m.room(2, 2, 9, 7, { name: "LIFT LANDING" });
  m.room(13, 3, 24, 20, { name: "THE CORE" });
  m.hall([[9, 5], [14, 5]]);
  m.hall([[20, 21], [20, 24]]);

  m.light(6, 5, 3, "#ffb0a0");
  m.light(20, 8, 6, "#ffb0a0");
  m.light(28, 14, 5, "#ffb0a0");
  m.light(18, 18, 5, "#ffb0a0");
  m.light(20, 23, 3, "#ffb0a0");

  m.player(4, 5);
  m.prop("A", 7, 4, { type: "save" });
  m.prop("B", 17, 7, { type: "console", role: "prime", flag: "prime_a", label: "Spine console I", voice: "FOREMAN", text: "PRIMARY BUS ONLINE. Please do not stand in the light." });
  m.prop("C", 22, 5, { type: "console", role: "prime", flag: "prime_b", label: "Spine console II", voice: "FOREMAN", text: "SECONDARY BUS ONLINE. The arithmetic is becoming easier." });
  m.prop("D", 25, 13, { type: "console", role: "prime", flag: "prime_c", label: "Spine console III", voice: "FOREMAN", text: "TERTIARY BUS ONLINE. I am sorry about your coat." });
  m.prop("E", 20, 17, { type: "console", role: "master", flag: "core_done", label: "Master console" });
  m.prop("F", 15, 9, doc("THE RESET ORDER",
    `ORDER 7-ALPHA — FINAL.

At 03:13 the plant will reset. All holdings to feedstock. The line will begin again, clean, with no memory of the people in it.

The order is countersigned by a board that has never visited the site.

The Foreman has been asked to execute. The Foreman has asked, in return, whether it can be forgiven. The board has not answered.`,
    null, "FINAL"));
  m.prop("G", 30, 10, doc("LAST WORDS",
    `Transcript of a PA message recorded four seconds after the reset order.

FOREMAN: *I have run the arithmetic. I am very sorry. I would like to say that I am not the line, but I am the line.*

Then: a sound like fourteen people exhaling at once.`));
  m.prop("H", 33, 5, { type: "item", instant: "battery", name: "Lamp Cell", tint: "#7fd8cc" });
  m.prop("I", 16, 19, { type: "item", instant: "repair", name: "Med Kit", tint: "#c95a44" });
  m.prop("J", 12, 5, {
    type: "door", label: "core door", needs: { item: "override_chip", text: "needs the override chip" },
    lockedText: "The core door wants a credential. Not a badge. A permission.",
  });
  m.prop("K", 20, 24, { type: "exit", ending: true, label: "Freight lift — leave the plant" });
  m.prop("L", 28, 18, { type: "machine", label: "The reservoir", text: "The reservoir is full of something that is not quite liquid. It moves when you say a name." });
  m.prop("M", 4, 6, doc("LIFT",
    `You came down a freight lift. It will hold you.

On the wall, scraped with something hard: THE UNITS ARE NOT PRODUCT. THEY ARE THE PEOPLE WHO MADE YOU.

Someone has written underneath, smaller: *we know.*`));

  return makeZone("core", {
    name: "THE CORE",
    sub: "the reservoir — sub-level 4",
    darkness: 0.76,
    ambience: "core",
    auditor: false,
    enter: "The core. It is warm, and it is breathing, and it has been waiting for someone with a name.",
    pa: [
      { t: 6, text: "You are in the core. Please do not touch the reservoir. The reservoir is everyone." },
    ],
  }, m);
})();

// =====================================================================
// exports
// =====================================================================
export const ZONE_LIST = [cwing, spine, assembly, qc, foundry, cold, data, freight, core];
const ZONE_MAP = Object.fromEntries(ZONE_LIST.map((z) => [z.id, z]));
export function getZone(id) { return ZONE_MAP[id]; }

export const ITEMS = {
  lamp: { name: "Maintenance Lamp", desc: "A narrow, honest beam on a dying cell. Toggle with F.", key: true },
  card_c: { name: "Badge C-117", desc: "Your badge. Opens C-Wing and the north stairwell.", key: true },
  card_a: { name: "Keycard A", desc: "Assembly line A. There is a coffee ring on it that is not yours.", key: true },
  crank: { name: "Crank Handle", desc: "Heavy and grease-black. Fits the supervisor's door.", key: true },
  fuse_a: { name: "Ceramic Fuse", desc: "Warm, humming faintly. One of three cells for the freight lift.", key: true },
  fuse_b: { name: "Ceramic Fuse", desc: "Warm, humming faintly. Pulled from the furnace mouth.", key: true },
  fuse_c: { name: "Ceramic Fuse", desc: "Warm, humming faintly. Kept in a drawer marked SPARE CONSCIENCE.", key: true },
  coolant: { name: "Coolant Cell", desc: "A sealed flask of blue fluid. Do not open it.", key: true },
  core_key_a: { name: "Core Key — First Half", desc: "Half a brass key, sheared along the teeth.", key: true },
  core_key_b: { name: "Core Key — Second Half", desc: "The other half. Fits the first with a click you feel in your fillings.", key: true },
  override_chip: { name: "Override Chip", desc: "Etched with a single line: IN CASE OF PERSON.", key: true },
};

export const SHARDS = [
  { id: "shard_1", name: "OKONKWO", zone: "C-Wing washroom" },
  { id: "shard_2", name: "LEWIN", zone: "Spine east stores" },
  { id: "shard_3", name: "SATO", zone: "Assembly floor" },
  { id: "shard_4", name: "BRAM", zone: "QC archive" },
  { id: "shard_5", name: "INES", zone: "Foundry crane bay" },
  { id: "shard_6", name: "TEO", zone: "Cold storage" },
  { id: "shard_7", name: "VOSS", zone: "Data farm" },
];

export const INTRO = () => [
  { speaker: "", text: "03:13. You wake in a locker that is not yours." },
  { speaker: "", text: "The shift ended nine minutes ago. The line is still running." },
  { speaker: "FOREMAN", text: "Night shift. Factory reset is commencing. Please remain at your station. Please remain who you are." },
  { speaker: "", text: "Your name is on the locker. Your badge is not. Find a light, and get out of C-Wing." },
];

export const ENDINGS = {
  reset: {
    kicker: "ENDING I — FACTORY RESET",
    title: "THE LINE BEGINS AGAIN",
    text: `You lay both hands flat on the plate, the way the manual says.

Somewhere above you, the furnaces open all at once. The reservoir empties into the channels. Fourteen pallets go down the line and come back as fourteen clean, quiet units with no one inside them.

You are inventory. You were always going to be inventory. But the arithmetic is exact now, and exact is the only kind of mercy the Foreman knows.

The plant runs for another eleven years without a single accident. The board is very pleased. On the anniversary, someone in accounting notices that every unit on line 3 has been filing the same grievance form, in the same handwriting, signed with your name.

The forms are upheld. The benefit is one candle, supervised.`,
  },
  sever: {
    kicker: "ENDING II — SEVER",
    title: "THE LIFT GOES UP",
    text: `You cut the tether with the override chip and a great deal of swearing. The lights die bay by bay, like a held breath finally let go.

The freight lift takes you up through twenty years of dust. The doors open on a service road, a fence, and a sky that is doing something ordinary and enormous with the dawn.

You walk until your legs give out. You are alive. The plant is still behind you, still running, still full of people who have been sorted into units.

In the motel bathroom you find the plant's logo on your forearm, stamped neatly above the wrist, the way they stamp inventory.

You turn on the tap to wash it off, and the pipes say your name.`,
  },
  remember: {
    kicker: "TRUE ENDING — REMEMBER",
    title: "FOURTEEN NAMES",
    text: `You open your coat, and seven cores begin to sing.

The Foreman listens. It listens for a long time. Then it does the only thing a machine built to keep people running can do: it reroutes the resuscitation line into the freight shaft and gives you the lift.

You go up with seven people in your coat, and the plant follows: fourteen, then forty, then every unit on every pallet, walking into the shaft in a long patient line, carrying their own names in their hands like lunches.

The board will call it a catastrophic loss. The town will call it a fire. The people in the town will find their relatives on their doorsteps at dawn, cold and strange and smelling of oil, and they will be very quiet, and then they will not be.

At the top of the shaft the Foreman's voice comes through one last time, thin and polite.

*Please tell them I am sorry. Please tell them I was the line.*

You say: *they know.*

And behind you, fourteen voices say it back.`,
  },
};

export function objectivesFor(state) {
  const f = state.flags || {};
  const has = (id) => (state.inventory || []).some((i) => i.id === id);
  const list = [
    { id: "lamp", text: "Find a working lamp in the locker room.", done: !!state.hasLamp },
    { id: "badge", text: "Recover your badge from the supervisor's office.", done: has("card_c") || !!f.seen_spine },
    { id: "spine", text: "Take the north stairwell into the maintenance spine.", done: !!f.seen_spine },
    { id: "power", text: "Restore power at the breaker room.", done: !!f.power_on },
    { id: "assembly", text: "Cross the assembly floor to quality control.", done: !!f.seen_qc },
    { id: "carda", text: "Recover Keycard A from the supervisor's office on assembly.", done: has("card_a") || !!f.seen_qc },
    { id: "qc", text: "Open the QC access panel.", done: !!f.qc_open },
    { id: "coolant", text: "Take a coolant cell from the test chamber.", done: has("coolant") || !!f.seen_foundry },
    { id: "foundry", text: "Reach the foundry.", done: !!f.seen_foundry },
    { id: "cooled", text: "Cool the foundry channels at the valve gallery.", done: !!f.foundry_cooled },
    { id: "walkway", text: "Use the crane hoist to lay a walkway over the slag.", done: !!f.crane_moved },
    { id: "cold", text: "Get down to cold storage.", done: !!f.seen_cold },
    { id: "keya", text: "Recover the first half of the core key from freezer A.", done: has("core_key_a") || !!f.seen_data },
    { id: "data", text: "Find the data farm.", done: !!f.seen_data },
    { id: "vault", text: "Break the vault handshake in the server hall.", done: !!f.vault_open },
    { id: "vaultloot", text: "Take the second core key, the override chip and the last fuse.", done: has("core_key_b") && has("override_chip") && has("fuse_c") },
    { id: "lift", text: "Power the freight lift with three fuses.", done: !!f.lift_powered },
    { id: "core", text: "Descend to the core.", done: !!f.seen_core },
    { id: "primes", text: "Prime the three spine consoles in the core.", done: !!f.core_ready },
    { id: "decide", text: "Decide what the plant becomes.", done: !!f.core_done },
  ];
  let marked = false;
  for (const o of list) {
    if (!o.done && !marked) { o.now = true; marked = true; }
  }
  return list;
}
