import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Hut } from '../entities/buildings/Hut.js';
import { Worker } from '../entities/Worker.js';
import { Stockpile } from '../entities/Stockpile.js';
import { Gatherer } from './Gatherer.js';
import { pushOutOfNodes } from './obstacles.js';
import { flyItem } from '../effects/flyItem.js';
import { toast } from '../effects/toast.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Distance from point c to segment p-q.
function segmentDistance(p, q, c) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Phaser.Math.Clamp(((c.x - p.x) * dx + (c.y - p.y) * dy) / len2, 0, 1) : 0;
  return Math.hypot(p.x + dx * t - c.x, p.y + dy * t - c.y);
}

// Owns huts, their workers and stockpiles.
//
// Worker loop (state):
//   seek    -> pick the nearest free node of its hut's types (miners prefer gold)
//   toNode  -> walk there (through the gate, around the fence)
//   gather  -> swing with the shared Gatherer; hits fly into its own Backpack
//   toHut   -> full (or nothing left): walk to the stockpile
//   drop    -> items fly from its back onto the stockpile, then seek again
//   idle    -> nothing to gather: wait at the hut door, retry
//   flee    -> a zombie came within DANGER_RADIUS: run to the hut door; resume
//              once no zombie has been near for SAFE_DELAY
// The player standing on a stockpile collects it into the backpack.
//
// Also the worker provider for ZombieManager (`alive`).
// Events: 'worker-died' (hut)
export class WorkerManager extends Phaser.Events.EventEmitter {
  constructor(scene, { player, inventory, backpack, base, fence, resources, zombies }) {
    super();
    this.scene = scene;
    this.player = player;
    this.inventory = inventory;
    this.backpack = backpack;
    this.base = base;
    this.fence = fence;
    this.resources = resources;
    this.zombies = zombies;
    this.huts = [];
    this.workers = [];
    this.claims = new Map(); // node -> worker
    fence.setExtraOpeners(() => this.workers);
  }

  get alive() { return this.workers; }

  // ---------- huts & hiring ----------

  buildHut(type, x, y, stockpilePos) {
    const stockpile = new Stockpile(this.scene, stockpilePos.x, stockpilePos.y);
    const hut = new Hut(this.scene, type, x, y, stockpile);
    stockpile.pickupTimer = 0;
    this.huts.push(hut);
    this.hire(hut);
    return hut;
  }

  hire(hut) {
    const W = CONFIG.WORKER;
    const door = hut.door;
    const w = new Worker(this.scene, hut, door.x, door.y);
    if (!hut.fillSlot(w)) {
      w.view.destroy();
      return null;
    }
    w.wasInside = this.isInside(w);
    w.gatherer = new Gatherer(this.scene, w, this.resources, (node, type, amount) => this.onYield(w, node, type, amount), {
      findTarget: () => this.gatherTarget(w),
      cooldown: () => hut.stats.GATHER_COOLDOWN,
      swing: { windup: W.WINDUP_DURATION, strike: W.STRIKE_DURATION },
      shake: false,
    });
    w.onDeath = () => this.onWorkerDied(w);
    this.workers.push(w);
    return w;
  }

  onWorkerDied(w) {
    this.release(w);
    w.hut.freeSlot(w);
    toast(this.scene, w.x, w.y - 50, 'Worker lost!', '#ff8a80');
    this.emit('worker-died', w.hut);
  }

  // ---------- gathering ----------

  capacity(w) { return w.hut.stats.CAPACITY; }

  gap(w, node) {
    return dist(w, node) - w.radius - node.radius;
  }

  // What the worker's Gatherer may hit right now.
  gatherTarget(w) {
    const n = w.node;
    if (w.state !== 'gather' || !n?.active || w.load >= this.capacity(w)) return null;
    return this.gap(w, n) <= CONFIG.GATHER.RANGE ? n : null;
  }

  onYield(w, node, type, amount) {
    for (let i = 0; i < amount; i++) {
      w.incoming++;
      w.backpack.flyIn(node.x, node.y, type, () => {
        w.incoming--;
        if (w.alive) w.carry.add(type, 1);
      });
    }
  }

  claim(w, node) {
    this.release(w);
    w.node = node;
    this.claims.set(node, w);
  }

  release(w) {
    if (w.node && this.claims.get(w.node) === w) this.claims.delete(w.node);
    w.node = null;
  }

  zombieNear(x, y, radius) {
    const r2 = radius * radius;
    return this.zombies.alive.some((z) => z.alive && (z.x - x) ** 2 + (z.y - y) ** 2 <= r2);
  }

  // Nearest node of the hut's types that no other worker has claimed (claimed
  // ones only if nothing else is left). Miners take gold if it's at most
  // GOLD_PREFERENCE_DISTANCE further than the nearest rock.
  pickNode(w) {
    const W = CONFIG.WORKER;
    const types = CONFIG.HUTS[w.type].NODE_TYPES;
    const options = this.resources.nodes.filter((n) => n.active && types.includes(n.type)
      && !(W.AVOID_NODES_NEAR_ZOMBIES && this.zombieNear(n.x, n.y, W.DANGER_RADIUS)));
    const free = options.filter((n) => {
      const owner = this.claims.get(n);
      return !owner || owner === w || !owner.alive;
    });
    const pool = free.length ? free : options;
    if (pool.length === 0) return null;

    const cost = (n) => this.travelDistance(w, n);
    const nearest = (list) => list.reduce((best, n) => (cost(n) < cost(best) ? n : best));
    let best = nearest(pool);
    if (types.includes('gold')) {
      const golds = pool.filter((n) => n.type === 'gold');
      if (golds.length) {
        const g = nearest(golds);
        if (cost(g) <= cost(best) + W.GOLD_PREFERENCE_DISTANCE) best = g;
      }
    }
    return best;
  }

  // ---------- navigation ----------

  get gate() { return { x: this.fence.gateX, y: this.fence.gateY }; }
  get fenceRadius() { return dist(this.gate, this.base); }

  isInside(p) { return dist(p, this.base) < this.fenceRadius; }

  gatePoint(offset) {
    const a = this.fence.gateAngle;
    const r = this.fenceRadius + offset;
    return { x: this.base.x + Math.cos(a) * r, y: this.base.y + Math.sin(a) * r };
  }

  travelDistance(from, to) {
    if (this.isInside(from) !== this.isInside(to)) return dist(from, this.gate) + dist(this.gate, to);
    return dist(from, to);
  }

  // Next point to walk towards on the way to `target`: through the gate when
  // crossing the fence, around the outside of the fence when it's in the way.
  navPoint(w, target) {
    const W = CONFIG.WORKER;
    const wIn = this.isInside(w);
    const tIn = this.isInside(target);
    if (wIn !== tIn) {
      const inner = this.gatePoint(-40);
      const outer = this.gatePoint(45);
      if (dist(w, this.gate) < W.GATE_CORRIDOR) return tIn ? inner : outer;
      return wIn ? inner : this.around(w, outer);
    }
    return wIn ? target : this.around(w, target);
  }

  around(w, dest) {
    const b = this.base;
    const rf = this.fenceRadius;
    const R = rf + CONFIG.WORKER.ORBIT_MARGIN;
    // Blocked only if the straight line dips towards the fence (closer to the
    // centre than the worker already is), not when it heads straight out.
    const limit = Math.min(rf + w.radius + 12, dist(w, b) - 2);
    if (segmentDistance(w, dest, b) >= limit) return dest;
    const aw = Math.atan2(w.y - b.y, w.x - b.x);
    const ad = Math.atan2(dest.y - b.y, dest.x - b.x);
    const dir = Phaser.Math.Angle.Wrap(ad - aw) >= 0 ? 1 : -1;
    const r = Math.max(R, dist(w, b));
    const a = aw + dir * 0.35;
    return { x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r };
  }

  // Step towards `target`; returns the remaining straight distance to it.
  walk(w, target, speed, dt) {
    const nav = this.navPoint(w, target);
    const d = dist(w, nav);
    const step = Math.min(d, speed * dt);
    if (d > 0.5) {
      w.walkX = ((nav.x - w.x) / d) * speed;
      w.walkY = ((nav.y - w.y) / d) * speed;
      w.x += ((nav.x - w.x) / d) * step;
      w.y += ((nav.y - w.y) / d) * step;
      w.speedNow = speed;
      w.faceTowards(nav.x, nav.y);
    }
    return dist(w, target);
  }

  // Where a worker stands to unload: the stockpile's side facing the base centre.
  unloadPoint(hut) {
    const s = hut.stockpile;
    const a = Math.atan2(this.base.y - s.y, this.base.x - s.x);
    return { x: s.x + Math.cos(a) * 30, y: s.y + Math.sin(a) * 30 };
  }

  // ---------- update ----------

  update(delta) {
    if (this.workers.some((w) => !w.alive)) this.workers = this.workers.filter((w) => w.alive);
    const dt = delta / 1000;
    for (const w of this.workers) {
      w.walkX = 0;
      w.walkY = 0;
      w.speedNow = 0;
      this.think(w, delta, dt);
    }
    this.separate();
    for (const w of this.workers) {
      this.constrain(w, dt);
      w.sync(delta);
    }
    this.updatePickup(delta);
  }

  think(w, delta, dt) {
    const W = CONFIG.WORKER;
    const stats = w.hut.stats;
    const now = this.scene.time.now;

    if (this.zombieNear(w.x, w.y, W.DANGER_RADIUS)) w.lastDangerAt = now;
    const inDanger = now - w.lastDangerAt < W.SAFE_DELAY;
    if (inDanger && w.state !== 'flee') {
      this.release(w);
      w.state = 'flee';
    } else if (!inDanger && w.state === 'flee') {
      w.state = w.load >= this.capacity(w) ? 'toHut' : 'seek';
    }

    if (this.base.contains(w.x, w.y)) w.heal(W.REGEN_PER_SECOND * dt);

    switch (w.state) {
      case 'seek': {
        const node = this.pickNode(w);
        if (node) {
          this.claim(w, node);
          w.state = 'toNode';
        } else if (w.carried > 0) {
          w.state = 'toHut';
        } else {
          w.state = 'idle';
          w.timer = W.IDLE_RETRY;
        }
        break;
      }
      case 'idle':
        this.walk(w, w.hut.door, stats.SPEED, dt);
        w.timer -= delta;
        if (w.timer <= 0) w.state = 'seek';
        break;
      case 'toNode': {
        const n = w.node;
        if (!n?.active) {
          w.state = 'seek';
          break;
        }
        if (this.gap(w, n) <= W.GATHER_REACH) {
          w.state = 'gather';
          w.faceTowards(n.x, n.y);
        } else {
          this.walk(w, n, stats.SPEED, dt);
        }
        break;
      }
      case 'gather': {
        w.gatherer.update(delta);
        if (w.tool.swinging) break;
        const full = w.load >= this.capacity(w);
        if (full || !w.node?.active) {
          this.release(w);
          w.state = full ? 'toHut' : 'seek';
        } else if (this.gap(w, w.node) > CONFIG.GATHER.RANGE) {
          w.state = 'toNode'; // got pushed away
        }
        break;
      }
      case 'toHut':
        if (this.walk(w, this.unloadPoint(w.hut), stats.SPEED, dt) < 6) {
          w.state = 'drop';
          w.timer = 0;
        }
        break;
      case 'drop':
        w.faceTowards(w.hut.stockpile.x, w.hut.stockpile.y);
        w.timer -= delta;
        while (w.timer <= 0 && w.carried > 0) {
          this.dropOne(w);
          w.timer += W.DROP_INTERVAL;
        }
        if (w.carried === 0 && w.incoming === 0) w.state = 'seek';
        break;
      case 'flee':
        this.walk(w, w.hut.door, stats.SPEED * W.FLEE_SPEED_MULTIPLIER, dt);
        break;
      default:
        break;
    }
  }

  dropOne(w) {
    const type = w.backpack.stack.topType;
    if (!type) return;
    const from = w.backpack.takeOffPosition(type);
    w.carry.remove(type, 1);
    const pile = w.hut.stockpile;
    flyItem(this.scene, {
      fromX: from.x,
      fromY: from.y,
      getTarget: () => pile.nextSlotWorldPosition(),
      type,
      duration: CONFIG.BUILD.FLY_DURATION,
      arcHeight: CONFIG.BUILD.FLY_ARC_HEIGHT,
      onArrive: () => pile.add(type),
    });
  }

  separate() {
    const list = this.workers;
    const k = CONFIG.WORKER.SEPARATION;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const min = (a.radius + b.radius) * k;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= min) continue;
        const nx = d > 0.01 ? dx / d : 1;
        const ny = d > 0.01 ? dy / d : 0;
        const push = (min - Math.max(d, 0.01)) * 0.25;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }

  constrain(w, dt) {
    const W = CONFIG.WORKER;
    pushOutOfNodes(w, this.resources.nodes, w.walkX, w.walkY, dt);

    // The fence is solid except at the gate.
    const b = this.base;
    const rf = this.fenceRadius;
    const d = dist(w, b);
    if (d > 0 && dist(w, this.gate) >= W.GATE_CORRIDOR) {
      let limit = null;
      if (w.wasInside && d > rf - w.radius - 4 && d < rf + w.radius + 10) limit = rf - w.radius - 4;
      if (!w.wasInside && d < rf + w.radius + 4 && d > rf - w.radius - 10) limit = rf + w.radius + 4;
      if (limit !== null) {
        w.x = b.x + ((w.x - b.x) / d) * limit;
        w.y = b.y + ((w.y - b.y) / d) * limit;
      }
    }
    w.wasInside = this.isInside(w);

    const Wd = CONFIG.WORLD;
    w.x = Phaser.Math.Clamp(w.x, w.radius, Wd.WIDTH - w.radius);
    w.y = Phaser.Math.Clamp(w.y, w.radius, Wd.HEIGHT - w.radius);
  }

  // Player on a stockpile: its items fly into the backpack one by one.
  updatePickup(delta) {
    const p = this.player;
    for (const hut of this.huts) {
      const pile = hut.stockpile;
      if (!p.alive || !pile.contains(p.x, p.y)) {
        pile.pickupTimer = 0;
        continue;
      }
      pile.pickupTimer -= delta;
      while (pile.pickupTimer <= 0 && pile.total > 0) {
        const item = pile.take();
        this.backpack.flyIn(item.x, item.y, item.type, () => this.inventory.add(item.type, 1));
        pile.pickupTimer += CONFIG.STOCKPILE.PICKUP_INTERVAL;
      }
      if (pile.total === 0) pile.pickupTimer = Math.max(pile.pickupTimer, 0);
    }
  }
}
