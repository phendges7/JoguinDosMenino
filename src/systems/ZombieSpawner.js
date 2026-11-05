import Phaser from 'phaser';
import { CONFIG } from '../config.js';

// Placeholder spawner: one zombie every `interval` ms out of the portal at the
// far end of the road. The interval shrinks every minute.
// Kept separate so a wave system can replace it later without touching zombies.
export class ZombieSpawner {
  constructor(scene, zombies, road) {
    this.scene = scene;
    this.zombies = zombies;
    this.road = road;
    this.elapsed = 0;
    this.timer = CONFIG.SPAWNER.FIRST_DELAY;
    this.running = true;
  }

  get interval() {
    const S = CONFIG.SPAWNER;
    return Math.max(S.MIN_INTERVAL, S.START_INTERVAL * S.DECAY_PER_MINUTE ** (this.elapsed / 60000));
  }

  stop() {
    this.running = false;
  }

  update(delta) {
    if (!this.running) return;
    const S = CONFIG.SPAWNER;
    this.elapsed += delta;
    this.timer -= delta;
    if (this.timer > 0) return;

    if (this.zombies.count >= S.MAX_ALIVE) {
      this.timer = S.RETRY_DELAY;
      return;
    }
    const { x, y } = this.road.portalPoint;
    const j = S.PORTAL_JITTER;
    this.zombies.spawn(x + Phaser.Math.FloatBetween(-j, j), y + Phaser.Math.FloatBetween(-j, j), { emerge: true });
    this.timer = Math.max(0, this.timer) + this.interval;
  }
}
