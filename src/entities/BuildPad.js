import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';

// A square on the ground that collects resources. When fully paid it reports
// ready, and BuildManager decides what gets built.
// States: 'locked' (hidden) -> 'open' -> 'done'.
// A pad can be reopened with a new cost and label (tower upgrades, rebuilds)
// and closed again (hidden without building).
export class BuildPad {
  constructor(scene, def, x, y) {
    this.scene = scene;
    this.def = def;
    this.id = def.id;
    this.x = x;
    this.y = y;
    this.size = CONFIG.BUILD.PAD_SIZE;
    this.state = 'locked';
    this.label = def.label;
    this.generation = 0; // bumps on reopen so items still flying to an old cost are ignored
    this.setCost(def.cost ?? {});

    this.buildView();
    this.container.setVisible(false);
  }

  setCost(cost) {
    this.cost = { ...cost };
    this.paid = {};      // reserved: removed from the inventory, maybe still flying
    this.received = {};  // landed on the pad
    this.inFlight = 0;
    for (const type of Object.keys(this.cost)) {
      this.paid[type] = 0;
      this.received[type] = 0;
    }
    this.totalCost = Object.values(this.cost).reduce((a, b) => a + b, 0);
  }

  buildView() {
    const P = CONFIG.BUILD;
    const s = this.size;
    this.container = this.scene.add.container(this.x, this.y).setDepth(-500);

    // Glow that pulses while the player stands on the pad and pays.
    const G = VISUALS.PAD_PULSE;
    this.glow = this.scene.add.rectangle(0, 0, s + 10, s + 10, G.GLOW_COLOR, 0)
      .setStrokeStyle(4, G.GLOW_COLOR, 1)
      .setAlpha(0);
    this.bg = this.scene.add.rectangle(0, 0, s, s, P.PAD_COLOR, P.PAD_ALPHA).setStrokeStyle(3, P.PAD_BORDER);
    // Full-size rectangle anchored at the bottom; progress is shown by scaleY.
    this.fill = this.scene.add
      .rectangle(0, s / 2, s, s, P.PROGRESS_COLOR, P.PROGRESS_ALPHA)
      .setOrigin(0.5, 1)
      .setScale(1, 0);
    this.title = this.scene.add
      .text(0, -s / 2 - 5, this.label, {
        fontFamily: 'Arial', fontSize: `${VISUALS.UI.PAD_TITLE_SIZE}px`, fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        align: 'center', wordWrap: { width: s + 14 },
      })
      .setOrigin(0.5, 1);
    this.container.add([this.glow, this.bg, this.fill, this.title]);

    // One row per resource: resource icon + amount still needed.
    this.rows = {};
    const types = Object.keys(this.cost);
    const rowH = 24;
    const iconSize = VISUALS.UI.PAD_ICON_SIZE;
    types.forEach((type, i) => {
      const y = (i - (types.length - 1) / 2) * rowH;
      const icon = this.scene.add.image(-14, y, `icon-${type}`);
      icon.setScale(iconSize / icon.height);
      icon.baseScale = icon.scale;
      const text = this.scene.add
        .text(0, y, '', {
          fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold',
          color: '#ffffff', stroke: '#000000', strokeThickness: 4,
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
    this.fill.scaleY = this.totalCost > 0 ? got / this.totalCost : 0;
  }

  unlock() {
    if (this.state !== 'locked') return;
    this.state = 'open';
    this.container.setVisible(true).setAlpha(1);
    this.scene.fx.popIn(this.container);
  }

  // Show the pad again (or for the first time) with a new cost and label.
  reopen({ cost, label }) {
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy();
    this.generation++;
    this.label = label ?? this.label;
    this.setCost(cost);
    this.buildView();
    this.container.setVisible(false);
    this.state = 'locked';
    this.unlock();
  }

  // Hide without building (e.g. its tower was destroyed). Anything already
  // paid into it is lost.
  close() {
    if (this.state === 'locked') return;
    this.state = 'locked';
    this.generation++;
    this.setHighlight(false);
    const c = this.container;
    this.scene.tweens.killTweensOf(c);
    this.scene.tweens.add({
      targets: c, scale: 0, alpha: 0, duration: 200, ease: 'Quad.easeIn', onComplete: () => c.setVisible(false),
    });
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

  // An item has left the backpack heading here. Returns a token for receive().
  reserve(type) {
    this.paid[type]++;
    this.inFlight++;
    return this.generation;
  }

  // An item has landed.
  receive(type, generation = this.generation) {
    if (generation !== this.generation) return; // pad was reset while it flew
    this.received[type]++;
    this.inFlight--;
    this.refresh();
    const row = this.rows[type];
    this.scene.tweens.killTweensOf([row.icon, row.text]);
    row.icon.setScale(row.icon.baseScale * 1.4);
    row.text.setScale(1.25);
    this.scene.tweens.add({ targets: row.icon, scale: row.icon.baseScale, duration: 150, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: row.text, scale: 1, duration: 150, ease: 'Back.easeOut' });
  }

  // Standing on the pad: brighter border and a gentle pulsing glow.
  setHighlight(on) {
    const P = CONFIG.BUILD;
    const G = VISUALS.PAD_PULSE;
    this.bg.setStrokeStyle(on ? 4 : 3, on ? P.PAD_BORDER_ACTIVE : P.PAD_BORDER);
    this.scene.tweens.killTweensOf(this.glow);
    if (on && this.state === 'open') {
      this.glow.setAlpha(G.GLOW_ALPHA).setScale(1);
      this.scene.tweens.add({
        targets: this.glow,
        scale: G.SCALE,
        alpha: G.GLOW_ALPHA * 0.3,
        duration: G.DURATION,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.glow.setAlpha(0);
    }
  }

  complete() {
    this.state = 'done';
    this.setHighlight(false);
    const c = this.container; // reopen() may replace this.container before the tween ends
    this.scene.tweens.add({
      targets: c,
      scale: 0,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeIn',
      onComplete: () => c.setVisible(false),
    });
  }
}
