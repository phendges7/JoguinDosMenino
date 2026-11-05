import { CONFIG } from '../config.js';
import { BuildPad } from '../entities/BuildPad.js';
import { flyItem } from '../effects/flyItem.js';
import { toast } from '../effects/toast.js';

const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// Owns build pads. While the player stands on an open pad, needed resources
// leave the backpack one at a time and fly onto it. A fully paid pad builds.
//
// Tower pads: building one places a tower (via TowerManager) and opens the
// tower's upgrade pad next to it. If the tower is destroyed, the upgrade pad
// closes and the tower pad reopens at a reduced rebuild cost.
// Hut pads: building one places a hut + stockpile (via WorkerManager) with one
// worker, then opens its hire pad (more workers / rehires) and upgrade pad.
// Unlocks: the first time a pad is built, every pad whose `unlockedBy`
// names it appears.
export class BuildManager {
  constructor(scene, { player, inventory, backpack, base, resources, road, towers, workers }) {
    this.scene = scene;
    this.player = player;
    this.inventory = inventory;
    this.backpack = backpack;
    this.base = base;
    this.resources = resources;
    this.road = road;
    this.towers = towers;
    this.workers = workers;

    this.pads = CONFIG.PADS.map((def) => {
      const pos = this.padPosition(def);
      return new BuildPad(scene, def, pos.x, pos.y);
    });
    // Every hut pad gets a hidden hire pad and upgrade pad at its configured spots.
    for (const pad of this.pads.filter((p) => p.def.building === 'hut')) {
      const d = pad.def;
      const at = (o) => [this.base.x + o.x, this.base.y + o.y];
      pad.hirePad = new BuildPad(scene, {
        id: `${d.id}:hire`, building: 'hire', label: 'Hire Worker', hutPadId: d.id,
      }, ...at(d.hirePad));
      pad.upgradePad = new BuildPad(scene, {
        id: `${d.id}:upgrade`, building: 'hutUpgrade', label: 'Upgrade', hutPadId: d.id,
      }, ...at(d.upgradePad));
      this.pads.push(pad.hirePad, pad.upgradePad);
    }
    // Every tower pad gets a hidden upgrade pad beside it.
    const taken = this.pads.map((p) => ({ x: p.x, y: p.y }));
    for (const pad of this.pads.filter((p) => p.def.building === 'tower')) {
      const pos = this.upgradePadPosition(pad.def, pad, taken);
      taken.push(pos);
      pad.upgradePad = new BuildPad(scene, {
        id: `${pad.id}:upgrade`, building: 'upgrade', label: 'Upgrade', towerPadId: pad.id,
      }, pos.x, pos.y);
      this.pads.push(pad.upgradePad);
    }
    // No trees or rocks on any pad.
    for (const p of this.pads) resources.reserveArea(p.x, p.y, CONFIG.BUILD.PAD_SIZE * 0.75);
    this.padsById = Object.fromEntries(this.pads.map((p) => [p.id, p]));
    this.pads.filter((p) => p.def.unlocked).forEach((p) => p.unlock());
    this.everBuilt = new Set();

    this.currentPad = null;
    this.standTime = 0;
    this.depositTimer = 0;
    this.roundRobin = 0;

    towers.on('destroyed', this.onTowerDestroyed, this);
    workers.on('worker-died', this.onWorkerDied, this);
  }

  padPosition(def) {
    if (def.road) {
      return this.road.sidePoint(def.road.distance, def.road.side, this.roadPadOffset());
    }
    return { x: this.base.x + def.x, y: this.base.y + def.y };
  }

  roadPadOffset() {
    return CONFIG.ROAD.WIDTH / 2 + CONFIG.BUILD.PAD_SIZE / 2 + 14;
  }

  // Where a tower's upgrade pad goes. `upgradeOffset` in the pad's config wins.
  // Otherwise search rings of spots around the tower, starting with the side
  // facing away from the road, and take the first one that doesn't overlap
  // another pad (titles included) or the road, and (for road pads) stays
  // outside the largest base.
  upgradePadPosition(def, pad, taken) {
    if (def.upgradeOffset) return { x: pad.x + def.upgradeOffset.x, y: pad.y + def.upgradeOffset.y };
    const d = CONFIG.TOWER.UPGRADE_PAD_DISTANCE;
    const near = this.nearestRoadPoint(pad.x, pad.y);
    const away = Math.atan2(pad.y - near.y, pad.x - near.x);
    const steps = 16;
    for (let ring = 0; ring < 4; ring++) {
      const r = d + ring * 30;
      for (let i = 0; i < steps; i++) {
        const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1); // 0, +1, -1, +2, -2, ...
        const a = away + (k * Math.PI * 2) / steps;
        const c = { x: pad.x + Math.cos(a) * r, y: pad.y + Math.sin(a) * r };
        if (this.spotFree(c, taken, !!def.road)) return c;
      }
    }
    console.warn(`No free spot for ${def.id}'s upgrade pad; set upgradeOffset in its config`);
    return { x: pad.x + Math.cos(away) * d, y: pad.y + Math.sin(away) * d };
  }

  nearestRoadPoint(x, y) {
    let best = this.road.samples[0];
    let bestD = Infinity;
    for (const p of this.road.samples) {
      const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (dd < bestD) {
        best = p;
        bestD = dd;
      }
    }
    return best;
  }

  // Pads are compared as boxes that include the title above them.
  spotFree(c, taken, outsideBase) {
    const size = CONFIG.BUILD.PAD_SIZE;
    const half = size / 2;
    const titleH = 24;
    const wide = 118; // titles are wider than the pad
    const margin = 6;
    const W = CONFIG.WORLD;
    if (c.x < half || c.y < half + titleH || c.x > W.WIDTH - half || c.y > W.HEIGHT - half) return false;
    const clash = taken.some((t) => Math.abs(t.x - c.x) < wide + margin
      && c.y - half - titleH < t.y + half + margin
      && t.y - half - titleH < c.y + half + margin);
    if (clash) return false;
    if (this.road.distanceTo(c.x, c.y) < CONFIG.ROAD.WIDTH / 2 + half + 8) return false;
    if (outsideBase) {
      const maxRadius = Math.max(CONFIG.BASE.RADIUS, ...CONFIG.PADS.map((p) => p.radius ?? 0));
      if (Math.hypot(c.x - this.base.x, c.y - this.base.y) - size * 0.75 < maxRadius) return false;
    }
    return true;
  }

  update(delta) {
    const p = this.player;
    const pad = this.pads.find((pd) => pd.state === 'open' && pd.contains(p.x, p.y)) ?? null;

    if (pad !== this.currentPad) {
      this.currentPad?.setHighlight(false);
      pad?.setHighlight(true);
      this.currentPad = pad;
      this.standTime = 0;
      this.depositTimer = 0;
    }

    if (pad) {
      this.standTime += delta;
      if (this.standTime >= CONFIG.BUILD.DEPOSIT_DELAY) {
        this.depositTimer -= delta;
        while (this.depositTimer <= 0) {
          const type = this.pickType(pad);
          if (!type) {
            this.depositTimer = 0;
            break;
          }
          this.deposit(pad, type);
          this.depositTimer += CONFIG.BUILD.DEPOSIT_INTERVAL;
        }
      }
    }

    for (const pd of this.pads) {
      if (pd.readyToComplete) this.completePad(pd);
    }
  }

  // Alternate between resource types the pad still needs and the player has.
  pickType(pad) {
    const types = Object.keys(pad.cost).filter((t) => pad.needs(t) && this.inventory.get(t) > 0);
    if (types.length === 0) return null;
    return types[this.roundRobin++ % types.length];
  }

  deposit(pad, type) {
    const from = this.backpack.takeOffPosition(type);
    if (this.inventory.remove(type, 1) !== 1) return;
    const token = pad.reserve(type);
    flyItem(this.scene, {
      fromX: from.x,
      fromY: from.y,
      getTarget: () => ({ x: pad.x, y: pad.y }),
      type,
      duration: CONFIG.BUILD.FLY_DURATION,
      arcHeight: CONFIG.BUILD.FLY_ARC_HEIGHT,
      onArrive: () => pad.receive(type, token),
    });
  }

  completePad(pad) {
    pad.complete();
    if (this.currentPad === pad) this.currentPad = null;
    const def = pad.def;

    switch (def.building) {
      case 'tower': {
        const rebuilt = this.everBuilt.has(pad.id);
        pad.tower = this.towers.build(pad.x, pad.y);
        toast(this.scene, pad.x, pad.y - 50, rebuilt ? 'Tower rebuilt!' : `${def.label} built!`);
        this.scene.time.delayedCall(CONFIG.BUILD.UNLOCK_DELAY, () => this.openUpgrade(pad));
        break;
      }
      case 'upgrade': {
        const towerPad = this.padsById[def.towerPadId];
        const tower = towerPad.tower;
        if (tower?.alive && tower.upgrade()) {
          toast(this.scene, tower.x, tower.y - 50, `Tower level ${tower.level}!`, '#ffe082');
          this.scene.time.delayedCall(CONFIG.BUILD.UNLOCK_DELAY, () => this.openUpgrade(towerPad));
        }
        break;
      }
      case 'hut': {
        const sp = def.stockpile;
        pad.hut = this.workers.buildHut(def.hut, pad.x, pad.y, { x: this.base.x + sp.x, y: this.base.y + sp.y });
        toast(this.scene, pad.x, pad.y - 50, `${def.label} built!`);
        this.scene.time.delayedCall(CONFIG.BUILD.UNLOCK_DELAY, () => {
          this.openHire(pad);
          this.openHutUpgrade(pad);
        });
        break;
      }
      case 'hire': {
        const hutPad = this.padsById[def.hutPadId];
        if (this.workers.hire(hutPad.hut)) toast(this.scene, pad.x, pad.y - 50, 'Worker hired!');
        this.scene.time.delayedCall(CONFIG.BUILD.UNLOCK_DELAY, () => this.openHire(hutPad));
        break;
      }
      case 'hutUpgrade': {
        const hutPad = this.padsById[def.hutPadId];
        if (hutPad.hut.upgrade()) {
          toast(this.scene, hutPad.x, hutPad.y - 60, `Hut level ${hutPad.hut.level}!`, '#ffe082');
          this.scene.time.delayedCall(CONFIG.BUILD.UNLOCK_DELAY, () => this.openHutUpgrade(hutPad));
        }
        break;
      }
      case 'expansion':
        this.base.expandTo(def.radius);
        this.resources.clearInsideBase();
        toast(this.scene, pad.x, pad.y - 50, 'Base expanded!', '#ffe082');
        break;
      default:
        console.warn(`Unknown building type: ${def.building}`);
    }

    this.scene.events.emit('building-completed', def, pad);

    if (!this.everBuilt.has(pad.id)) {
      this.everBuilt.add(pad.id);
      const revealed = this.pads.filter((p) => asList(p.def.unlockedBy).includes(pad.id));
      if (revealed.length) {
        this.scene.time.delayedCall(CONFIG.BUILD.UNLOCK_DELAY, () => revealed.forEach((p) => p.unlock()));
      }
    }
  }

  // Open the upgrade pad for the tower's next level, if there is one.
  openUpgrade(towerPad) {
    const tower = towerPad.tower;
    if (!tower?.alive || tower.level >= tower.maxLevel) return;
    const next = CONFIG.TOWER.LEVELS[tower.level];
    towerPad.upgradePad.reopen({ cost: next.UPGRADE_COST, label: `Upgrade Lv ${tower.level + 1}` });
  }

  // Hire pad: next worker (rising cost), a cheaper rehire for a lost one, or
  // nothing when the hut is full.
  openHire(hutPad) {
    const offer = hutPad.hut?.hireOffer();
    if (offer) hutPad.hirePad.reopen(offer);
  }

  openHutUpgrade(hutPad) {
    const hut = hutPad.hut;
    if (!hut || hut.level >= hut.maxLevel) return;
    const next = CONFIG.HUT.LEVELS[hut.level];
    hutPad.upgradePad.reopen({ cost: next.UPGRADE_COST, label: `Upgrade Lv ${hut.level + 1}` });
  }

  // A worker died: offer the cheaper rehire, unless the player is already
  // paying into the hire pad (then leave it alone).
  onWorkerDied(hut) {
    const hutPad = this.pads.find((p) => p.hut === hut);
    if (!hutPad) return;
    const pad = hutPad.hirePad;
    const untouched = Object.values(pad.paid).every((n) => n === 0) && pad.inFlight === 0;
    if (pad.state !== 'open' || untouched) {
      this.scene.time.delayedCall(CONFIG.BUILD.UNLOCK_DELAY, () => this.openHire(hutPad));
    }
  }

  onTowerDestroyed(tower) {
    const pad = this.pads.find((p) => p.tower === tower);
    if (!pad) return;
    pad.tower = null;
    pad.upgradePad.close();
    if (this.currentPad === pad.upgradePad) this.currentPad = null;
    toast(this.scene, tower.x, tower.y - 50, 'Tower destroyed!', '#ff8a80');

    const factor = CONFIG.TOWER.REBUILD_COST_FACTOR;
    const cost = {};
    for (const [type, n] of Object.entries(pad.def.cost)) cost[type] = Math.max(1, Math.ceil(n * factor));
    this.scene.time.delayedCall(CONFIG.TOWER.REBUILD_DELAY, () => {
      if (!pad.tower) pad.reopen({ cost, label: 'Rebuild Tower' });
    });
  }
}
