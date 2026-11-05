import { CONFIG } from '../config.js';

// Returns the fraction t (0..1) along segment (x0,y0)->(x1,y1) where it first
// enters the circle (cx, cy, r), or null if it doesn't.
function segmentCircleT(x0, y0, x1, y1, cx, cy, r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const fx = x0 - cx;
  const fy = y0 - cy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0; // already inside
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

// Every arrow in flight. Arrows fly in a straight line and hit the first
// target along their path (swept test, so fast arrows can't skip through).
// `targets` must expose `alive`: an array of objects with x, y, radius,
// alive and takeHit(damage).
export class Projectiles {
  constructor(scene, targets) {
    this.scene = scene;
    this.targets = targets;
    this.arrows = [];
  }

  fire({ x, y, angle, speed, damage, maxDistance }) {
    const view = this.makeArrowView(x, y, angle);
    this.arrows.push({
      x, y, speed, damage, maxDistance,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      traveled: 0,
      view,
    });
  }

  makeArrowView(x, y, angle) {
    const A = CONFIG.ARROW;
    const L = A.LENGTH;
    const g = this.scene.add.graphics();
    // Drawn pointing along +x with the tip at (0, 0).
    g.fillStyle(0x000000, 0.15).fillRect(-L, 3, L, 2); // shadow
    g.fillStyle(A.SHAFT_COLOR, 1).fillRect(-L, -1, L - 4, 2);
    g.fillStyle(A.HEAD_COLOR, 1).fillTriangle(0, 0, -7, -3.5, -7, 3.5);
    g.fillStyle(A.FLETCH_COLOR, 1);
    g.fillTriangle(-L + 5, -1, -L, -4, -L + 1, -1);
    g.fillTriangle(-L + 5, 1, -L, 4, -L + 1, 1);
    return g.setPosition(x, y).setRotation(angle).setDepth(A.DEPTH);
  }

  update(delta) {
    if (this.arrows.length === 0) return;
    const dt = delta / 1000;
    const hitR = CONFIG.ARROW.HIT_RADIUS;

    this.arrows = this.arrows.filter((arrow) => {
      const step = Math.min(arrow.speed * dt, arrow.maxDistance - arrow.traveled);
      const nx = arrow.x + arrow.dx * step;
      const ny = arrow.y + arrow.dy * step;

      // First target along this frame's path.
      let hit = null;
      let hitT = Infinity;
      for (const t of this.targets.alive) {
        if (!t.alive) continue;
        const tt = segmentCircleT(arrow.x, arrow.y, nx, ny, t.x, t.y, t.radius + hitR);
        if (tt !== null && tt < hitT) {
          hit = t;
          hitT = tt;
        }
      }
      if (hit) {
        hit.takeHit(arrow.damage);
        hit.knockback?.(arrow.dx, arrow.dy);
        arrow.view.destroy();
        return false;
      }

      arrow.x = nx;
      arrow.y = ny;
      arrow.traveled += step;
      arrow.view.setPosition(nx, ny);
      if (arrow.traveled >= arrow.maxDistance) {
        // Missed: drop and fade.
        this.scene.tweens.add({
          targets: arrow.view,
          alpha: 0,
          duration: 150,
          onComplete: () => arrow.view.destroy(),
        });
        return false;
      }
      return true;
    });
  }
}
