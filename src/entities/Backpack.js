import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';
import { flyItem } from '../effects/flyItem.js';
import { ItemStack } from './ItemStack.js';

// Visual stack of item blocks on a character's back. Mirrors an Inventory:
// it listens for 'added' / 'removed' so gameplay code only touches the Inventory.
// `owner` is anything with `view`, `backSlot` and attachToBack(container):
// the Player, or a Worker.
export class Backpack {
  constructor(scene, owner, inventory) {
    this.scene = scene;
    this.owner = owner;
    this.inventory = inventory;

    const B = CONFIG.BACKPACK;
    const packWidth = B.COLUMNS * (B.BLOCK_WIDTH + B.BLOCK_GAP) + 3;
    this.container = scene.add.container(0, 0);
    this.pack = scene.add.rectangle(0, 2, packWidth, 8, 0x5a3a1e).setStrokeStyle(1, 0x2e1d0e);
    this.stack = new ItemStack(scene);
    this.stack.container.setY(-3);
    this.container.add([this.pack, this.stack.container]);

    owner.attachToBack(this.container);

    inventory.on('added', this.onAdded, this);
    inventory.on('removed', this.onRemoved, this);
    scene.events.on('postupdate', this.sway, this);
    this.detach = () => {
      inventory.off('added', this.onAdded, this);
      inventory.off('removed', this.onRemoved, this);
      scene.events.off('postupdate', this.sway, this);
    };
    scene.events.once('shutdown', this.detach);
    this.lastX = null;
  }

  // Lean the pack against the direction of travel (it lags behind the body).
  sway(time, delta) {
    if (!delta) return;
    const S = VISUALS.BACKPACK_SWAY;
    const x = this.owner.view.x;
    const vx = this.lastX === null ? 0 : (x - this.lastX) / (delta / 1000);
    this.lastX = x;
    const want = Phaser.Math.Clamp(-vx / S.SPEED_FOR_MAX, -1, 1) * S.MAX_ANGLE;
    const k = 1 - Math.exp(-S.SMOOTHING * (delta / 1000));
    this.container.rotation = Phaser.Math.Linear(this.container.rotation, want, k);
  }

  get items() { return this.stack.items; }

  onAdded(type, amount) {
    this.stack.add(type, amount);
  }

  onRemoved(type, amount) {
    this.stack.remove(type, amount);
  }

  // World position of a point local to the stack container.
  toWorld(local) {
    const view = this.owner.view;
    const slot = this.owner.backSlot;
    return {
      x: view.x + slot.x + this.container.x + this.stack.container.x + local.x,
      y: view.y + slot.y + this.container.y + this.stack.container.y + local.y,
    };
  }

  // World position of the block that will leave next when `type` is removed.
  takeOffPosition(type) {
    return this.toWorld(this.stack.takeOffPosition(type));
  }

  // World position where the next item will land.
  nextSlotWorldPosition() {
    return this.toWorld(this.stack.nextSlotPosition());
  }

  // Animate an item flying from a world point into the pack, then call onArrive.
  flyIn(fromX, fromY, type, onArrive) {
    flyItem(this.scene, {
      fromX,
      fromY,
      getTarget: () => this.nextSlotWorldPosition(), // re-read: the owner may be moving
      type,
      duration: CONFIG.BACKPACK.FLY_DURATION,
      arcHeight: CONFIG.BACKPACK.FLY_ARC_HEIGHT,
      onArrive,
    });
  }
}
