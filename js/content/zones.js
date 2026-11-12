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
