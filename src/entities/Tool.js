import { CONFIG } from '../config.js';

// The axe / pickaxe drawn in the player's hand. Hidden when idle.
export class Tool {
  constructor(scene, bodyRadius) {
    this.scene = scene;
    this.bodyRadius = bodyRadius;
    this.container = scene.add.container(0, 0);
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);
    this.container.setVisible(false);
    this.currentType = null;
    this.swinging = false;
  }

  draw(type) {
    if (this.currentType === type) return;
    this.currentType = type;
    const t = CONFIG.TOOLS[type];
    const g = this.graphics;
    const start = this.bodyRadius * 0.4;
    const end = this.bodyRadius + t.LENGTH;
    g.clear();
    g.lineStyle(4, t.HANDLE_COLOR, 1);
    g.lineBetween(start, 0, end, 0);
    g.fillStyle(t.HEAD_COLOR, 1);
    if (type === 'axe') {
      // single broad blade on one side
      g.fillTriangle(end - 10, 0, end, -11, end + 2, 3);
      g.fillRect(end - 8, -2, 8, 4);
    } else {
      // pickaxe: curved head pointing both ways
      g.fillTriangle(end - 2, -13, end + 3, 0, end - 3, 0);
      g.fillTriangle(end - 2, 13, end + 3, 0, end - 3, 0);
    }
  }

  // Wind up, strike towards `angle`, call onImpact at the end of the strike.
  // timings: { windup, strike } in ms; defaults to the player's (CONFIG.GATHER).
  swing(type, angle, onImpact, timings = {}) {
    const windup = timings.windup ?? CONFIG.GATHER.WINDUP_DURATION;
    const strike = timings.strike ?? CONFIG.GATHER.STRIKE_DURATION;
    this.draw(type);
    this.swinging = true;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(true).setAlpha(1).setRotation(angle - 0.4);

    this.scene.tweens.add({
      targets: this.container,
      rotation: angle - 1.5,
      duration: windup,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.container,
          rotation: angle + 0.25,
          duration: strike,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.swinging = false;
            onImpact();
            this.scene.tweens.add({
              targets: this.container,
              alpha: 0,
              delay: 120,
              duration: 120,
              onComplete: () => this.container.setVisible(false),
            });
          },
        });
      },
    });
  }
}
