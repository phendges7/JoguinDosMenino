import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Zombie } from '../entities/Zombie.js';
import { pushOutOfNodes, pushOutOfCircle } from './obstacles.js';

// Owns all living zombies: decides where each one walks, moves them, keeps
// them apart, and keeps them out of trees, the player and the base.
// Zombies walk the road from the portal to the gate, each in its own lane
// (a sideways offset from the centre line). A zombie lured off the road to
// chase the player rejoins it at the nearest road point afterwards.
// It does NOT deal damage: it only sets `touchingPlayer` / `atBase` flags,
// which Combat reads.
//
// Also the target provider for Shooters / Projectiles:
//   findNearest(x, y, range), alive (array of living zombies).
//
// Events: 'killed' (zombie)
export class ZombieManager extends Phaser.Events.EventEmitter {
  constructor(scene, { player, base, resources, road }) {
    super();
    this.scene = scene;
    this.player = player;
    this.base = base;
    this.resources = resources;
    this.path = this.buildPath(road);
    this.zombies = [];
  }

  get alive() { return this.zombies; }
  get count() { return this.zombies.length; }

  // Towers are built after zombies exist (they need the zombies to target).
  setTowers(towers) {
    this.towers = towers;
  }

  // Worker provider (WorkerManager): anything with `alive` (array of workers).
  setWorkers(workers) {
    this.workers = workers;
  }

  nearestTower(x, y, radius) {
    let best = null;
    let bestD = radius * radius;
    for (const t of this.towers?.alive ?? []) {
      if (!t.alive) continue;
      const d = (t.x - x) ** 2 + (t.y - y) ** 2;
      if (d <= bestD) {
        best = t;
        bestD = d;
      }
    }
    return best;
  }

  backToRoad(z) {
    z.state = 'road';
    z.targetTower = null;
    z.pathIndex = this.nearestPathIndex(z.x, z.y); // rejoin where it left off
  }

  // Road points from the portal to the base centre, PATH_STEP apart,
  // each with a unit normal (nx, ny) for lane offsets.
  buildPath(road) {
    const samples = road.getEnemyPath();
    const step = CONFIG.ZOMBIE.PATH_STEP;
    const pts = [samples[0]];
    let acc = 0;
    for (let i = 1; i < samples.length; i++) {
      acc += Phaser.Math.Distance.Between(samples[i - 1].x, samples[i - 1].y, samples[i].x, samples[i].y);
      if (acc >= step || i === samples.length - 1) {
        pts.push(samples[i]);
        acc = 0;
      }
    }
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { x: p.x, y: p.y, nx: -(b.y - a.y) / len, ny: (b.x - a.x) / len };
    });
  }

  nearestPathIndex(x, y) {
    let best = 0;
    let bestD = Infinity;
    this.path.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  spawn(x, y, { emerge = false } = {}) {
    const Z = CONFIG.ZOMBIE;
    const z = new Zombie(this.scene, x, y, { emerge });
    const maxLane = Math.max(0, CONFIG.ROAD.WIDTH / 2 - z.radius) * Z.LANE_SPREAD;
    z.laneOffset = Phaser.Math.FloatBetween(-maxLane, maxLane);
    z.pathIndex = this.nearestPathIndex(x, y);
    z.onDeath = () => this.emit('killed', z);
    this.zombies.push(z);
    return z;
  }

  // Next point to walk to along the road; advances past points already reached.
  // Past the last point it heads for the base centre (and stops at the gate).
  roadTarget(z) {
    const reach = CONFIG.ZOMBIE.WAYPOINT_REACH;
    while (z.pathIndex < this.path.length) {
      const p = this.path[z.pathIndex];
      const tx = p.x + p.nx * z.laneOffset;
      const ty = p.y + p.ny * z.laneOffset;
      if (Math.hypot(tx - z.x, ty - z.y) > reach) return { x: tx, y: ty };
      z.pathIndex++;
    }
    return { x: this.base.x, y: this.base.y };
  }

  findNearest(x, y, range) {
    let best = null;
    let bestD = range * range;
    for (const z of this.zombies) {
      if (!z.alive) continue;
      const d = (z.x - x) ** 2 + (z.y - y) ** 2;
      if (d <= bestD) {
        best = z;
        bestD = d;
      }
    }
    return best;
  }

  // Closest distance a zombie's centre may get to the base centre.
  baseStopDistance(z) {
    return this.base.displayRadius + z.radius + CONFIG.ZOMBIE.BASE_STOP_GAP;
  }

  update(delta) {
    // Zombies killed since last frame (by arrows) drop out of the list.
    if (this.zombies.some((z) => !z.alive)) this.zombies = this.zombies.filter((z) => z.alive);

    const dt = delta / 1000;
    if (dt <= 0) return;
    for (const z of this.zombies) {
      z.prevX = z.x;
      z.prevY = z.y;
      this.steer(z, delta, dt);
    }
    this.separate();
    for (const z of this.zombies) {
      this.constrain(z, dt);
      // Actual (smoothed) velocity after pushes and blocks: what shooters lead
      // with. A zombie stuck in a crowd wants to walk but isn't moving.
      const k = 1 - Math.exp(-12 * dt);
      z.vx = Phaser.Math.Linear(z.vx, (z.x - z.prevX) / dt, k);
      z.vy = Phaser.Math.Linear(z.vy, (z.y - z.prevY) / dt, k);
      z.sync(delta, z.walkX !== 0 || z.walkY !== 0);
    }
  }

  steer(z, delta, dt) {
    const Z = CONFIG.ZOMBIE;
    const p = this.player;
    const b = this.base;
    z.attackTimer = Math.max(0, z.attackTimer - delta);

    // Only chase a living player who is outside the fence.
    const huntable = p.alive && !b.contains(p.x, p.y);
    const toPlayer = Phaser.Math.Distance.Between(z.x, z.y, p.x, p.y);
    if (z.state === 'chase') {
      if (!huntable || toPlayer > Z.LOSE_RADIUS) this.backToRoad(z);
    } else if (huntable && toPlayer <= Z.NOTICE_RADIUS) {
      z.state = 'chase';
      z.targetTower = null;
    }

    // Towers: leave the road to attack one that's close; return when it falls.
    if (z.state === 'tower' && !z.targetTower?.alive) this.backToRoad(z);
    if (z.state === 'road') {
      const t = this.nearestTower(z.x, z.y, Z.TOWER_NOTICE_RADIUS);
      if (t) {
        z.state = 'tower';
        z.targetTower = t;
      }
    }

    z.touchingPlayer = p.alive && toPlayer <= z.radius + p.radius + Z.CONTACT_RANGE;
    // Any tower it's pressed against counts (also ones it merely bumps into).
    z.touchingTower = null;
    if (z.state !== 'chase') {
      for (const t of this.towers?.alive ?? []) {
        if (Math.hypot(t.x - z.x, t.y - z.y) <= z.radius + t.radius + Z.CONTACT_RANGE) {
          z.touchingTower = t;
          if (t === z.targetTower) break;
        }
      }
    }
    // Workers it bumps into get attacked (zombies don't hunt them).
    z.touchingWorker = null;
    for (const w of this.workers?.alive ?? []) {
      if (w.alive && Math.hypot(w.x - z.x, w.y - z.y) <= z.radius + w.radius + Z.CONTACT_RANGE) {
        z.touchingWorker = w;
        break;
      }
    }
    const toBase = Phaser.Math.Distance.Between(z.x, z.y, b.x, b.y);
    z.atBase = toBase <= this.baseStopDistance(z) + Z.CONTACT_RANGE;

    let target;
    if (z.state === 'chase') target = p;
    else if (z.state === 'tower') target = z.targetTower;
    else target = this.roadTarget(z);
    const tx = target.x;
    const ty = target.y;
    z.turnTowards(Math.atan2(ty - z.y, tx - z.x), delta);

    const stopped = z.touchingPlayer || z.emerging || z.touchingWorker || z.touchingTower
      || (z.state === 'road' && z.atBase);
    const dist = Math.hypot(tx - z.x, ty - z.y);
    if (stopped || dist < 1) {
      z.walkX = 0;
      z.walkY = 0;
      return;
    }
    const speed = (z.state === 'chase' ? Z.CHASE_SPEED : Z.SPEED) * z.speedScale;
    z.walkX = ((tx - z.x) / dist) * speed;
    z.walkY = ((ty - z.y) / dist) * speed;
    z.x += z.walkX * dt;
    z.y += z.walkY * dt;
  }

  // Soft pairwise push so zombies spread out instead of stacking.
  separate() {
    const Z = CONFIG.ZOMBIE;
    const list = this.zombies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const min = (a.radius + b.radius) * Z.SEPARATION;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        let d = Math.sqrt(d2);
        if (d < 0.01) {
          // exactly on top of each other: pick a random direction
          const ang = Math.random() * Math.PI * 2;
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          d = 1;
        }
        const push = ((min - d) / 2) * Z.SEPARATION_STRENGTH;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }

  // Hard limits, applied after movement and separation.
  constrain(z, dt) {
    const Z = CONFIG.ZOMBIE;

    if (Z.BLOCKED_BY_NODES) pushOutOfNodes(z, this.resources.nodes, z.walkX, z.walkY, dt);

    // Towers are solid.
    for (const t of this.towers?.alive ?? []) pushOutOfCircle(z, t.x, t.y, t.radius);

    const p = this.player;
    if (p.alive) {
      const min = z.radius + p.radius;
      const dx = z.x - p.x;
      const dy = z.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < min && d > 0) {
        z.x = p.x + (dx / d) * min;
        z.y = p.y + (dy / d) * min;
      }
    }

    // The fence is solid for zombies (gate included).
    const b = this.base;
    const stop = this.baseStopDistance(z);
    const bx = z.x - b.x;
    const by = z.y - b.y;
    const bd = Math.hypot(bx, by);
    if (bd < stop) {
      const nx = bd > 0 ? bx / bd : 1;
      const ny = bd > 0 ? by / bd : 0;
      z.x = b.x + nx * stop;
      z.y = b.y + ny * stop;
    }

    const W = CONFIG.WORLD;
    z.x = Phaser.Math.Clamp(z.x, z.radius, W.WIDTH - z.radius);
    z.y = Phaser.Math.Clamp(z.y, z.radius, W.HEIGHT - z.radius);
  }
}
