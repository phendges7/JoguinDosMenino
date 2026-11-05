import { CONFIG } from '../config.js';

// Resource counters with icons, fixed to the screen. Reads from the Inventory.
export class HUD {
  constructor(scene, inventory) {
    this.scene = scene;
    this.inventory = inventory;
    const H = CONFIG.HUD;
    const types = Object.keys(CONFIG.RESOURCES);

    this.container = scene.add.container(H.X, H.Y).setScrollFactor(0);
    const panelHeight = types.length * H.ROW_HEIGHT + 12;
    const panel = scene.add.rectangle(0, 0, 160, panelHeight, 0x000000, H.PANEL_ALPHA).setOrigin(0);
    this.container.add(panel);

    this.rows = {};
    types.forEach((type, i) => {
      const res = CONFIG.RESOURCES[type];
      const cy = 6 + i * H.ROW_HEIGHT + H.ROW_HEIGHT / 2;
      const icon = scene.add
        .rectangle(12 + H.ICON_SIZE / 2, cy, H.ICON_SIZE, H.ICON_SIZE * 0.7, res.color)
        .setStrokeStyle(2, 0x000000, 0.5);
      const text = scene.add
        .text(12 + H.ICON_SIZE + 10, cy, '', {
          fontFamily: 'Arial', fontSize: `${H.FONT_SIZE}px`,
          color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        })
        .setOrigin(0, 0.5);
      this.container.add([icon, text]);
      this.rows[type] = { icon, text, label: res.label };
      this.setCount(type, inventory.get(type), false);
    });

    inventory.on('changed', this.onChanged, this);
    scene.events.once('shutdown', () => inventory.off('changed', this.onChanged, this));
  }

  onChanged(type, total) {
    this.setCount(type, total, true);
  }

  setCount(type, total, animate) {
    const row = this.rows[type];
    if (!row) return;
    row.text.setText(`${row.label}: ${total}`);
    if (animate) {
      this.scene.tweens.killTweensOf(row.icon);
      row.icon.setScale(1.4);
      this.scene.tweens.add({ targets: row.icon, scale: 1, duration: 180, ease: 'Back.easeOut' });
    }
  }
}
