import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';
import { panel } from './style.js';

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Shown when the base falls: time survived, zombies killed, Restart button.
// Restart restarts GameScene, which relaunches the UI scene.
export class GameOverScreen {
  constructor(scene, combat) {
    this.scene = scene;
    this.container = null;
    const onGameOver = (stats) => {
      scene.time.delayedCall(CONFIG.HEALTH.GAME_OVER_DELAY * 0.6, () => this.show(stats));
    };
    combat.on('game-over', onGameOver);
    scene.events.once('shutdown', () => combat.off('game-over', onGameOver));
  }

  show({ time, kills }) {
    const s = this.scene;
    const text = (y, str, size, color = '#ffffff', bold = false) => s.add
      .text(0, y, str, {
        fontFamily: 'Arial', fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal',
        color, stroke: '#000000', strokeThickness: Math.round(size / 6),
      })
      .setOrigin(0.5);

    this.shade = s.add.rectangle(0, 0, 10, 10, 0x000000, 0.65).setOrigin(0).setInteractive(); // eats clicks
    const U = VISUALS.UI;
    const bg = panel(s, -210, -150, 420, 300, 16);
    this.panel = s.add.container(0, 0, [
      bg,
      text(-100, 'The base has fallen!', 34, '#ff8a80', true),
      text(-35, `Time survived: ${formatTime(time)}`, 22),
      text(0, `Zombies killed: ${kills}`, 22),
    ]);

    // Rounded button, redrawn on hover.
    const btnBg = s.add.graphics();
    const drawBtn = (fill) => {
      btnBg.clear();
      btnBg.fillStyle(0x000000, 0.3).fillRoundedRect(-100 + 2, -28 + 4, 200, 56, 14);
      btnBg.fillStyle(fill, 1).fillRoundedRect(-100, -28, 200, 56, 14);
      btnBg.lineStyle(3, U.BUTTON_BORDER, 1).strokeRoundedRect(-100, -28, 200, 56, 14);
      btnBg.fillStyle(0xffffff, 0.15).fillRoundedRect(-92, -24, 184, 20, 10);
    };
    drawBtn(U.BUTTON_COLOR);
    const btn = s.add.container(0, 85, [btnBg, text(0, 'Restart', 26, '#ffffff', true)]);
    btn.setSize(200, 56).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => drawBtn(U.BUTTON_HOVER));
    btn.on('pointerout', () => drawBtn(U.BUTTON_COLOR));
    btn.on('pointerdown', () => this.restart());
    this.panel.add(btn);
    s.input.keyboard.once('keydown-ENTER', () => this.restart());

    this.container = s.add.container(0, 0, [this.shade, this.panel]).setScrollFactor(0).setDepth(100);
    this.layout();
    this.container.setAlpha(0);
    this.panel.setScale(this.fit * 0.8);
    s.tweens.add({ targets: this.container, alpha: 1, duration: 300 });
    s.tweens.add({ targets: this.panel, scale: this.fit, duration: 350, ease: 'Back.easeOut' });
  }

  // Called by UIScene.layout() on resize. The panel shrinks to fit small screens.
  layout() {
    const { width, height } = this.scene.scale;
    this.fit = Math.min(1, (width - 24) / 430, (height - 24) / 310);
    if (!this.container) return;
    this.shade.setSize(width, height);
    this.shade.input?.hitArea.setSize(width, height);
    this.panel.setPosition(width / 2, height / 2);
    if (!this.scene.tweens.isTweening(this.panel)) this.panel.setScale(this.fit);
  }

  restart() {
    if (this.restarting) return;
    this.restarting = true;
    // Stops this UI scene and restarts GameScene (which relaunches the UI).
    this.scene.scene.start('GameScene');
  }
}
