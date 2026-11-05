import { CONFIG } from '../../config.js';
import { VISUALS } from '../../visuals.js';
import { softShadow } from '../../effects/textures.js';
import { darken } from '../../effects/flyItem.js';

// A worker hut (lumberjack or miner). Tracks its level and its worker slots;
// WorkerManager does the actual workers.
// Slots: up to HUT.MAX_WORKERS. A slot is empty, filled, or "lost" (its worker
// died), and a lost slot can be refilled at a reduced rehire cost.
export class Hut {
  constructor(scene, type, x, y, stockpile) {
    this.scene = scene;
    this.type = type;
    this.def = CONFIG.HUTS[type];
    this.x = x;
    this.y = y;
    this.stockpile = stockpile;
    this.level = 1;
    this.slots = Array.from({ length: CONFIG.HUT.MAX_WORKERS }, () => ({ worker: null, everHired: false }));

    this.buildView();
    this.applyLevelLook();
    scene.fx.popIn(this.view, { dust: { x, y: y + CONFIG.HUT.SIZE * 0.4 } });
    scene.fx.popIn(stockpile.view);
  }

  get stats() { return CONFIG.HUT.LEVELS[this.level - 1]; }
  get maxLevel() { return CONFIG.HUT.LEVELS.length; }
  get workers() { return this.slots.map((s) => s.worker).filter(Boolean); }
  // Where workers stand when they come home.
  get door() { return { x: this.x, y: this.y + CONFIG.HUT.SIZE * 0.5 }; }

  buildView() {
    const s = this.scene;
    const size = CONFIG.HUT.SIZE;
    const wall = this.def.WALL_COLOR;
    this.roof = s.add.triangle(0, -size * 0.32, 0, size * 0.42, size * 0.6, 0, size * 1.2, size * 0.42, 0xffffff);
    this.pips = s.add.container(0, -size * 0.36);
    this.body = s.add.container(0, 0, [
      s.add.rectangle(0, size * 0.12, size, size * 0.62, wall).setStrokeStyle(2, darken(wall)),
      s.add.rectangle(0, size * 0.25, size * 0.24, size * 0.36, 0x4e342e).setStrokeStyle(1, 0x2e1d0e), // door
      this.roof,
      this.makeSign(size * 0.3, size * 0.1),
      this.pips,
    ]);
    this.view = s.add.container(this.x, this.y, [
      softShadow(s, 5, size * 0.45, size * 1.6, size * 0.5, VISUALS.SHADOW.BUILDING_ALPHA),
      this.body,
    ]).setDepth(this.y + size * 0.4);
  }

  // Small axe or pickaxe on the wall, in the tool's colours.
  makeSign(x, y) {
    const t = CONFIG.TOOLS[this.def.SIGN];
    const g = this.scene.add.graphics();
    g.lineStyle(3, t.HANDLE_COLOR, 1).lineBetween(-6, 7, 6, -7);
    g.fillStyle(t.HEAD_COLOR, 1);
    if (this.def.SIGN === 'axe') g.fillTriangle(2, -8, 9, -9, 7, -1);
    else g.fillTriangle(-2, -10, 12, -4, 4, -6);
    return g.setPosition(x, y);
  }

  applyLevelLook() {
    const L = this.stats;
    this.roof.setFillStyle(L.ROOF_COLOR).setStrokeStyle(2, darken(L.ROOF_COLOR));
    this.body.setScale(L.SCALE);
    this.pips.removeAll(true);
    for (let i = 0; i < this.level; i++) {
      const px = (i - (this.level - 1) / 2) * 7;
      this.pips.add(this.scene.add.rectangle(px, 0, 5, 5, CONFIG.HUT.PIP_COLOR).setStrokeStyle(1, 0x5a3a1e));
    }
  }

  upgrade() {
    if (this.level >= this.maxLevel) return false;
    this.level++;
    this.applyLevelLook();
    this.scene.tweens.killTweensOf(this.view);
    this.view.setScale(1.25);
    this.scene.tweens.add({ targets: this.view, scale: 1, duration: 350, ease: 'Back.easeOut' });
    return true;
  }

  // Slot the next hire fills: a lost worker first (cheaper), then a new one.
  nextSlotIndex() {
    const lost = this.slots.findIndex((s) => !s.worker && s.everHired);
    if (lost >= 0) return lost;
    return this.slots.findIndex((s) => !s.worker);
  }

  // What the hire pad should offer now: { cost, label } or null when full.
  hireOffer() {
    const i = this.nextSlotIndex();
    if (i < 0) return null;
    const base = CONFIG.HUT.HIRE_COSTS[i];
    if (this.slots[i].everHired) {
      const cost = {};
      for (const [type, n] of Object.entries(base)) cost[type] = Math.max(1, Math.ceil(n * CONFIG.HUT.REHIRE_COST_FACTOR));
      return { cost, label: 'Rehire Worker' };
    }
    return { cost: base, label: `Hire Worker ${i + 1}/${this.slots.length}` };
  }

  fillSlot(worker) {
    const i = this.nextSlotIndex();
    if (i < 0) return false;
    this.slots[i].worker = worker;
    this.slots[i].everHired = true;
    return true;
  }

  freeSlot(worker) {
    const slot = this.slots.find((s) => s.worker === worker);
    if (slot) slot.worker = null;
  }
}
