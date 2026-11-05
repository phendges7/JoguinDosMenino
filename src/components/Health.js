import Phaser from 'phaser';

// Hit points for anything that can be hurt: the player, the base, zombies.
// Values can be fractional (regen); display with Math.ceil.
// Events:
//   'changed' (current, max)
//   'damaged' (amountLost)
//   'died'
export class Health extends Phaser.Events.EventEmitter {
  constructor(max) {
    super();
    this.max = max;
    this.current = max;
  }

  get ratio() { return this.current / this.max; }
  get isDead() { return this.current <= 0; }
  get isFull() { return this.current >= this.max; }

  // Returns how much was actually lost.
  damage(amount) {
    if (this.isDead || amount <= 0) return 0;
    const before = this.current;
    this.current = Math.max(0, this.current - amount);
    const lost = before - this.current;
    this.emit('changed', this.current, this.max);
    this.emit('damaged', lost);
    if (this.isDead) this.emit('died');
    return lost;
  }

  heal(amount) {
    if (this.isDead || this.isFull || amount <= 0) return;
    this.current = Math.min(this.max, this.current + amount);
    this.emit('changed', this.current, this.max);
  }

  reset() {
    this.current = this.max;
    this.emit('changed', this.current, this.max);
  }
}
