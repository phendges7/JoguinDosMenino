import { CONFIG } from '../config.js';
import { darken } from '../effects/flyItem.js';
import { VISUALS } from '../visuals.js';

// A visual stack of resource blocks (bottom -> top) in a fixed number of
// columns. Used on backs (Backpack: player and workers) and on stockpiles.
// Only the top `cap` items are drawn; a "+N" label shows the hidden rest.
// Positions returned are local to `container`.
export class ItemStack {
  constructor(scene, opts = {}) {
    const B = CONFIG.BACKPACK;
    this.scene = scene;
    this.columns = opts.columns ?? B.COLUMNS;
    this.cap = opts.cap ?? B.VISIBLE_CAP;
    this.blockWidth = opts.blockWidth ?? B.BLOCK_WIDTH;
    this.blockHeight = opts.blockHeight ?? B.BLOCK_HEIGHT;
    this.gap = opts.gap ?? B.BLOCK_GAP;
    this.items = [];
    this.blocks = [];

    this.container = scene.add.container(0, 0);
    this.overflowText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.container.add(this.overflowText);
  }

  get count() { return this.items.length; }
  get topType() { return this.items[this.items.length - 1] ?? null; }

  add(type, amount = 1) {
    for (let i = 0; i < amount; i++) this.items.push(type);
    this.render();
    // Squash-and-stretch as the newest block lands.
    const newest = this.blocks[Math.min(this.items.length, this.cap) - 1];
    if (newest) {
      const S = VISUALS.SQUASH;
      this.scene.tweens.killTweensOf(newest);
      newest.setScale(S.ITEM_LAND_X, S.ITEM_LAND_Y);
      this.scene.tweens.add({
        targets: newest, scaleX: 1, scaleY: 1, duration: S.ITEM_LAND_DURATION, ease: 'Back.easeOut', easeParams: [3],
      });
    }
  }

  // Takes from the top of the stack first.
  remove(type, amount = 1) {
    for (let i = this.items.length - 1; i >= 0 && amount > 0; i--) {
      if (this.items[i] === type) {
        this.items.splice(i, 1);
        amount--;
      }
    }
    this.render();
  }

  slotPosition(index) {
    const col = index % this.columns;
    const row = Math.floor(index / this.columns);
    return {
      x: (col - (this.columns - 1) / 2) * (this.blockWidth + this.gap),
      y: -row * (this.blockHeight + this.gap) - this.blockHeight / 2,
    };
  }

  render() {
    const visible = this.items.slice(-this.cap);
    while (this.blocks.length < visible.length) {
      const block = this.scene.add.rectangle(0, 0, this.blockWidth, this.blockHeight, 0xffffff);
      this.container.add(block);
      this.blocks.push(block);
    }
    this.container.bringToTop(this.overflowText);
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
    this.overflowText.setPosition(0, top.y - this.blockHeight);
  }

  // Local position of the block that will leave next when `type` is removed
  // (the topmost block of that type, or the top of the stack if it's hidden).
  takeOffPosition(type) {
    const hidden = Math.max(0, this.items.length - this.cap);
    const index = this.items.lastIndexOf(type) - hidden;
    const visibleTop = Math.min(this.items.length, this.cap) - 1;
    return this.slotPosition(index >= 0 ? index : Math.max(0, visibleTop));
  }

  // Local position where the next item will land.
  nextSlotPosition() {
    return this.slotPosition(Math.min(this.items.length, this.cap - 1));
  }
}
