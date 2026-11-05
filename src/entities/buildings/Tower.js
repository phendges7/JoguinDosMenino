import Phaser from 'phaser';
import { CONFIG } from '../../config.js';
import { VISUALS } from '../../visuals.js';
import { softShadow } from '../../effects/textures.js';
import { Health } from '../../components/Health.js';
import { Shooter } from '../../components/Shooter.js';
import { darken } from '../../effects/flyItem.js';

// An archery tower: a stone base with a coloured top and an archer that turns
// to aim. Shoots with the same Shooter as the player's bow, using the stats of
// its current level (CONFIG.TOWER.LEVELS). Zombies can attack and destroy it;
// it repairs itself when left alone.
export class Tower {
  // targets / projectiles: same objects the bow uses (ZombieManager, Projectiles).
  constructor(scene, x, y, { targets, projectiles }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.level = 1;
    this.alive = true;
    this.lastHitAt = -Infinity;
    this.aimAngle = Math.PI / 2;
    this.onDestroyed = null; // set by TowerManager

    this.health = new Health(this.stats.MAX_HEALTH);
    this.shooter = new Shooter(scene, {
      source: this,
      stats: this.stats,
      targets,
      projectiles,
      muzzleOffset: CONFIG.TOWER.MUZZLE_OFFSET,
      canFire: () => this.alive,
      onFire: (target, angle) => this.onFire(angle),
    });

    this.buildView();
    this.applyLevelLook();
    this.popIn();
  }

  get stats() { return CONFIG.TOWER.LEVELS[this.level - 1]; }
  get maxLevel() { return CONFIG.TOWER.LEVELS.length; }
  get radius() { return (CONFIG.TOWER.SIZE / 2) * this.stats.SCALE; }
  get beingAttacked() { return this.scene.time.now - this.lastHitAt < CONFIG.TOWER.REPAIR_DELAY; }

  buildView() {
    const T = CONFIG.TOWER;
    const s = this.scene;
    const size = T.SIZE;
    const c = size * 0.22; // crenellation size

    this.shadow = softShadow(s, 5, size * 0.45, size * 1.5, size * 0.6, VISUALS.SHADOW.BUILDING_ALPHA);
    this.top = s.add.rectangle(0, 0, size * 0.55, size * 0.55, 0xffffff);
    this.pips = s.add.container(0, size / 2 - 6);
    this.body = s.add.container(0, 0, [
      s.add.rectangle(0, 0, size, size, T.BASE_COLOR).setStrokeStyle(2, 0x5f5f5f),
      s.add.rectangle(-size / 2 + c / 2, -size / 2 + c / 2, c, c, 0xa5a5a5),
      s.add.rectangle(size / 2 - c / 2, -size / 2 + c / 2, c, c, 0xa5a5a5),
      s.add.rectangle(-size / 2 + c / 2, size / 2 - c / 2, c, c, 0xa5a5a5),
      s.add.rectangle(size / 2 - c / 2, size / 2 - c / 2, c, c, 0xa5a5a5),
      this.top,
      this.pips,
    ]);

    // Archer + bow, rotated to aim. Drawn pointing along +x.
    const bow = s.add.graphics();
    bow.lineStyle(1.5, CONFIG.BOW.STRING_COLOR, 0.9).lineBetween(9, -9, 9, 9);
    bow.lineStyle(3, CONFIG.BOW.COLOR, 1).beginPath().arc(4, 0, 10, -1.1, 1.1).strokePath();
    this.archer = s.add.container(0, 0, [
      bow,
      s.add.circle(0, 0, size * 0.16, T.ARCHER_COLOR).setStrokeStyle(2, 0x1f4f99),
    ]);

    const HB = T.HEALTH_BAR;
    this.barFill = s.add.rectangle(-HB.WIDTH / 2, 0, HB.WIDTH, HB.HEIGHT, HB.COLOR).setOrigin(0, 0.5);
    this.bar = s.add.container(0, 0, [
      s.add.rectangle(0, 0, HB.WIDTH + 2, HB.HEIGHT + 2, 0x000000, 0.65),
      this.barFill,
    ]).setVisible(false);

    this.view = s.add.container(this.x, this.y, [this.shadow, this.body, this.archer, this.bar]).setDepth(this.y + size * 0.5); // y-sort by the base

    this.rangeCircle = s.add
      .circle(this.x, this.y, this.stats.RANGE, 0xffffff, T.RANGE_FILL_ALPHA)
      .setStrokeStyle(2, 0xffffff, T.RANGE_STROKE_ALPHA)
      .setDepth(-400)
      .setAlpha(0);
  }

  // Colour, size and level pips for the current level.
  applyLevelLook() {
    const L = this.stats;
    const s = this.scene;
    this.top.setFillStyle(L.TOP_COLOR).setStrokeStyle(2, darken(L.TOP_COLOR));
    this.body.setScale(L.SCALE);
    this.archer.setScale(L.SCALE);
    this.shadow.setScale(L.SCALE);

    this.pips.removeAll(true);
    const gap = 7;
    for (let i = 0; i < this.level; i++) {
      const px = (i - (this.level - 1) / 2) * gap;
      this.pips.add(s.add.rectangle(px, 0, 5, 5, CONFIG.TOWER.PIP_COLOR).setStrokeStyle(1, 0x5a3a1e));
    }
    this.bar.y = -this.radius - CONFIG.TOWER.HEALTH_BAR.OFFSET;
    this.rangeCircle.setRadius(L.RANGE);
    this.refreshBar();
  }

  popIn() {
    this.scene.fx.popIn(this.view, { dust: { x: this.x, y: this.y + this.radius * 0.6 } });
    // dust ring
    const ring = this.scene.add.circle(this.x, this.y, this.radius, 0x000000, 0)
      .setStrokeStyle(4, 0xf5e6c4, 0.8).setDepth(this.y - 1);
    this.scene.tweens.add({
      targets: ring, scale: 2.2, alpha: 0, duration: 500, ease: 'Quad.easeOut', onComplete: () => ring.destroy(),
    });
  }

  upgrade() {
    if (this.level >= this.maxLevel) return false;
    const oldMax = this.health.max;
    this.level++;
    this.shooter.setStats(this.stats);
    this.health.max = this.stats.MAX_HEALTH;
    this.health.heal(this.health.max - oldMax); // keep the damage taken, add the new HP
    this.applyLevelLook();
    this.scene.tweens.killTweensOf(this.view);
    this.view.setScale(1.3);
    this.scene.tweens.add({ targets: this.view, scale: 1, duration: 350, ease: 'Back.easeOut' });
    return true;
  }

  onFire(angle) {
    this.aimAngle = angle;
    this.archer.rotation = angle;
    // small recoil
    this.scene.tweens.killTweensOf(this.archer);
    this.archer.setPosition(-Math.cos(angle) * 2, -Math.sin(angle) * 2);
    this.scene.tweens.add({ targets: this.archer, x: 0, y: 0, duration: 120 });
  }

  // target: shooter's current target or null. showRange: player is close.
  update(delta, showRange) {
    const T = CONFIG.TOWER;
    const target = this.shooter.target;
    if (target) {
      const want = Math.atan2(target.y - this.y, target.x - this.x);
      this.aimAngle = Phaser.Math.Angle.RotateTo(this.aimAngle, want, T.AIM_TURN_SPEED * (delta / 1000));
      this.archer.rotation = this.aimAngle;
    }

    const k = 1 - Math.exp(-10 * (delta / 1000));
    this.rangeCircle.alpha = Phaser.Math.Linear(this.rangeCircle.alpha, showRange ? 1 : 0, k);

    if (!this.beingAttacked && !this.health.isFull) {
      this.health.heal(T.REPAIR_PER_SECOND * (delta / 1000));
      this.refreshBar();
    }
  }

  refreshBar() {
    const damaged = !this.health.isFull;
    this.bar.setVisible(damaged && this.alive);
    this.barFill.width = CONFIG.TOWER.HEALTH_BAR.WIDTH * this.health.ratio;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.lastHitAt = this.scene.time.now;
    this.health.damage(amount);
    this.refreshBar();
    // hit flash: briefly whiten the top
    this.top.setFillStyle(0xffffff);
    this.flashEvent?.remove();
    this.flashEvent = this.scene.time.delayedCall(70, () => {
      if (this.alive) this.top.setFillStyle(this.stats.TOP_COLOR);
    });
    if (this.health.isDead) this.destroy();
  }

  // Collapse into rubble.
  destroy() {
    this.alive = false;
    this.shooter.target = null;
    this.bar.setVisible(false);
    const s = this.scene;
    s.tweens.killTweensOf([this.view, this.archer]);
    s.tweens.add({ targets: this.rangeCircle, alpha: 0, duration: 200, onComplete: () => this.rangeCircle.destroy() });
    s.tweens.add({
      targets: this.view,
      scaleY: 0.2,
      scaleX: 1.2,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeIn',
      onComplete: () => this.view.destroy(),
    });
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = this.radius + Phaser.Math.Between(10, 30);
      const chunk = s.add
        .rectangle(this.x, this.y, Phaser.Math.Between(4, 8), Phaser.Math.Between(4, 8), i % 3 ? 0x8d8d8d : 0x8b5a2b)
        .setDepth(this.y + 1);
      s.tweens.add({
        targets: chunk,
        x: this.x + Math.cos(a) * d,
        y: this.y + Math.sin(a) * d,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }
    s.cameras.main.shake(150, 0.004);
    this.onDestroyed?.(this);
  }
}
