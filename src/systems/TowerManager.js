import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Tower } from '../entities/buildings/Tower.js';

// Owns the standing archery towers: builds them, runs their shooters, shows
// the range circle near the player and drops destroyed ones.
// BuildManager decides *where* and *when* to build / upgrade; this decides how
// towers behave. Also the tower provider for ZombieManager (`alive`).
//
// Events: 'destroyed' (tower)
export class TowerManager extends Phaser.Events.EventEmitter {
  constructor(scene, { player, zombies, projectiles }) {
    super();
    this.scene = scene;
    this.player = player;
    this.zombies = zombies;
    this.projectiles = projectiles;
    this.towers = [];
  }

  get alive() { return this.towers; }

  build(x, y) {
    const tower = new Tower(this.scene, x, y, { targets: this.zombies, projectiles: this.projectiles });
    tower.onDestroyed = () => this.emit('destroyed', tower);
    this.towers.push(tower);
    return tower;
  }

  update(delta) {
    if (this.towers.some((t) => !t.alive)) this.towers = this.towers.filter((t) => t.alive);
    const p = this.player;
    const showDist = CONFIG.TOWER.RANGE_SHOW_DISTANCE;
    for (const t of this.towers) {
      t.shooter.update(delta);
      const near = p.alive && Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= showDist;
      t.update(delta, near);
    }
  }
}
