import Phaser from 'phaser';
import { HUD } from '../ui/HUD.js';

// Runs on top of GameScene so the HUD is unaffected by camera movement.
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.hud = new HUD(this, this.registry.get('inventory'));

    this.hint = this.add
      .text(0, 0, 'WASD / arrows to move. Leave through the gate to gather. Stand on a build pad to spend.', {
        fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
    this.placeHint();
    this.scale.on('resize', this.placeHint, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.placeHint, this));
    this.time.delayedCall(8000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 1000 }));
  }

  placeHint() {
    this.hint.setPosition(this.scale.width / 2, this.scale.height - 16);
  }
}
