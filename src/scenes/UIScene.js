import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';
import { HUD } from '../ui/HUD.js';
import { StatusBars } from '../ui/StatusBars.js';
import { RespawnBanner } from '../ui/RespawnBanner.js';
import { GameOverScreen } from '../ui/GameOverScreen.js';
import { TouchJoystick } from '../ui/TouchJoystick.js';
import { ensureTextures } from '../effects/textures.js';
import { drawPanel, textStyle } from '../ui/style.js';
import { safeArea, isTouchDevice, uiScale } from '../ui/screen.js';

// Runs on top of GameScene so the HUD is unaffected by camera movement.
// Owns the HUD layout: everything is placed (and scaled for small screens)
// in layout(), which re-runs on every resize / rotation.
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.touch = isTouchDevice();
    this.uiScale = uiScale(this.scale.width, this.scale.height);

    // Vignette over the world, under the HUD (this scene draws above GameScene).
    ensureTextures(this);
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(-100);

    this.hud = new HUD(this, this.registry.get('inventory'));
    const combat = this.registry.get('combat');
    this.status = new StatusBars(this, combat);
    this.respawnBanner = new RespawnBanner(this, combat);
    this.gameOver = new GameOverScreen(this, combat);
    this.joystick = new TouchJoystick(this, this.registry.get('moveInput'));
    this.debugButtons = this.makeDebugButtons(this.registry.get('debugActions'));

    this.hint = this.add
      .text(0, 0, this.hintText(), textStyle(16, { strokeThickness: 3, align: 'center' }))
      .setOrigin(0.5, 1);
    this.time.delayedCall(8000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 1000 }));

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  hintText() {
    const D = CONFIG.DEBUG;
    if (this.touch) {
      return 'Touch and drag anywhere to move.\nGathering, shooting and building happen on their own; heal inside the base.'
        + (D.ENABLED ? '\nDebug buttons are on the right.' : '');
    }
    return 'WASD / arrows (or drag with the mouse) to move. Leave through the gate to gather. Stand on a build pad to spend.\nYour bow shoots zombies by itself; heal inside the base.'
      + (D.ENABLED ? `\nDebug: ${D.GIVE_KEY} = free resources, ${D.SPAWN_KEY} = zombies at the portal, ${D.SPAWN_NEAR_KEY} = zombies near a worker` : '');
  }

  // On touch screens the debug keys become small buttons (keyboard still works).
  makeDebugButtons(actions) {
    if (!actions || !this.touch) return [];
    const size = VISUALS.MOBILE.DEBUG_BUTTON_SIZE;
    const defs = [
      ['+RES', actions.give],
      ['ZOMB', actions.spawnAtPortal],
      ['NEAR', actions.spawnNear],
    ];
    return defs.map(([label, fn]) => {
      const bg = drawPanel(this.add.graphics(), -size / 2, -size / 2, size, size, 10);
      const text = this.add.text(0, 0, label, textStyle(12, { fontStyle: 'bold', color: '#80deea' })).setOrigin(0.5);
      const btn = this.add.container(0, 0, [bg, text]).setSize(size, size).setInteractive();
      btn.on('pointerdown', () => {
        fn();
        this.tweens.killTweensOf(btn);
        btn.setScale(btn.baseScale * 0.85);
        this.tweens.add({ targets: btn, scale: btn.baseScale, duration: 150, ease: 'Back.easeOut' });
      });
      return btn;
    });
  }

  // Place and scale everything for the current screen.
  layout() {
    const { width, height } = this.scale;
    const M = VISUALS.MOBILE;
    const H = CONFIG.HUD;
    const safe = safeArea();
    const k = (this.uiScale = uiScale(width, height));
    const m = M.HUD_MARGIN;
    const left = safe.left + m;
    const top = safe.top + m;
    const right = width - safe.right - m;
    // Narrow (portrait phone): the base bar gets its own row, panels go under it.
    const narrow = width < M.NARROW_WIDTH;
    const belowBase = top + (this.status.basePanelHeight + 10) * k;

    this.status.basePanel.setScale(k).setPosition(width / 2, top);
    const panelsTop = narrow ? belowBase : top;
    this.hud.container.setScale(k).setPosition(left, panelsTop);
    const resourceHeight = Object.keys(CONFIG.RESOURCES).length * H.ROW_HEIGHT + 12;
    this.status.panel.setScale(k).setPosition(left, panelsTop + (resourceHeight + H.PANEL_GAP) * k);

    const size = M.DEBUG_BUTTON_SIZE;
    this.debugButtons.forEach((btn, i) => {
      btn.baseScale = k;
      btn.setScale(k).setPosition(right - (size / 2) * k, (narrow ? belowBase : top) + (size / 2 + i * (size + 8)) * k);
    });

    this.hint
      .setScale(k)
      .setWordWrapWidth((width - 32) / k)
      .setPosition(width / 2, height - safe.bottom - 12);
    this.vignette.setDisplaySize(width, height);
    this.respawnBanner.place();
    this.gameOver.layout();
  }
}
