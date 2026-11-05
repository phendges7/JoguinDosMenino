import { CONFIG } from '../../config.js';

// Archery tower placeholder. It doesn't shoot yet: zombies come in a later
// milestone. `range` is stored so the combat system can use it.
export class Tower {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    const T = CONFIG.TOWER;
    this.range = T.RANGE;

    const s = T.SIZE;
    const c = s * 0.22; // crenellation size
    this.view = scene.add.container(x, y, [
      scene.add.ellipse(5, s * 0.45, s * 1.2, s * 0.5, 0x000000, 0.2),
      scene.add.rectangle(0, 0, s, s, T.BASE_COLOR).setStrokeStyle(2, 0x5f5f5f),
      scene.add.rectangle(-s / 2 + c / 2, -s / 2 + c / 2, c, c, 0xa5a5a5),
      scene.add.rectangle(s / 2 - c / 2, -s / 2 + c / 2, c, c, 0xa5a5a5),
      scene.add.rectangle(-s / 2 + c / 2, s / 2 - c / 2, c, c, 0xa5a5a5),
      scene.add.rectangle(s / 2 - c / 2, s / 2 - c / 2, c, c, 0xa5a5a5),
      scene.add.rectangle(0, 0, s * 0.55, s * 0.55, T.TOP_COLOR).setStrokeStyle(2, 0x5a3a1e),
      scene.add.circle(0, 0, s * 0.16, T.ARCHER_COLOR).setStrokeStyle(2, 0x1f4f99),
    ]).setDepth(y);

    this.view.setScale(0);
    scene.tweens.add({ targets: this.view, scale: 1, duration: 450, ease: 'Back.easeOut' });

    // Show the range once so the player sees what the tower will cover.
    const ring = scene.add.circle(x, y, this.range).setStrokeStyle(3, 0xffffff, 0.6).setDepth(-400);
    scene.tweens.add({
      targets: ring,
      alpha: 0,
      delay: 900,
      duration: 1200,
      onComplete: () => ring.destroy(),
    });
  }
}
