import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';

export function darken(color, amount = 35) {
  return Phaser.Display.Color.IntegerToColor(color).darken(amount).color;
}

// A resource block that arcs from a point to a (possibly moving) target along
// a curved path: up by `arcHeight` and bent a little sideways, growing
// mid-flight and spinning. getTarget() is re-read every frame so it can chase
// the player.
export function flyItem(scene, { fromX, fromY, getTarget, type, duration, arcHeight, onArrive }) {
  const B = CONFIG.BACKPACK;
  const F = VISUALS.FLY;
  const color = CONFIG.RESOURCES[type].color;
  const item = scene.add
    .rectangle(fromX, fromY, B.BLOCK_WIDTH + 2, B.BLOCK_HEIGHT + 2, color)
    .setStrokeStyle(1, darken(color))
    .setDepth(1e6);
  const side = (Math.random() < 0.5 ? -1 : 1) * F.SIDE_CURVE;
  const spin = (Math.random() < 0.5 ? -1 : 1) * F.SPIN * Math.PI * 2;
  const progress = { t: 0 };
  scene.tweens.add({
    targets: progress,
    t: 1,
    duration,
    ease: 'Sine.easeInOut',
    onUpdate: () => {
      const to = getTarget();
      const t = progress.t;
      // Quadratic Bezier: control point above the midpoint, pushed sideways.
      // The curve peaks halfway to its control point, hence the 2x.
      const dx = to.x - fromX;
      const dy = to.y - fromY;
      const cx = (fromX + to.x) / 2 - dy * side * 2;
      const cy = Math.min(fromY, to.y) - arcHeight * 2 + dx * side * 0.6;
      const u = 1 - t;
      item.x = u * u * fromX + 2 * u * t * cx + t * t * to.x;
      item.y = u * u * fromY + 2 * u * t * cy + t * t * to.y;
      item.rotation = t * spin;
      item.setScale(1 + (F.MID_SCALE - 1) * Math.sin(Math.PI * t));
    },
    onComplete: () => {
      item.destroy();
      onArrive?.();
    },
  });
}
