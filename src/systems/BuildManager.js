import { CONFIG } from '../config.js';
import { BuildPad } from '../entities/BuildPad.js';
import { Tower } from '../entities/buildings/Tower.js';
import { flyItem } from '../effects/flyItem.js';
import { toast } from '../effects/toast.js';

// Owns build pads. While the player stands on an open pad, needed resources
// leave the backpack one at a time and fly onto it. A fully paid pad builds.
export class BuildManager {
  constructor(scene, { player, inventory, backpack, base, resources, road }) {
    this.scene = scene;
    this.player = player;
    this.inventory = inventory;
    this.backpack = backpack;
    this.base = base;
    this.resources = resources;
    this.road = road;

    this.towers = [];
    this.pads = CONFIG.PADS.map((def) => {
      const pos = this.padPosition(def);
      return new BuildPad(scene, def, pos.x, pos.y);
    });
    this.padsById = Object.fromEntries(this.pads.map((p) => [p.id, p]));
    this.pads.filter((p) => p.def.unlocked).forEach((p) => p.unlock());

    this.currentPad = null;
    this.standTime = 0;
    this.depositTimer = 0;
    this.roundRobin = 0;
  }

  padPosition(def) {
    if (def.road) {
      const offset = CONFIG.ROAD.WIDTH / 2 + CONFIG.BUILD.PAD_SIZE / 2 + 14;
      return this.road.sidePoint(def.road.distance, def.road.side, offset);
    }
    return { x: this.base.x + def.x, y: this.base.y + def.y };
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
    pad.reserve(type);
    flyItem(this.scene, {
      fromX: from.x,
      fromY: from.y,
      getTarget: () => ({ x: pad.x, y: pad.y }),
      type,
      duration: CONFIG.BUILD.FLY_DURATION,
      arcHeight: CONFIG.BUILD.FLY_ARC_HEIGHT,
      onArrive: () => pad.receive(type),
    });
  }

  completePad(pad) {
    pad.complete();
    if (this.currentPad === pad) this.currentPad = null;
    const def = pad.def;

    switch (def.building) {
      case 'tower':
        this.towers.push(new Tower(this.scene, pad.x, pad.y));
        toast(this.scene, pad.x, pad.y - 50, `${def.label} built!`);
        break;
      case 'expansion':
        this.base.expandTo(def.radius);
        this.resources.clearInsideBase();
        toast(this.scene, pad.x, pad.y - 50, 'Base expanded!', '#ffe082');
        break;
      default:
        console.warn(`Unknown building type: ${def.building}`);
    }

    this.scene.events.emit('building-completed', def, pad);

    if (def.unlocks?.length) {
      this.scene.time.delayedCall(CONFIG.BUILD.UNLOCK_DELAY, () => {
        def.unlocks.forEach((id) => this.padsById[id]?.unlock());
      });
    }
  }
}
