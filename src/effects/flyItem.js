import Phaser from 'phaser';
import { CONFIG } from '../config.js';

export function darken(color, amount = 35) {
  return Phaser.Display.Color.IntegerToColor(color).darken(amount).color;
}

// A resource block that arcs from a point to a (possibly moving) target.
// getTarget() is re-read every frame so it can chase the player.
export function flyItem(scene, { fromX, fromY, getTarget, type, duration, arcHeight, onArrive }) {
  const B = CONFIG.BACKPACK;
  const color = CONFIG.RESOURCES[type].color;
  const item = scene.add
    .rectangle(fromX, fromY, B.BLOCK_WIDTH + 2, B.BLOCK_HEIGHT + 2, color)
    .setStrokeStyle(1, darken(color))
    .setDepth(1e6);
  const progress = { t: 0 };
  scene.tweens.add({
    targets: progress,
    t: 1,
    duration,
    ease: 'Sine.easeIn',
    onUpdate: () => {
      const to = getTarget();
      const t = progress.t;
      item.x = Phaser.Math.Linear(fromX, to.x, t);
      item.y = Phaser.Math.Linear(fromY, to.y, t) - Math.sin(Math.PI * t) * arcHeight;
      item.rotation = t * Math.PI * 2;
    },
    onComplete: () => {
      item.destroy();
      onArrive?.();
    },
  });
}
