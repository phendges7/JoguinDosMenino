import Phaser from 'phaser';
import { CONFIG } from '../config.js';

// Wooden fence around the base with one gate where the road crosses it.
// Every post has a static collider so the player can only pass through the gate.
// The gate doors swing open when the player is near; they don't block the player.
// (Zombies, in a later milestone, should treat the closed gate as solid.)
// The fence rebuilds itself when the base expands.
export class Fence {
  constructor(scene, base, road, player) {
    this.scene = scene;
    this.base = base;
    this.road = road;
    this.player = player;

    this.colliders = scene.physics.add.staticGroup();
    scene.physics.add.collider(player.sprite, this.colliders);
    this.graphics = scene.add.graphics().setDepth(-800);
    this.gateView = scene.add.container(0, 0).setDepth(-790);
    this.doors = [];
    this.openAmount = 0;

    this.build(base.radius);
    scene.events.on('base-expand-start', this.onExpandStart, this);
    scene.events.on('base-expanded', this.build, this);
    scene.events.once('shutdown', () => {
      scene.events.off('base-expand-start', this.onExpandStart, this);
      scene.events.off('base-expanded', this.build, this);
    });
  }

  onExpandStart() {
    this.scene.tweens.add({ targets: [this.graphics, this.gateView], alpha: 0, duration: 300 });
  }

  build(radius) {
    const F = CONFIG.FENCE;
    const { x: cx, y: cy } = this.base;
    this.colliders.clear(true, true);
    this.gateView.removeAll(true);
    this.doors = [];
    this.scene.tweens.killTweensOf([this.graphics, this.gateView]);
    this.graphics.clear().setAlpha(1);
    this.gateView.setAlpha(1);

    const theta = this.road.angleAtRadius(radius);
    const halfGap = F.GATE_WIDTH / 2 / radius;
    const start = theta + halfGap;
    const end = theta + Math.PI * 2 - halfGap;
    this.gateAngle = theta;
    this.gateX = cx + Math.cos(theta) * radius;
    this.gateY = cy + Math.sin(theta) * radius;

    const g = this.graphics;
    // shadow, then rail
    g.lineStyle(F.RAIL_WIDTH + 2, 0x000000, 0.18).beginPath().arc(cx + 2, cy + 3, radius, start, end).strokePath();
    g.lineStyle(F.RAIL_WIDTH, F.RAIL_COLOR, 1).beginPath().arc(cx, cy, radius, start, end).strokePath();

    // posts
    const count = Math.ceil(((end - start) * radius) / F.POST_SPACING);
    const s = F.POST_SIZE;
    for (let i = 0; i <= count; i++) {
      const a = start + ((end - start) * i) / count;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      g.fillStyle(F.POST_DARK, 1).fillRect(x - s / 2, y - s / 2, s, s);
      g.fillStyle(F.POST_COLOR, 1).fillRect(x - s / 2 + 1, y - s / 2 + 1, s - 2, s - 3);
      const c = this.scene.add.circle(x, y, F.POST_RADIUS, 0x000000, 0);
      this.colliders.add(c);
      c.body.setCircle(F.POST_RADIUS);
    }

    // gate: two stone posts and two wooden doors hinged on them
    const ax = cx + Math.cos(theta - halfGap) * radius;
    const ay = cy + Math.sin(theta - halfGap) * radius;
    const bx = cx + Math.cos(theta + halfGap) * radius;
    const by = cy + Math.sin(theta + halfGap) * radius;
    const doorLen = Phaser.Math.Distance.Between(ax, ay, bx, by) / 2 - 3;
    const gp = F.GATE_POST_SIZE;
    this.makeDoor(ax, ay, Math.atan2(by - ay, bx - ax), doorLen);
    this.makeDoor(bx, by, Math.atan2(ay - by, ax - bx), doorLen);
    for (const [x, y] of [[ax, ay], [bx, by]]) {
      this.gateView.add(this.scene.add.rectangle(x, y, gp, gp, F.GATE_POST_COLOR).setStrokeStyle(2, 0x5f5f5f));
    }

    // pop-in when rebuilt after an expansion
    this.graphics.setAlpha(0);
    this.gateView.setAlpha(0);
    this.scene.tweens.add({ targets: [this.graphics, this.gateView], alpha: 1, duration: 300 });
  }

  makeDoor(x, y, closedAngle, length) {
    const F = CONFIG.FENCE;
    const door = this.scene.add.container(x, y, [
      this.scene.add.rectangle(0, 0, length, 8, F.POST_COLOR).setOrigin(0, 0.5).setStrokeStyle(1, F.POST_DARK),
      this.scene.add.rectangle(length * 0.33, 0, 2, 8, F.POST_DARK),
      this.scene.add.rectangle(length * 0.66, 0, 2, 8, F.POST_DARK),
    ]);
    door.closedAngle = closedAngle;
    door.openAngle = this.gateAngle; // swing outwards, away from the base
    door.rotation = closedAngle;
    this.gateView.add(door);
    this.doors.push(door);
  }

  update(delta) {
    const F = CONFIG.FENCE;
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gateX, this.gateY) < F.GATE_OPEN_DISTANCE;
    const k = 1 - Math.exp(-F.GATE_OPEN_SPEED * (delta / 1000));
    this.openAmount = Phaser.Math.Linear(this.openAmount, near ? 1 : 0, k);
    for (const door of this.doors) {
      const diff = Phaser.Math.Angle.Wrap(door.openAngle - door.closedAngle);
      door.rotation = door.closedAngle + diff * this.openAmount;
    }
  }
}
