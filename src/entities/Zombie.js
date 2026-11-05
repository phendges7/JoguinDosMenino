import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';
import { softShadow } from '../effects/textures.js';
import { Health } from '../components/Health.js';

// One zombie: a green blob with reaching hands and red eyes.
// Movement / AI is done by ZombieManager; this class owns the visuals,
// health, hit flash and death pop. Logical position is x / y; call sync()
// after moving it.
export class Zombie {
  constructor(scene, x, y, { emerge = false } = {}) {
    const Z = CONFIG.ZOMBIE;
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = Z.RADIUS;
    this.speedScale = 1 + Phaser.Math.FloatBetween(-Z.SPEED_VARIANCE, Z.SPEED_VARIANCE);
    this.health = new Health(Z.HEALTH);
    this.alive = true;
    this.state = 'road';        // 'road' (walk to the gate), 'chase' (the player) or 'tower' (attack targetTower)
    this.targetTower = null;
    this.touchingTower = null;
    this.touchingWorker = null;
    this.pathIndex = 0;         // next road point (set by ZombieManager)
    this.laneOffset = 0;        // sideways offset from the road centre line
    this.emerging = false;      // climbing out of the portal: doesn't move yet
    this.vx = 0;                // actual velocity, px/s (used by shooters to lead)
    this.vy = 0;
    this.walkX = 0;             // velocity it's trying to walk at
    this.walkY = 0;
    this.knockOffset = { x: 0, y: 0 }; // visual arrow knockback
    this.heading = Math.PI / 2;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.attackTimer = 0;
    this.touchingPlayer = false;
    this.atBase = false;
    this.lunge = { x: 0, y: 0 };
    this.onDeath = null;        // set by ZombieManager

    this.buildView();
    this.applyHeading();
    this.sync();
    if (emerge) this.emerge();
  }

  // Rise out of the portal: grow in from nothing, then start walking.
  emerge() {
    this.emerging = true;
    this.view.setScale(0).setAlpha(0);
    this.scene.tweens.add({
      targets: this.view,
      scale: 1,
      alpha: 1,
      duration: CONFIG.ZOMBIE.EMERGE_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => { this.emerging = false; },
    });
  }

  buildView() {
    const Z = CONFIG.ZOMBIE;
    const s = this.scene;
    const r = this.radius;
    const SH = VISUALS.SHADOW.ZOMBIE;
    this.shadow = softShadow(s, 0, r * SH.Y_FACTOR, r * SH.W_FACTOR, r * SH.H_FACTOR, SH.ALPHA);
    // Baked circles (images batch; dozens of vector circles per frame don't).
    zombieTextures(s, r);
    this.handL = s.add.image(0, 0, 'zombie-hand');
    this.handR = s.add.image(0, 0, 'zombie-hand');
    this.bodyCircle = s.add.image(0, 0, 'zombie-body');
    this.eyeL = s.add.image(0, 0, 'fx-dot').setDisplaySize(4.8, 4.8).setTint(Z.EYE_COLOR);
    this.eyeR = s.add.image(0, 0, 'fx-dot').setDisplaySize(4.8, 4.8).setTint(Z.EYE_COLOR);
    this.flashShapes = [this.handL, this.handR, this.bodyCircle];
    this.figure = s.add.container(0, 0, [this.handL, this.handR, this.bodyCircle, this.eyeL, this.eyeR]);

    const HB = Z.HEALTH_BAR;
    const barY = -r - HB.OFFSET;
    this.barFill = s.add.rectangle(-HB.WIDTH / 2, barY, HB.WIDTH, HB.HEIGHT, HB.COLOR).setOrigin(0, 0.5);
    this.bar = s.add.container(0, 0, [
      s.add.rectangle(0, barY, HB.WIDTH + 2, HB.HEIGHT + 2, 0x000000, 0.65),
      this.barFill,
    ]).setVisible(false);

    this.view = s.add.container(this.x, this.y, [this.shadow, this.figure, this.bar]);
  }

  // Turn smoothly towards `angle` (radians).
  turnTowards(angle, delta) {
    this.heading = Phaser.Math.Angle.RotateTo(this.heading, angle, CONFIG.ZOMBIE.TURN_SPEED * (delta / 1000));
    this.applyHeading();
  }

  applyHeading() {
    const r = this.radius;
    const a = this.heading;
    const reach = r * 0.95;
    this.handL.setPosition(Math.cos(a - 0.6) * reach, Math.sin(a - 0.6) * reach);
    this.handR.setPosition(Math.cos(a + 0.6) * reach, Math.sin(a + 0.6) * reach);
    this.eyeL.setPosition(Math.cos(a - 0.45) * r * 0.5, Math.sin(a - 0.45) * r * 0.5 - 2);
    this.eyeR.setPosition(Math.cos(a + 0.45) * r * 0.5, Math.sin(a + 0.45) * r * 0.5 - 2);

    // Tilted top-down view: facing away we see the back of the head (no eyes)
    // and the hands disappear behind the body.
    const away = Math.sin(a) < -0.3;
    this.eyeL.setVisible(!away);
    this.eyeR.setVisible(!away);
    if (Math.sin(a) < 0) {
      this.figure.sendToBack(this.handL);
      this.figure.sendToBack(this.handR);
    } else {
      this.figure.bringToTop(this.handL);
      this.figure.bringToTop(this.handR);
    }
  }

  // Shambling walk + attack lunge, then place the view.
  sync(delta = 0, moving = false) {
    if (moving) this.walkPhase += (delta / 1000) * 9 * this.speedScale;
    const sway = moving ? Math.sin(this.walkPhase) : 0;
    this.figure.setPosition(this.lunge.x, this.lunge.y - Math.abs(sway) * 1.5);
    this.figure.rotation = sway * 0.09;
    this.view
      .setPosition(this.x + this.knockOffset.x, this.y + this.knockOffset.y)
      .setDepth(this.y + this.radius * 0.8); // y-sort by the feet
  }

  // Quick jab towards a point (an attack landed).
  lungeAt(x, y) {
    const a = Math.atan2(y - this.y, x - this.x);
    const d = CONFIG.ZOMBIE.LUNGE_DISTANCE;
    this.scene.tweens.killTweensOf(this.lunge);
    this.lunge.x = 0;
    this.lunge.y = 0;
    this.scene.tweens.add({
      targets: this.lunge,
      x: Math.cos(a) * d,
      y: Math.sin(a) * d,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  // Returns true if the hit landed.
  takeHit(damage) {
    if (!this.alive) return false;
    this.health.damage(damage);
    this.flash();
    if (this.health.isDead) {
      this.die();
    } else {
      this.bar.setVisible(true);
      this.barFill.width = CONFIG.ZOMBIE.HEALTH_BAR.WIDTH * this.health.ratio;
    }
    return true;
  }

  flash() {
    this.flashShapes.forEach((s) => s.setTintFill(0xffffff));
    this.flashEvent?.remove();
    this.flashEvent = this.scene.time.delayedCall(CONFIG.ZOMBIE.FLASH_DURATION, () => {
      if (this.alive) this.flashShapes.forEach((s) => s.clearTint());
    });
  }

  // An arrow hit it along (dx, dy) (unit vector): the sprite jolts back and
  // springs home. Visual only, so its real position, and therefore targeting
  // and tower balance, is unchanged.
  knockback(dx, dy) {
    const K = VISUALS.KNOCKBACK;
    const o = this.knockOffset;
    this.scene.tweens.killTweensOf(o);
    o.x = dx * K.DISTANCE;
    o.y = dy * K.DISTANCE;
    this.scene.tweens.add({ targets: o, x: 0, y: 0, duration: K.DURATION, ease: 'Quad.easeOut' });
  }

  // Pop: swell and fade, with a green (blood-free) splat puff.
  die() {
    const Z = CONFIG.ZOMBIE;
    this.alive = false;
    this.vx = 0;
    this.vy = 0;
    this.emerging = false;
    this.bar.setVisible(false);
    this.scene.tweens.killTweensOf([this.lunge, this.view]);
    this.view.setAlpha(1);
    this.scene.tweens.add({
      targets: this.view,
      scaleX: 1.45,
      scaleY: 1.2,
      alpha: 0,
      duration: Z.DEATH_DURATION,
      ease: 'Quad.easeOut',
      onComplete: () => this.view.destroy(),
    });
    this.scene.fx?.zombieDeath(this.x, this.y);
    this.onDeath?.(this);
  }
}

// Body and hand circles (fill + outline), drawn once.
function zombieTextures(scene, r) {
  if (scene.textures.exists('zombie-body')) return;
  const Z = CONFIG.ZOMBIE;
  const circle = (key, radius, line) => {
    const size = Math.ceil(radius * 2 + line + 2);
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(Z.COLOR, 1).fillCircle(size / 2, size / 2, radius);
    g.lineStyle(line, Z.OUTLINE_COLOR, 1).strokeCircle(size / 2, size / 2, radius);
    g.generateTexture(key, size, size);
    g.destroy();
  };
  circle('zombie-body', r, 3);
  circle('zombie-hand', r * 0.32, 2);
}
