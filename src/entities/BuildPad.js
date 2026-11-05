import { CONFIG } from '../config.js';
import { darken } from '../effects/flyItem.js';

// A square on the ground that collects resources. When fully paid it reports
// ready, and BuildManager decides what gets built.
// States: 'locked' (hidden) -> 'open' -> 'done'.
export class BuildPad {
  constructor(scene, def, x, y) {
    this.scene = scene;
    this.def = def;
    this.id = def.id;
    this.x = x;
    this.y = y;
    this.size = CONFIG.BUILD.PAD_SIZE;
    this.state = 'locked';
    this.cost = { ...def.cost };
    this.paid = {};      // reserved: removed from the inventory, maybe still flying
    this.received = {};  // landed on the pad
    this.inFlight = 0;
    for (const type of Object.keys(this.cost)) {
      this.paid[type] = 0;
      this.received[type] = 0;
    }
    this.totalCost = Object.values(this.cost).reduce((a, b) => a + b, 0);

    this.buildView();
    this.container.setVisible(false);
  }

  buildView() {
    const P = CONFIG.BUILD;
    const s = this.size;
    this.container = this.scene.add.container(this.x, this.y).setDepth(-500);

    this.bg = this.scene.add.rectangle(0, 0, s, s, P.PAD_COLOR, P.PAD_ALPHA).setStrokeStyle(3, P.PAD_BORDER);
    // Full-size rectangle anchored at the bottom; progress is shown by scaleY.
    this.fill = this.scene.add
      .rectangle(0, s / 2, s, s, P.PROGRESS_COLOR, P.PROGRESS_ALPHA)
      .setOrigin(0.5, 1)
      .setScale(1, 0);
    this.title = this.scene.add
      .text(0, -s / 2 - 6, this.def.label, {
        fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
    this.container.add([this.bg, this.fill, this.title]);

    // One row per resource: icon + amount still needed.
    this.rows = {};
    const types = Object.keys(this.cost);
    const rowH = 22;
    types.forEach((type, i) => {
      const y = (i - (types.length - 1) / 2) * rowH;
      const color = CONFIG.RESOURCES[type].color;
      const icon = this.scene.add.rectangle(-16, y, 16, 11, color).setStrokeStyle(1, darken(color));
      const text = this.scene.add
        .text(-4, y, '', {
          fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold',
          color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        })
        .setOrigin(0, 0.5);
      this.container.add([icon, text]);
      this.rows[type] = { icon, text };
    });
    this.refresh();
  }

  refresh() {
    for (const [type, row] of Object.entries(this.rows)) {
      const left = this.cost[type] - this.received[type];
      row.text.setText(left > 0 ? `${left}` : '✓');
      row.icon.setAlpha(left > 0 ? 1 : 0.4);
    }
    const got = Object.values(this.received).reduce((a, b) => a + b, 0);
    this.fill.scaleY = got / this.totalCost;
  }

  unlock() {
    if (this.state !== 'locked') return;
    this.state = 'open';
    this.container.setVisible(true).setScale(0);
    this.scene.tweens.add({ targets: this.container, scale: 1, duration: 400, ease: 'Back.easeOut' });
  }

  contains(x, y) {
    const h = this.size / 2;
    return x >= this.x - h && x <= this.x + h && y >= this.y - h && y <= this.y + h;
  }

  needs(type) {
    return this.state === 'open' && (this.paid[type] ?? Infinity) < (this.cost[type] ?? 0);
  }

  isFullyPaid() {
    return Object.keys(this.cost).every((t) => this.paid[t] >= this.cost[t]);
  }

  get readyToComplete() {
    return this.state === 'open' && this.isFullyPaid() && this.inFlight === 0;
  }

  // An item has left the backpack heading here.
  reserve(type) {
    this.paid[type]++;
    this.inFlight++;
  }

  // An item has landed.
  receive(type) {
    this.received[type]++;
    this.inFlight--;
    this.refresh();
    const row = this.rows[type];
    this.scene.tweens.killTweensOf(row.icon);
    row.icon.setScale(1.4);
    this.scene.tweens.add({ targets: row.icon, scale: 1, duration: 150, ease: 'Back.easeOut' });
  }

  setHighlight(on) {
    const P = CONFIG.BUILD;
    this.bg.setStrokeStyle(on ? 4 : 3, on ? P.PAD_BORDER_ACTIVE : P.PAD_BORDER);
  }

  complete() {
    this.state = 'done';
    this.scene.tweens.add({
      targets: this.container,
      scale: 0,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeIn',
      onComplete: () => this.container.destroy(),
    });
  }
}
