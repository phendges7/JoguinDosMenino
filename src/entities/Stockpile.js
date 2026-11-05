import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';
import { softShadow } from '../effects/textures.js';
import { ItemStack } from './ItemStack.js';

// A wooden pallet next to a hut where workers drop what they gathered.
// Shows a growing pile of blocks (same ItemStack as backpacks) and a count.
export class Stockpile {
  constructor(scene, x, y) {
    const S = CONFIG.STOCKPILE;
    this.scene = scene;
    this.x = x;
    this.y = y;

    const w = S.COLUMNS * (S.BLOCK_WIDTH + S.BLOCK_GAP) + 10;
    const pallet = scene.add.container(0, 0, [
      softShadow(scene, 3, 8, w + 20, 24, VISUALS.SHADOW.BUILDING_ALPHA),
      scene.add.rectangle(0, 4, w, 12, S.PALLET_COLOR).setStrokeStyle(2, 0x5a3a1e),
      scene.add.rectangle(-w / 3, 4, 3, 12, 0x5a3a1e),
      scene.add.rectangle(w / 3, 4, 3, 12, 0x5a3a1e),
    ]);
    this.stack = new ItemStack(scene, {
      columns: S.COLUMNS, cap: S.VISIBLE_CAP,
      blockWidth: S.BLOCK_WIDTH, blockHeight: S.BLOCK_HEIGHT, gap: S.BLOCK_GAP,
    });
    this.stack.container.setY(-1);
    this.label = scene.add
      .text(0, 22, '0', {
        fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5);
    this.view = scene.add.container(x, y, [pallet, this.stack.container, this.label]).setDepth(y + 10); // y-sort by the pallet
  }

  get total() { return this.stack.count; }
  get topType() { return this.stack.topType; }

  add(type) {
    this.stack.add(type, 1);
    this.refresh();
  }

  // Removes the top item and returns { type, x, y } (where it left from), or null.
  take() {
    const type = this.stack.topType;
    if (!type) return null;
    const from = this.toWorld(this.stack.takeOffPosition(type));
    this.stack.remove(type, 1);
    this.refresh();
    return { type, ...from };
  }

  nextSlotWorldPosition() {
    return this.toWorld(this.stack.nextSlotPosition());
  }

  toWorld(local) {
    return { x: this.x + this.stack.container.x + local.x, y: this.y + this.stack.container.y + local.y };
  }

  refresh() {
    this.label.setText(`${this.total}`);
  }

  contains(x, y) {
    return Math.hypot(x - this.x, y - this.y) <= CONFIG.STOCKPILE.PICKUP_RADIUS;
  }
}
