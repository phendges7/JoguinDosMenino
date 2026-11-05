import Phaser from 'phaser';
import { CONFIG } from '../config.js';

// Source of truth for how many resources the player holds.
// Events:
//   'added'   (type, amount, newTotal)
//   'removed' (type, amount, newTotal)
//   'changed' (type, newTotal)
export class Inventory extends Phaser.Events.EventEmitter {
  constructor() {
    super();
    this.counts = {};
    for (const type of Object.keys(CONFIG.RESOURCES)) this.counts[type] = 0;
  }

  get(type) {
    return this.counts[type] ?? 0;
  }

  add(type, amount = 1) {
    if (amount <= 0) return;
    this.counts[type] = this.get(type) + amount;
    this.emit('added', type, amount, this.counts[type]);
    this.emit('changed', type, this.counts[type]);
  }

  // Removes up to `amount`, returns how many were actually removed.
  remove(type, amount = 1) {
    const removed = Math.min(amount, this.get(type));
    if (removed <= 0) return 0;
    this.counts[type] -= removed;
    this.emit('removed', type, removed, this.counts[type]);
    this.emit('changed', type, this.counts[type]);
    return removed;
  }

  // costs: { wood: 5, stone: 2 }
  has(costs) {
    return Object.entries(costs).every(([type, n]) => this.get(type) >= n);
  }
}
