import { CONFIG } from '../config.js';
import { flyItem, darken } from '../effects/flyItem.js';

// Visual stack of item blocks on the player's back. Mirrors the Inventory:
// it listens for 'added' / 'removed' so later milestones only touch the Inventory.
// Only the top VISIBLE_CAP items are drawn; a "+N" label shows the hidden rest.
export class Backpack {
  constructor(scene, player, inventory) {
    this.scene = scene;
    this.player = player;
    this.inventory = inventory;
    this.items = []; // resource types, bottom -> top

    const B = CONFIG.BACKPACK;
    const packWidth = B.COLUMNS * (B.BLOCK_WIDTH + B.BLOCK_GAP) + 3;
    this.container = scene.add.container(0, 0);
    this.pack = scene.add.rectangle(0, 2, packWidth, 8, 0x5a3a1e).setStrokeStyle(1, 0x2e1d0e);
    this.stack = scene.add.container(0, -3);
    this.overflowText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.container.add([this.pack, this.stack, this.overflowText]);
    this.blocks = [];

    player.attachToBack(this.container);

    inventory.on('added', this.onAdded, this);
    inventory.on('removed', this.onRemoved, this);
    scene.events.once('shutdown', () => {
      inventory.off('added', this.onAdded, this);
      inventory.off('removed', this.onRemoved, this);
    });
  }

  onAdded(type, amount) {
    for (let i = 0; i < amount; i++) this.items.push(type);
    this.render();
    const newest = this.blocks[Math.min(this.items.length, CONFIG.BACKPACK.VISIBLE_CAP) - 1];
    if (newest) {
      this.scene.tweens.killTweensOf(newest);
      newest.setScale(1.6);
      this.scene.tweens.add({ targets: newest, scale: 1, duration: 150, ease: 'Back.easeOut' });
    }
  }

  onRemoved(type, amount) {
    // Take from the top of the stack first.
    for (let i = this.items.length - 1; i >= 0 && amount > 0; i--) {
      if (this.items[i] === type) {
        this.items.splice(i, 1);
        amount--;
      }
    }
    this.render();
  }

  slotPosition(index) {
    const B = CONFIG.BACKPACK;
    const col = index % B.COLUMNS;
    const row = Math.floor(index / B.COLUMNS);
    return {
      x: (col - (B.COLUMNS - 1) / 2) * (B.BLOCK_WIDTH + B.BLOCK_GAP),
      y: -row * (B.BLOCK_HEIGHT + B.BLOCK_GAP) - B.BLOCK_HEIGHT / 2,
    };
  }

  render() {
    const B = CONFIG.BACKPACK;
    const visible = this.items.slice(-B.VISIBLE_CAP);
    while (this.blocks.length < visible.length) {
      const block = this.scene.add.rectangle(0, 0, B.BLOCK_WIDTH, B.BLOCK_HEIGHT, 0xffffff);
      this.stack.add(block);
      this.blocks.push(block);
    }
    this.blocks.forEach((block, i) => {
      const type = visible[i];
      block.setVisible(!!type);
      if (!type) return;
      const color = CONFIG.RESOURCES[type].color;
      const { x, y } = this.slotPosition(i);
      block.setPosition(x, y).setFillStyle(color).setStrokeStyle(1, darken(color));
    });

    const hidden = this.items.length - visible.length;
    this.overflowText.setVisible(hidden > 0).setText(`+${hidden}`);
    const top = this.slotPosition(Math.max(0, visible.length - 1));
    this.overflowText.setPosition(0, this.stack.y + top.y - B.BLOCK_HEIGHT);
  }

  // World position of the block that will leave next when `type` is removed
  // (the topmost block of that type, or the top of the stack if it's hidden).
  takeOffPosition(type) {
    const cap = CONFIG.BACKPACK.VISIBLE_CAP;
    const hidden = Math.max(0, this.items.length - cap);
    const index = this.items.lastIndexOf(type) - hidden;
    const visibleTop = Math.min(this.items.length, cap) - 1;
    return this.slotWorldPosition(index >= 0 ? index : Math.max(0, visibleTop));
  }

  // World position where the next item will land.
  nextSlotWorldPosition() {
    return this.slotWorldPosition(Math.min(this.items.length, CONFIG.BACKPACK.VISIBLE_CAP - 1));
  }

  slotWorldPosition(index) {
    const local = this.slotPosition(index);
    const view = this.player.view;
    const slot = this.player.backSlot;
    return {
      x: view.x + slot.x + this.container.x + this.stack.x + local.x,
      y: view.y + slot.y + this.container.y + this.stack.y + local.y,
    };
  }

  // Animate an item flying from a world point into the pack, then call onArrive.
  flyIn(fromX, fromY, type, onArrive) {
    flyItem(this.scene, {
      fromX,
      fromY,
      getTarget: () => this.nextSlotWorldPosition(), // re-read: the player may be moving
      type,
      duration: CONFIG.BACKPACK.FLY_DURATION,
      arcHeight: CONFIG.BACKPACK.FLY_ARC_HEIGHT,
      onArrive,
    });
  }
}
