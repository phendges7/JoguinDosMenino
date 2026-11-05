import Phaser from 'phaser';
import { CONFIG } from '../config.js';

// A dirt road from the base centre out to the zombie spawn at the map edge.
// Distances along the road are measured from the base centre outwards.
// Enemies (later milestone) walk it in reverse: getEnemyPath().
export class Road {
  constructor(scene, base) {
    this.scene = scene;
    this.base = base;
    const R = CONFIG.ROAD;
    const pts = R.WAYPOINTS.map(([dx, dy]) => new Phaser.Math.Vector2(base.x + dx, base.y + dy));
    this.curve = new Phaser.Curves.Spline(pts);
    this.length = this.curve.getLength();
    this.samples = this.curve.getSpacedPoints(Math.ceil(this.length / 8));
    this.coarse = this.samples.filter((_, i) => i % 3 === 0); // for distance checks
    this.draw();
  }

  u(distance) {
    return Phaser.Math.Clamp(distance / this.length, 0, 1);
  }

  pointAtDistance(distance) {
    return this.curve.getPointAt(this.u(distance));
  }

  tangentAtDistance(distance) {
    return this.curve.getTangentAt(this.u(distance));
  }

  // A point beside the road: `side` 1 or -1, `offset` px from the centre line.
  sidePoint(distance, side, offset) {
    const p = this.pointAtDistance(distance);
    const t = this.tangentAtDistance(distance);
    return { x: p.x - t.y * side * offset, y: p.y + t.x * side * offset };
  }

  distanceTo(x, y) {
    let best = Infinity;
    for (const p of this.coarse) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  // Angle (from the base centre) where the road crosses a circle of `radius`.
  angleAtRadius(radius) {
    const b = this.base;
    const p = this.samples.find((s) => Phaser.Math.Distance.Between(s.x, s.y, b.x, b.y) >= radius)
      ?? this.samples[this.samples.length - 1];
    return Math.atan2(p.y - b.y, p.x - b.x);
  }

  // Points from the spawn to the base centre.
  getEnemyPath() {
    return [...this.samples].reverse();
  }

  get spawnPoint() {
    return this.samples[this.samples.length - 1];
  }

  draw() {
    const R = CONFIG.ROAD;
    const g = this.scene.add.graphics().setDepth(-950);
    this.graphics = g; // static: GameScene bakes it into the ground texture
    const half = R.WIDTH / 2;

    // Thick lines in Phaser Graphics have ugly joins, so stamp circles instead.
    g.fillStyle(R.EDGE_COLOR, 1);
    for (const p of this.samples) g.fillCircle(p.x, p.y, half + 4);
    g.fillStyle(R.COLOR, 1);
    for (const p of this.samples) g.fillCircle(p.x, p.y, half);

    // Wheel ruts.
    g.fillStyle(R.RUT_COLOR, 0.6);
    this.samples.forEach((p, i) => {
      if (i % 2) return;
      const t = this.curve.getTangentAt(i / (this.samples.length - 1));
      for (const side of [-1, 1]) {
        g.fillCircle(p.x - t.y * side * half * 0.45, p.y + t.x * side * half * 0.45, 2.5);
      }
    });

    // Red chevrons pointing towards the base: the way enemies will walk.
    g.fillStyle(R.CHEVRON_COLOR, 0.55);
    for (let d = this.length - 120; d > 0; d -= R.CHEVRON_SPACING) {
      const p = this.pointAtDistance(d);
      const t = this.tangentAtDistance(d);
      const dx = -t.x; // towards the base
      const dy = -t.y;
      const nx = -dy;
      const ny = dx;
      // notched arrowhead, drawn as two triangles (tip, wing, notch)
      const tipX = p.x + dx * 16;
      const tipY = p.y + dy * 16;
      const notchX = p.x - dx * 2;
      const notchY = p.y - dy * 2;
      for (const side of [1, -1]) {
        g.fillTriangle(
          tipX, tipY,
          p.x - dx * 10 + nx * 12 * side, p.y - dy * 10 + ny * 12 * side,
          notchX, notchY,
        );
      }
    }

    this.drawSpawn();
  }

  // Dark portal with a pulsing red glow and a skull at the road's far end.
  drawSpawn() {
    const t = this.tangentAtDistance(this.length);
    const end = this.spawnPoint;
    const x = end.x - t.x * 50;
    const y = end.y - t.y * 50;
    const s = this.scene;

    const glow = s.add.circle(x, y, 70, 0xc0392b, 0.25).setDepth(-940);
    s.tweens.add({ targets: glow, scale: 1.25, alpha: 0.08, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.add.ellipse(x, y, 110, 70, 0x1a1a1a, 0.9).setDepth(-939);
    s.add.container(x, y - 4, [
      s.add.circle(0, 0, 14, 0xe8e8e8),
      s.add.rectangle(0, 12, 14, 8, 0xe8e8e8),
      s.add.circle(-5, -1, 4, 0x1a1a1a),
      s.add.circle(5, -1, 4, 0x1a1a1a),
      s.add.rectangle(-3, 13, 2, 6, 0x1a1a1a),
      s.add.rectangle(3, 13, 2, 6, 0x1a1a1a),
    ]).setDepth(-938);
  }
}
