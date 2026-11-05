import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';

// The player's base: a lighter circle that can grow.
// `radius` is the logical size (changes instantly on expand);
// `displayRadius` animates towards it.
export class Base {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = CONFIG.BASE.RADIUS;
    this.displayRadius = this.radius;
    this.graphics = scene.add.graphics().setDepth(-900);
    this.image = null;
    this.bake();
  }

  draw() {
    this.paint(this.graphics.clear(), this.x, this.y);
  }

  // Base colour with a feathered outer edge and a warm glow towards the centre.
  paint(g, cx, cy) {
    const B = CONFIG.BASE;
    const V = VISUALS.BASE;
    const r = this.displayRadius;
    for (let i = V.FEATHER_STEPS; i >= 1; i--) {
      g.fillStyle(B.COLOR, 0.13).fillCircle(cx, cy, r + (V.FEATHER * i) / V.FEATHER_STEPS);
    }
    g.fillStyle(B.COLOR, 1).fillCircle(cx, cy, r);
    for (let i = 1; i <= V.INNER_GLOW_STEPS; i++) {
      g.fillStyle(V.WARM_TINT, V.WARM_ALPHA / V.INNER_GLOW_STEPS)
        .fillCircle(cx, cy, r * (1 - i / (V.INNER_GLOW_STEPS + 1.5)));
    }
    g.lineStyle(B.EDGE_WIDTH, B.EDGE_COLOR, 0.55).strokeCircle(cx, cy, r - B.EDGE_WIDTH / 2);
  }

  // Graphics are re-tessellated every frame, and the stacked translucent
  // circles are big: draw them once into a texture and show that instead.
  // Live graphics are only used while the base is growing.
  bake() {
    const key = 'base-baked';
    const half = Math.ceil(this.displayRadius + VISUALS.BASE.FEATHER + 4);
    this.image?.destroy();
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    this.paint(g, half, half);
    g.generateTexture(key, half * 2, half * 2);
    g.destroy();
    this.image = this.scene.add.image(this.x, this.y, key).setDepth(-900);
    this.graphics.clear().setVisible(false);
  }

  showLive() {
    this.image?.setVisible(false);
    this.graphics.setVisible(true);
  }

  contains(x, y, padding = 0) {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) <= this.radius + padding;
  }

  expandTo(radius) {
    if (radius <= this.radius) return;
    this.radius = radius;
    this.scene.events.emit('base-expand-start', radius);
    this.showLive();
    this.scene.tweens.add({
      targets: this,
      displayRadius: radius,
      duration: CONFIG.BASE.EXPAND_DURATION,
      ease: 'Back.easeOut',
      onUpdate: () => this.draw(),
      onComplete: () => {
        this.bake();
        this.scene.events.emit('base-expanded', radius);
      },
    });
  }
}
