import { isWalkable, tileAt, hasLOS, findPath, randomWalkable, COOL, GRATE, CONV, HOT } from "./world.js";
import { Audio } from "./audio.js";

const TAU = Math.PI * 2;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dir = -Math.PI / 2;
    this.r = 0.29;
    this.bob = 0;
    this.stepAcc = 0;
    this.staminaDelay = 0;
    this.boosting = false;
    this.onCool = false;
    this.onHot = false;
    this.nextHeart = 0;
    this.hurtT = 0;
  }

  solidAt(game, x, y) {
    const r = this.r;
    const pts = [[-r, -r], [r, -r], [-r, r], [r, r], [0, r], [0, -r], [r, 0], [-r, 0]];
    for (const [dx, dy] of pts) {
      if (!isWalkable(game.world, x + dx, y + dy, game.state)) return true;
    }
    return false;
  }

  update(dt, game) {
    const s = game.state;
    const inp = game.input;
    let dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    let dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      this.dir = Math.atan2(dy, dx);
    }

    const tile = tileAt(game.world, this.x, this.y);
    this.onCool = tile === COOL;
    this.onHot = tile === HOT && game.isHot(this.x, this.y);
    let speed = 3.05;
    if (tile === COOL) speed = 1.75;
    else if (tile === GRATE) speed = 2.85;
    else if (tile === CONV) speed = 2.35;

    const wantSprint = inp.sprint && moving && s.stamina > 2 && !this.onCool;
    this.boosting = wantSprint;
    if (wantSprint) {
      speed *= 1.52;
      s.stamina = Math.max(0, s.stamina - 25 * dt);
      this.staminaDelay = 0.7;
    } else {
      this.staminaDelay -= dt;
      if (this.staminaDelay <= 0) s.stamina = Math.min(100, s.stamina + 17 * dt);
    }

    if (moving) {
      // axis-separated movement so we slide along walls
      const nx = this.x + dx * speed * dt;
      if (!this.solidAt(game, nx, this.y)) this.x = nx;
      const ny = this.y + dy * speed * dt;
      if (!this.solidAt(game, this.x, ny)) this.y = ny;

      this.bob += dt * (wantSprint ? 13 : 8.4);
      this.stepAcc += speed * dt;
      const stride = wantSprint ? 0.62 : 0.86;
      if (this.stepAcc >= stride) {
        this.stepAcc = 0;
        Audio.step(wantSprint);
        game.noise = { x: this.x, y: this.y, r: wantSprint ? 9.5 : this.onCool ? 8 : 5.4, kind: wantSprint ? "run" : "walk" };
      }
    } else {
      this.bob += dt * 1.4;
      game.noise = null;
    }

    // lamp battery
    if (s.lamp && s.battery > 0) {
      s.battery = Math.max(0, s.battery - 0.36 * dt);
      if (s.battery <= 0) {
        s.lamp = false;
        game.notice("The lamp dies.", "bad");
        Audio.wrong();
      }
    }

    // hot floor damage
    if (this.onHot) {
      this.hurtT -= dt;
      s.health = Math.max(0, s.health - 16 * dt);
      game.hurtFlash = Math.min(1, (game.hurtFlash || 0) + dt * 2.2);
      if (this.hurtT <= 0) {
        this.hurtT = 0.55;
        Audio.hurt();
        game.shake = Math.max(game.shake, 4);
      }
      if (s.health <= 0) game.die("The floor opened under you.", "heat");
    }

    // heartbeat when something is close
    this.nextHeart -= dt;
    const threat = game.nearbyThreat ? game.nearbyThreat() : 0;
    if (threat > 0 && this.nextHeart <= 0) {
      this.nextHeart = 0.9 - threat * 0.55;
      Audio.heartbeat(threat);
    }
  }
}

export class Enemy {
  constructor(kind, x, y, opts = {}) {
    const stats = {
      sweeper: { wander: 1.0, chase: 2.72, sight: 7.4, fov: 1.15, hear: 4.2, catch: 0.62 },
      crawler: { wander: 1.35, chase: 3.3, sight: 0, fov: 0, hear: 7.6, catch: 0.55 },
      auditor: { wander: 1.5, chase: 2.12, sight: 10, fov: Math.PI, hear: 22, catch: 0.72 },
    }[kind] || { wander: 1, chase: 2.4, sight: 6, fov: 1, hear: 5, catch: 0.6 };
    Object.assign(this, stats);
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.dir = opts.dir ?? Math.random() * TAU;
    this.speed = this.wander;
    this.state = "wander";
    this.path = null;
    this.repath = 0;
    this.lastSeen = null;
    this.lost = 0;
    this.searchT = 0;
    this.goal = null;
    this.anim = Math.random() * 10;
    this.walkPhase = 0;
    this.moving = false;
    this.teleCd = 12;
    this.spotCd = 0;
    this.stuck = 0;
    this.lostPath = 0;
    this.opts = opts;
  }

  canSee(game) {
    const p = game.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return true;
    let range = this.sight;
    if (game.state.lamp && game.state.battery > 0) range += 2.6;
    if (dist > range) return false;
    if (!hasLOS(game.world, this.x, this.y, p.x, p.y, game.state, range + 1)) return false;
    if (this.fov < Math.PI) {
      const ang = Math.atan2(dy, dx);
      let d = Math.abs(((ang - this.dir + Math.PI * 3) % TAU) - Math.PI);
      if (d > this.fov / 2) return false;
    }
    return true;
  }

  hears(game) {
    const n = game.noise;
    if (!n) return false;
    const dx = n.x - this.x, dy = n.y - this.y;
    return Math.hypot(dx, dy) <= Math.max(this.hear, n.r);
  }

  moveAlong(dt, speed) {
    if (!this.path || !this.path.length) { this.moving = false; return; }
    let node = this.path[0];
    let dx = node.x - this.x, dy = node.y - this.y;
    let d = Math.hypot(dx, dy);
    if (d < 0.06) {
      this.path.shift();
      if (!this.path.length) { this.moving = false; return; }
      node = this.path[0];
      dx = node.x - this.x; dy = node.y - this.y;
      d = Math.hypot(dx, dy) || 1;
    }
    const step = Math.min(speed * dt, d);
    const ox = this.x, oy = this.y;
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.dir = Math.atan2(dy, dx);
    this.moving = true;
    this.walkPhase += speed * dt * 3.4;
    if (Math.abs(this.x - ox) < 1e-5 && Math.abs(this.y - oy) < 1e-5) this.stuck += dt;
    else this.stuck = 0;
  }

  update(dt, game) {
    this.repath -= dt;
    this.teleCd -= dt;
    this.anim += dt;
    const p = game.player;
    const dist = Math.hypot(p.x - this.x, p.y - this.y);

    if (this.kind === "auditor") return this.updateAuditor(dt, game, dist);

    const sees = this.canSee(game);
    if (sees) {
      if (this.state !== "chase") {
        this.state = "chase";
        Audio.shriek();
        game.shake = Math.max(game.shake, 6);
        game.raiseAlarm(this.x, this.y);
        if (this.kind === "sweeper") game.notice("A sweeper has your scent.", "bad");
      }
      this.lastSeen = { x: p.x, y: p.y };
      this.lost = 0;
    } else {
      this.lost += dt;
      if (this.state === "chase" && this.lost > 3.4) {
        this.state = "search";
        this.searchT = 7;
        this.goal = this.lastSeen ? { ...this.lastSeen } : null;
        this.path = null;
      }
    }

    if (this.state === "search") {
      this.searchT -= dt;
      if (this.searchT <= 0) { this.state = "wander"; this.path = null; this.goal = null; }
    }

    // blind crawlers: sound only
    if (this.kind === "crawler" && this.state !== "chase" && this.hears(game)) {
      this.state = "chase";
      this.lastSeen = { x: game.noise.x, y: game.noise.y };
      this.lost = 0;
      Audio.noise({ dur: 0.5, freq: 1800, slide: 600, gain: 0.05, q: 3 });
    }

    let target = null;
    if (this.state === "chase") {
      target = this.kind === "crawler" ? (this.lastSeen || { x: p.x, y: p.y }) : { x: p.x, y: p.y };
      this.speed = this.chase;
    } else if (this.state === "search" && this.goal) {
      target = this.goal;
      this.speed = this.wander * 1.35;
    } else {
      this.speed = this.wander;
      if (!this.goal || Math.hypot(this.goal.x - this.x, this.goal.y - this.y) < 0.7) {
        this.goal = randomWalkable(game.world, game.state, this.x, this.y, 3, 12);
        this.path = null;
      }
      target = this.goal;
    }

    if (this.repath <= 0 || this.stuck > 1.2) {
      this.repath = this.state === "chase" ? 0.32 : 1.0;
      if (this.stuck > 1.2) { this.path = null; this.stuck = 0; this.goal = null; }
      if (target) {
        const path = findPath(game.world, this.x, this.y, target.x, target.y, game.state);
        this.path = path && path.length ? path : null;
        if (!this.path && this.state === "search") { this.state = "wander"; this.goal = null; }
      }
    }
    this.moveAlong(dt, this.speed);

    if (this.state === "chase" && dist < this.catch && hasLOS(game.world, this.x, this.y, p.x, p.y, game.state, 3)) {
      game.onCaught(this);
    }
  }

  updateAuditor(dt, game, dist) {
    const p = game.player;
    if (dist < 26) {
      // it always knows, roughly
      this.goal = { x: p.x, y: p.y };
    } else if (!this.goal) {
      this.goal = randomWalkable(game.world, game.state, this.x, this.y, 4, 10);
    }

    if (!this.path) this.lostPath += dt;
    else this.lostPath = 0;

    if (this.teleCd <= 0 && (dist > 20 || this.lostPath > 5)) {
      for (let i = 0; i < 40; i++) {
        const spot = randomWalkable(game.world, game.state, p.x, p.y, 7, 12);
        if (!spot) continue;
        if (hasLOS(game.world, spot.x, spot.y, p.x, p.y, game.state, 14)) continue;
        if (!findPath(game.world, spot.x, spot.y, p.x, p.y, game.state)) continue;
        this.x = spot.x; this.y = spot.y;
        this.path = null;
        this.lostPath = 0;
        this.teleCd = 24;
        game.flash(0.5, 120);
        Audio.noise({ dur: 1.1, freq: 90, slide: 40, gain: 0.09 });
        game.notice("Something has moved closer.", "bad");
        break;
      }
    }

    if (this.repath <= 0) {
      this.repath = 0.6;
      if (this.goal) this.path = findPath(game.world, this.x, this.y, this.goal.x, this.goal.y, game.state) || this.path;
    }
    this.moveAlong(dt, this.chase);

    if (dist < this.catch) game.onCaught(this);
    if (dist < 9) Audio.heartbeat(Math.min(1, (9 - dist) / 7));
  }
}
