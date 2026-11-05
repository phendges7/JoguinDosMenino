import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { HUD } from '../ui/HUD.js';
import { StatusBars } from '../ui/StatusBars.js';
import { RespawnBanner } from '../ui/RespawnBanner.js';
import { GameOverScreen } from '../ui/GameOverScreen.js';
import { ensureTextures } from '../effects/textures.js';

// Runs on top of GameScene so the HUD is unaffected by camera movement.
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    // Vignette over the world, under the HUD (this scene draws above GameScene).
    ensureTextures(this);
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(-100);
    this.hud = new HUD(this, this.registry.get('inventory'));
    const combat = this.registry.get('combat');
    this.status = new StatusBars(this, combat);
    this.respawnBanner = new RespawnBanner(this, combat);
    this.gameOver = new GameOverScreen(this, combat);

    this.hint = this.add
      .text(0, 0, 'WASD / arrows to move. Leave through the gate to gather. Stand on a build pad to spend.\nYour bow shoots zombies by itself; heal inside the base.'
        + (CONFIG.DEBUG.ENABLED ? `\nDebug: ${CONFIG.DEBUG.GIVE_KEY} = free resources, ${CONFIG.DEBUG.SPAWN_KEY} = zombies at the portal, ${CONFIG.DEBUG.SPAWN_NEAR_KEY} = zombies near a worker` : ''), {
        fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5, 1);
    this.placeHint();
    this.scale.on('resize', this.placeHint, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.placeHint, this));
    this.time.delayedCall(8000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 1000 }));
  }

  placeHint() {
    this.hint.setPosition(this.scale.width / 2, this.scale.height - 16);
    this.vignette.setDisplaySize(this.scale.width, this.scale.height);
  }
}
