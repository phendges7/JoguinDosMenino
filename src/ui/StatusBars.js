import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';
import { panel, icon, textStyle, bump } from './style.js';

// A rounded horizontal health bar with a trailing "just lost" chunk and a value label.
class Bar {
  constructor(scene, x, y, width, height, color) {
    this.scene = scene;
    const r = VISUALS.UI.BAR_RADIUS;
    const inset = 2;
    this.width = width - inset * 2;
    this.container = scene.add.container(x, y);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.55).fillRoundedRect(0, -height / 2, width, height, r);
    bg.lineStyle(1, 0x000000, 0.6).strokeRoundedRect(0, -height / 2, width, height, r);
    const ih = height - inset * 2;
    this.lag = scene.add.rectangle(inset, 0, this.width, ih, CONFIG.HUD.BAR_LAG_COLOR).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(inset, 0, this.width, ih, color).setOrigin(0, 0.5);
    this.shine = scene.add.rectangle(inset, -ih / 4, this.width, ih / 2, 0xffffff, 0.18).setOrigin(0, 0.5);
    this.flash = scene.add.rectangle(inset, 0, this.width, ih, 0xffffff).setOrigin(0, 0.5).setAlpha(0);
    this.label = scene.add
      .text(width / 2, 0, '', textStyle(Math.max(11, height - 3), { fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.container.add([bg, this.lag, this.fill, this.shine, this.flash, this.label]);
  }

  set(current, max, hurt = false) {
    const w = this.width * Math.max(0, current / max);
    this.fill.width = w;
    this.shine.width = w;
    this.label.setText(`${Math.ceil(current)} / ${max}`);
    if (hurt) {
      this.scene.tweens.killTweensOf([this.lag, this.flash]);
      this.flash.setAlpha(0.7);
      this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 180 });
      this.scene.tweens.add({ targets: this.lag, width: w, delay: 300, duration: 400, ease: 'Quad.easeOut' });
    } else if (this.lag.width < w) {
      this.lag.width = w; // healing: no trailing chunk
    }
  }
}

// Player HP + kill counter (under the resource panel) and the base HP bar
// (top centre, clearly labelled). Reads from Combat.
export class StatusBars {
  constructor(scene, combat) {
    this.scene = scene;
    this.combat = combat;
    const H = CONFIG.HUD;
    const U = VISUALS.UI;

    // --- player panel, under the resource panel ---
    const resourcePanelHeight = Object.keys(CONFIG.RESOURCES).length * H.ROW_HEIGHT + 12;
    const y = H.Y + resourcePanelHeight + H.PANEL_GAP;
    this.panel = scene.add.container(H.X, y).setScrollFactor(0);
    this.panelHeight = 2 * H.ROW_HEIGHT + 12;
    this.panel.add(panel(scene, 0, 0, H.PANEL_WIDTH, this.panelHeight));

    const row1 = 6 + H.ROW_HEIGHT / 2;
    const row2 = row1 + H.ROW_HEIGHT;
    const iconX = 14 + U.ICON_SIZE / 2;
    const textX = 14 + U.ICON_SIZE + 12;
    this.panel.add(icon(scene, iconX, row1, 'icon-heart'));
    this.playerBar = new Bar(scene, textX, row1, H.PANEL_WIDTH - textX - 10, 18, H.PLAYER_BAR_COLOR);
    this.panel.add(this.playerBar.container);

    this.skull = icon(scene, iconX, row2, 'icon-skull');
    this.killText = scene.add.text(textX, row2, '', textStyle(H.FONT_SIZE, { fontStyle: 'bold' })).setOrigin(0, 0.5);
    const killLabel = scene.add
      .text(H.PANEL_WIDTH - 12, row2, 'Kills', textStyle(12, { color: '#c5d9b5', strokeThickness: 3 }))
      .setOrigin(1, 0.5);
    this.panel.add([this.skull, killLabel, this.killText]);

    // --- base bar, top centre ---
    const bw = H.BASE_BAR_WIDTH;
    this.basePanel = scene.add.container(0, H.Y).setScrollFactor(0);
    const title = scene.add
      .text(0, 0, 'BASE', textStyle(18, { fontStyle: 'bold', color: '#dcedc8' }))
      .setOrigin(0, 0.5);
    const panelW = title.width + 14 + bw + 24;
    title.setPosition(-panelW / 2 + 12, 21);
    this.baseBar = new Bar(scene, title.x + title.width + 14, 21, bw, 20, H.BASE_BAR_COLOR);
    this.warning = scene.add
      .text(0, 50, 'Base under attack!', textStyle(15, { fontStyle: 'bold', color: '#ff8a80' }))
      .setOrigin(0.5, 0)
      .setAlpha(0);
    this.basePanelHeight = 42;
    this.basePanelWidth = panelW;
    this.basePanel.add([panel(scene, -panelW / 2, 0, panelW, 42), title, this.baseBar.container, this.warning]);
    this.basePanel.setX(scene.scale.width / 2); // UIScene.layout() places both panels

    // --- wiring ---
    const ph = combat.playerHealth;
    const bh = combat.baseHealth;
    this.playerBar.set(ph.current, ph.max);
    this.baseBar.set(bh.current, bh.max);
    this.setKills(combat.kills, false);

    this.listeners = [
      [ph, 'changed', (c, m) => this.playerBar.set(c, m)],
      [ph, 'damaged', () => this.playerBar.set(ph.current, ph.max, true)],
      [bh, 'changed', (c, m) => this.baseBar.set(c, m)],
      [bh, 'damaged', () => { this.baseBar.set(bh.current, bh.max, true); this.showWarning(); }],
      [combat, 'kills-changed', (k) => this.setKills(k, true)],
    ];
    this.listeners.forEach(([emitter, event, fn]) => emitter.on(event, fn));
    scene.events.once('shutdown', () => {
      this.listeners.forEach(([emitter, event, fn]) => emitter.off(event, fn));
    });
  }

  setKills(kills, animate) {
    this.killText.setText(`${kills}`);
    if (animate) bump(this.scene, this.killText, this.skull);
  }

  // Blinks while the base keeps taking hits; fades out after the last one.
  showWarning() {
    const w = this.warning;
    this.scene.tweens.killTweensOf(w);
    if (w.alpha < 0.5) w.setAlpha(1);
    this.scene.tweens.add({
      targets: w,
      alpha: 0,
      delay: CONFIG.HUD.UNDER_ATTACK_TIME,
      duration: 400,
    });
  }
}
