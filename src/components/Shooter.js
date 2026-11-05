// Reusable auto-aiming shooter, used by the player's bow and by archery towers.
//
//   new Shooter(scene, {
//     source,        // anything with x / y (player, tower, ...)
//     stats,         // { RANGE, COOLDOWN, ARROW_SPEED, ARROW_DAMAGE, ARROW_MAX_DISTANCE, LEAD_TARGET }
//     targets,       // has findNearest(x, y, range) -> target with x, y, vx, vy
//     projectiles,   // Projectiles system: fire({ x, y, angle, ... })
//     muzzleOffset,  // arrows start this far from the source centre, towards the target
//     canFire,       // optional () => boolean, e.g. "player is alive"
//     onFire,        // optional (target, angle) => void, for visuals
//   })
//
// Call update(delta) every frame. `target` holds the current target (or null)
// so visuals can point at it between shots.
export class Shooter {
  constructor(scene, { source, stats, targets, projectiles, muzzleOffset = 0, canFire, onFire }) {
    this.scene = scene;
    this.source = source;
    this.stats = stats;
    this.targets = targets;
    this.projectiles = projectiles;
    this.muzzleOffset = muzzleOffset;
    this.canFire = canFire ?? (() => true);
    this.onFire = onFire;
    this.cooldown = 0;
    this.target = null;
  }

  // Swap stats (e.g. a tower levelled up). A shorter cooldown applies right away.
  setStats(stats) {
    this.stats = stats;
    this.cooldown = Math.min(this.cooldown, stats.COOLDOWN);
  }

  update(delta) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (!this.canFire()) {
      this.target = null;
      return;
    }
    const { x, y } = this.source;
    this.target = this.targets.findNearest(x, y, this.stats.RANGE);
    if (!this.target || this.cooldown > 0) return;

    this.cooldown = this.stats.COOLDOWN;
    const aim = this.aimPoint(this.target);
    const angle = Math.atan2(aim.y - y, aim.x - x);
    this.projectiles.fire({
      x: x + Math.cos(angle) * this.muzzleOffset,
      y: y + Math.sin(angle) * this.muzzleOffset,
      angle,
      speed: this.stats.ARROW_SPEED,
      damage: this.stats.ARROW_DAMAGE,
      maxDistance: this.stats.ARROW_MAX_DISTANCE,
    });
    this.onFire?.(this.target, angle);
  }

  // Where to aim: the target's position, optionally led by its velocity
  // (one prediction step is plenty at these speeds).
  aimPoint(target) {
    if (!this.stats.LEAD_TARGET) return { x: target.x, y: target.y };
    const { x, y } = this.source;
    const flightTime = Math.hypot(target.x - x, target.y - y) / this.stats.ARROW_SPEED;
    return {
      x: target.x + (target.vx ?? 0) * flightTime,
      y: target.y + (target.vy ?? 0) * flightTime,
    };
  }
}
