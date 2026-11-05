import Phaser from 'phaser';
import { CONFIG } from '../config.js';

// Wooden fence around the base with one gate where the road crosses it.
// Every post has a static collider so the player can only pass through the gate.
// The gate doors swing open when the player is near; they don't block the player.
// (Zombies, in a later milestone, should treat the closed gate as solid.)
// The fence rebuilds itself when the base expands.
// Posts and rail pieces are separate y-sorted sprites, so the player is hidden
// behind the near (bottom) side and drawn in front of the far side.
export class Fence {
  constructor(scene, base, road, player) {
    this.scene = scene;
    this.base = base;
    this.road = road;
    this.player = player;

    this.colliders = scene.physics.add.staticGroup();
    scene.physics.add.collider(player.sprite, this.colliders);
    this.segments = [];
    this.gateView = scene.add.container(0, 0);
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
    this.scene.tweens.add({ targets: [...this.segments, this.gateView], alpha: 0, duration: 300 });
  }

  build(radius) {
    const F = CONFIG.FENCE;
    const { x: cx, y: cy } = this.base;
    this.colliders.clear(true, true);
    this.gateView.removeAll(true);
    this.doors = [];
    this.scene.tweens.killTweensOf([...this.segments, this.gateView]);
    this.segments.forEach((g) => g.destroy());
    this.segments = [];
    this.gateView.setAlpha(1);

    const theta = this.road.angleAtRadius(radius);
    const halfGap = F.GATE_WIDTH / 2 / radius;
    const start = theta + halfGap;
    const end = theta + Math.PI * 2 - halfGap;
    this.gateAngle = theta;
    this.gateX = cx + Math.cos(theta) * radius;
    this.gateY = cy + Math.sin(theta) * radius;

    // Posts and rail pieces are small sprites, each y-sorted on its own:
    // cheap to draw (batched, no per-frame tessellation) and the player is
    // correctly in front of / behind every part of the fence.
    this.ensurePostTexture();
    const count = Math.ceil(((end - start) * radius) / F.POST_SPACING);
    const s = F.POST_SIZE;
    const points = [];
    for (let i = 0; i <= count; i++) {
      const a = start + ((end - start) * i) / count;
      points.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    }
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i];
      const q = points[i + 1];
      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;
      const len = Math.hypot(q.x - p.x, q.y - p.y) + 1;
      const rot = Math.atan2(q.y - p.y, q.x - p.x);
      const depth = my + s / 2 - 1; // just behind the posts at the same height
      const shadow = this.scene.add.image(mx + 2, my + 3, 'fx-px').setDisplaySize(len, F.RAIL_WIDTH + 2)
        .setRotation(rot).setTint(0x000000).setDepth(depth - 0.5);
      shadow.baseAlpha = 0.18; // the fade-in tween returns each piece to its own alpha
      this.segments.push(
        shadow,
        this.scene.add.image(mx, my, 'fx-px').setDisplaySize(len, F.RAIL_WIDTH).setRotation(rot)
          .setTint(F.RAIL_COLOR).setDepth(depth),
      );
    }
    for (const { x, y } of points) {
      this.segments.push(this.scene.add.image(x, y, 'fence-post').setDepth(y + s / 2));
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

    this.gateView.setDepth(this.gateY + gp / 2);

    // pop-in when rebuilt after an expansion
    this.segments.forEach((g) => g.setAlpha(0));
    this.gateView.setAlpha(0);
    this.scene.tweens.add({ targets: [...this.segments, this.gateView], alpha: (t) => t.baseAlpha ?? 1, duration: 300 });
  }

  ensurePostTexture() {
    if (this.scene.textures.exists('fence-post')) return;
    const F = CONFIG.FENCE;
    const s = F.POST_SIZE;
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(F.POST_DARK, 1).fillRect(0, 0, s, s);
    g.fillStyle(F.POST_COLOR, 1).fillRect(1, 1, s - 2, s - 3);
    g.generateTexture('fence-post', s, s);
    g.destroy();
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

  // Other things that open the gate when close (workers): () => [{ x, y }, ...]
  setExtraOpeners(fn) {
    this.extraOpeners = fn;
  }

  update(delta) {
    const F = CONFIG.FENCE;
    const isNear = (o) => Phaser.Math.Distance.Between(o.x, o.y, this.gateX, this.gateY) < F.GATE_OPEN_DISTANCE;
    const near = isNear(this.player) || (this.extraOpeners?.() ?? []).some(isNear);
    const k = 1 - Math.exp(-F.GATE_OPEN_SPEED * (delta / 1000));
    this.openAmount = Phaser.Math.Linear(this.openAmount, near ? 1 : 0, k);
    for (const door of this.doors) {
      const diff = Phaser.Math.Angle.Wrap(door.openAngle - door.closedAngle);
      door.rotation = door.closedAngle + diff * this.openAmount;
    }
  }
}
