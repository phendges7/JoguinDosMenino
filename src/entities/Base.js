import Phaser from 'phaser';
import { CONFIG } from '../config.js';

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
    this.draw();
  }

  draw() {
    const B = CONFIG.BASE;
    this.graphics.clear();
    this.graphics.fillStyle(B.COLOR, 1).fillCircle(this.x, this.y, this.displayRadius);
    this.graphics.lineStyle(B.EDGE_WIDTH, B.EDGE_COLOR, 1).strokeCircle(this.x, this.y, this.displayRadius);
  }

  contains(x, y, padding = 0) {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) <= this.radius + padding;
  }

  expandTo(radius) {
    if (radius <= this.radius) return;
    this.radius = radius;
    this.scene.events.emit('base-expand-start', radius);
    this.scene.tweens.add({
      targets: this,
      displayRadius: radius,
      duration: CONFIG.BASE.EXPAND_DURATION,
      ease: 'Back.easeOut',
      onUpdate: () => this.draw(),
      onComplete: () => this.scene.events.emit('base-expanded', radius),
    });
  }
}
