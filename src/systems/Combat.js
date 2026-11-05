import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Health } from '../components/Health.js';

// Damage rules and the life cycle of the player and the base:
//  - zombies touching the player / a worker / a tower / the base edge hit them on a cooldown
//    (in that order of priority)
//  - player regenerates inside the base
//  - player death: lose part of the backpack, respawn at the base centre
//  - base death: game over
// Kept in the registry as 'combat' so the UI can read it.
//
// Events:
//   'kills-changed' (kills)
//   'player-died'   ({ respawnIn, lost: { wood: n, ... } })
//   'player-respawned'
//   'base-hit'
//   'game-over'     ({ time, kills })
export class Combat extends Phaser.Events.EventEmitter {
  constructor(scene, { player, base, zombies, inventory }) {
    super();
    this.scene = scene;
    this.player = player;
    this.base = base;
    this.zombies = zombies;
    this.inventory = inventory;

    const H = CONFIG.HEALTH;
    this.playerHealth = new Health(H.PLAYER_MAX);
    this.baseHealth = new Health(H.BASE_MAX);
    this.kills = 0;
    this.elapsed = 0;
    this.gameOver = false;

    zombies.on('killed', () => {
      this.kills++;
      this.emit('kills-changed', this.kills);
    });
    this.playerHealth.on('died', this.onPlayerDied, this);
    this.baseHealth.on('died', this.onBaseDestroyed, this);
  }

  update(delta) {
    if (this.gameOver) return;
    this.elapsed += delta;
    const Z = CONFIG.ZOMBIE;
    const p = this.player;
    const b = this.base;

    for (const z of this.zombies.alive) {
      if (!z.alive || z.attackTimer > 0) continue;
      if (z.touchingPlayer && p.alive) {
        z.attackTimer = Z.PLAYER_ATTACK_COOLDOWN;
        z.lungeAt(p.x, p.y);
        this.damagePlayer(Z.PLAYER_DAMAGE);
      } else if (z.touchingWorker?.alive) {
        const w = z.touchingWorker;
        z.attackTimer = Z.WORKER_ATTACK_COOLDOWN;
        z.lungeAt(w.x, w.y);
        w.takeDamage(Z.WORKER_DAMAGE);
      } else if (z.touchingTower?.alive) {
        const t = z.touchingTower;
        z.attackTimer = Z.TOWER_ATTACK_COOLDOWN;
        z.lungeAt(t.x, t.y);
        t.takeDamage(Z.TOWER_DAMAGE);
      } else if (z.atBase) {
        z.attackTimer = Z.BASE_ATTACK_COOLDOWN;
        z.lungeAt(b.x, b.y);
        this.baseHealth.damage(Z.BASE_DAMAGE);
        this.emit('base-hit');
        if (this.gameOver) return;
      }
    }

    if (p.alive && b.contains(p.x, p.y)) {
      this.playerHealth.heal(CONFIG.HEALTH.REGEN_PER_SECOND * (delta / 1000));
    }
  }

  damagePlayer(amount) {
    const H = CONFIG.HEALTH;
    if (this.playerHealth.damage(amount) > 0) {
      this.scene.cameras.main.shake(H.DAMAGE_SHAKE_DURATION, H.DAMAGE_SHAKE_INTENSITY);
    }
  }

  onPlayerDied() {
    const H = CONFIG.HEALTH;
    const p = this.player;
    p.alive = false;

    // Lose a share of every resource. The Backpack follows the Inventory.
    const lost = {};
    for (const type of Object.keys(CONFIG.RESOURCES)) {
      const n = Math.floor(this.inventory.get(type) * H.BACKPACK_LOSS);
      if (n > 0) lost[type] = this.inventory.remove(type, n);
    }

    this.scene.tweens.killTweensOf(p.view);
    this.scene.tweens.add({ targets: p.view, alpha: 0, scale: 0.6, duration: 250, ease: 'Quad.easeIn' });
    this.emit('player-died', { respawnIn: H.RESPAWN_DELAY, lost });
    this.scene.time.delayedCall(H.RESPAWN_DELAY, () => this.respawnPlayer());
  }

  respawnPlayer() {
    if (this.gameOver) return;
    const p = this.player;
    p.teleport(this.base.x, this.base.y);
    this.playerHealth.reset();
    p.alive = true;
    this.scene.tweens.killTweensOf(p.view);
    p.view.setAlpha(1).setScale(0.5);
    this.scene.tweens.add({ targets: p.view, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.emit('player-respawned');
  }

  onBaseDestroyed() {
    this.gameOver = true;
    this.emit('game-over', { time: this.elapsed, kills: this.kills });
  }
}
