import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';
import { panel, icon, textStyle, bump } from './style.js';

// Resource counters with icons, fixed to the screen. Reads from the Inventory.
export class HUD {
  constructor(scene, inventory) {
    this.scene = scene;
    this.inventory = inventory;
    const H = CONFIG.HUD;
    const U = VISUALS.UI;
    const types = Object.keys(CONFIG.RESOURCES);

    this.container = scene.add.container(H.X, H.Y).setScrollFactor(0);
    const panelHeight = types.length * H.ROW_HEIGHT + 12;
    this.container.add(panel(scene, 0, 0, H.PANEL_WIDTH, panelHeight));

    this.rows = {};
    types.forEach((type, i) => {
      const cy = 6 + i * H.ROW_HEIGHT + H.ROW_HEIGHT / 2;
      const img = icon(scene, 14 + U.ICON_SIZE / 2, cy, `icon-${type}`);
      const text = scene.add
        .text(14 + U.ICON_SIZE + 12, cy, '', textStyle(H.FONT_SIZE, { fontStyle: 'bold' }))
        .setOrigin(0, 0.5);
      const label = scene.add
        .text(H.PANEL_WIDTH - 12, cy, CONFIG.RESOURCES[type].label, textStyle(12, { color: '#c5d9b5', strokeThickness: 3 }))
        .setOrigin(1, 0.5);
      this.container.add([img, label, text]);
      this.rows[type] = { icon: img, text };
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
    row.text.setText(`${total}`);
    if (animate) bump(this.scene, row.text, row.icon);
  }
}
