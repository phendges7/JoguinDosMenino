import { CONFIG } from '../config.js';
import { TargetMarker } from '../effects/TargetMarker.js';

// The bow in the player's hands. Hidden between shots: it pops up pointing at
// the target when an arrow is fired, keeps tracking the target, then fades.
// Also owns the ring drawn under the current target.
export class BowView {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    const B = CONFIG.BOW;

    const g = scene.add.graphics();
    // Limb bulges towards +x (the target); string sits nearer the archer.
    const cx = 8;
    const r = 12;
    const spread = 1.1;
    const tipX = cx + Math.cos(spread) * r;
    const tipY = Math.sin(spread) * r;
    g.lineStyle(1.5, B.STRING_COLOR, 0.9).lineBetween(tipX, -tipY, tipX, tipY);
    g.lineStyle(3.5, B.COLOR, 1).beginPath().arc(cx, 0, r, -spread, spread).strokePath();

    this.container = scene.add.container(0, -10, [g]).setVisible(false);
    player.view.add(this.container);
    this.marker = new TargetMarker(scene, B.MARKER_COLOR);
  }

  onFire(angle) {
    const c = this.container;
    this.scene.tweens.killTweensOf(c);
    c.setVisible(true).setAlpha(1).setRotation(angle).setScale(0.8);
    this.scene.tweens.add({ targets: c, scale: 1, duration: 90, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: c,
      alpha: 0,
      delay: CONFIG.BOW.SHOW_DURATION * 0.5,
      duration: CONFIG.BOW.SHOW_DURATION * 0.5,
      onComplete: () => c.setVisible(false),
    });
  }

  update(target) {
    if (target && this.container.visible) {
      this.container.rotation = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    }
    this.marker.update(target);
  }
}
