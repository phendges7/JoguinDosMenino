import { VISUALS } from '../visuals.js';

const range = ([min, max]) => ({ min, max });
const fade = (start = 1) => ({ start, end: 0 });

// One place for "juice": pooled particle emitters, pooled floating texts and
// pop-in tweens. Created by GameScene as `scene.fx`.
// Each emitter is created once and fired with explode(), so effects cost no
// allocations per hit and every emitter is capped (PARTICLES.MAX_PER_EMITTER).
export class Effects {
  constructor(scene) {
    this.scene = scene;
    const P = VISUALS.PARTICLES;
    const D = VISUALS.DEPTH;
    const make = (texture, cfg, depth = D.FX) => scene.add
      .particles(0, 0, texture, { emitting: false, maxParticles: P.MAX_PER_EMITTER, ...cfg })
      .setDepth(depth);
    const up = { min: 200, max: 340 }; // upwards fan (y grows downwards)
    const all = { min: 0, max: 360 };

    this.chips = make('fx-chip', {
      lifespan: range(P.CHIPS.LIFESPAN), speed: range(P.CHIPS.SPEED), angle: up,
      gravityY: P.CHIPS.GRAVITY, rotate: all, scale: { start: P.CHIPS.SCALE[0], end: P.CHIPS.SCALE[1] },
      alpha: fade(), tint: P.CHIPS.TINTS,
    });
    const spark = (tints) => make('fx-spark', {
      lifespan: range(P.SPARKS.LIFESPAN), speed: range(P.SPARKS.SPEED), angle: up,
      gravityY: P.SPARKS.GRAVITY, rotate: all, scale: { start: P.SPARKS.SCALE[0], end: P.SPARKS.SCALE[1] },
      alpha: fade(), tint: tints, blendMode: 'ADD',
    });
    this.sparksStone = spark(P.SPARKS.STONE_TINTS);
    this.sparksGold = spark(P.SPARKS.GOLD_TINTS);
    const dust = (tints, speed = P.DUST.SPEED) => make('fx-soft', {
      lifespan: range(P.DUST.LIFESPAN), speed: range(speed), angle: all,
      scale: { start: P.DUST.SCALE[0], end: P.DUST.SCALE[1] }, alpha: fade(P.DUST.ALPHA), tint: tints,
    });
    this.dustStone = dust(P.DUST.STONE_TINTS);
    this.dustGold = dust(P.DUST.GOLD_TINTS);
    this.dustBuild = dust(P.DUST.BUILD_TINTS, [P.DUST.SPEED[0] * 2, P.DUST.SPEED[1] * 2.5]);
    this.splat = make('fx-dot', {
      lifespan: range(P.SPLAT.LIFESPAN), speed: range(P.SPLAT.SPEED), angle: all,
      gravityY: P.SPLAT.GRAVITY, scale: { start: P.SPLAT.SCALE[0], end: P.SPLAT.SCALE[1] },
      alpha: fade(), tint: P.SPLAT.TINTS,
    });
    const WD = P.WALK_DUST;
    this.walkDust = make('fx-soft', {
      lifespan: range(WD.LIFESPAN), speed: range(WD.SPEED), angle: up,
      scale: { start: WD.SCALE[0], end: WD.SCALE[1] }, alpha: fade(WD.ALPHA), tint: WD.TINTS,
    }, D.WALK_DUST);

    this.emitters = [this.chips, this.sparksStone, this.sparksGold, this.dustStone, this.dustGold,
      this.dustBuild, this.splat, this.walkDust];
    this.textPool = [];
    this.walkTimer = 0;
  }

  // Total live particles (for performance checks).
  get liveParticles() {
    return this.emitters.reduce((n, e) => n + e.getAliveParticleCount(), 0);
  }

  // Freeze / unfreeze particles (hit-stop).
  setTimeScale(s) {
    for (const e of this.emitters) e.timeScale = s;
  }

  // A gathering hit landed on a node: chips for trees, sparks + dust for rocks.
  nodeHit(node) {
    const P = VISUALS.PARTICLES;
    const x = node.x;
    const y = node.y - node.radius * 0.2;
    if (node.type === 'tree') {
      this.chips.explode(P.CHIPS.COUNT, x, y);
    } else {
      const gold = node.type === 'gold';
      (gold ? this.sparksGold : this.sparksStone).explode(P.SPARKS.COUNT, x, y);
      (gold ? this.dustGold : this.dustStone).explode(P.DUST.COUNT, x, node.y + node.radius * 0.4);
    }
  }

  zombieDeath(x, y) {
    this.splat.explode(VISUALS.PARTICLES.SPLAT.COUNT, x, y);
  }

  buildDust(x, y) {
    this.dustBuild.explode(VISUALS.PARTICLES.DUST.BUILD_COUNT, x, y);
  }

  // Dust puffs behind a walking character. speed in px/s.
  walk(entity, speed, delta) {
    const WD = VISUALS.PARTICLES.WALK_DUST;
    if (speed < WD.MIN_SPEED) {
      this.walkTimer = 0;
      return;
    }
    this.walkTimer -= delta * (speed / 240);
    if (this.walkTimer > 0) return;
    this.walkTimer = WD.INTERVAL;
    this.walkDust.explode(1, entity.x + (Math.random() - 0.5) * 8, entity.y + WD.OFFSET_Y);
  }

  // "+1 Wood" style text that rises and fades. Texts are pooled.
  floatText(x, y, message, color) {
    const F = VISUALS.FLOAT_TEXT;
    let t = this.textPool.pop();
    if (!t) {
      t = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'Arial', fontSize: `${F.FONT_SIZE}px`, fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(VISUALS.DEPTH.FLOAT_TEXT);
    }
    t.setText(message).setColor(color).setPosition(x, y).setAlpha(1).setScale(0.5).setVisible(true);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t,
      y: y - F.RISE,
      alpha: 0,
      duration: F.DURATION,
      ease: 'Quad.easeOut',
      onComplete: () => {
        t.setVisible(false);
        this.textPool.push(t);
      },
    });
  }

  // Overshooting scale-in with a little squash when it lands.
  popIn(target, { dust = null } = {}) {
    const P = VISUALS.POP;
    this.scene.tweens.killTweensOf(target);
    target.setScale(0);
    this.scene.tweens.add({
      targets: target,
      scale: 1,
      duration: P.DURATION,
      ease: 'Back.easeOut',
      easeParams: [P.OVERSHOOT],
      onComplete: () => {
        this.scene.tweens.add({
          targets: target,
          scaleX: 1 + P.SETTLE_SQUASH,
          scaleY: 1 - P.SETTLE_SQUASH,
          duration: P.SETTLE_DURATION,
          yoyo: true,
          ease: 'Sine.easeOut',
        });
      },
    });
    if (dust) this.buildDust(dust.x, dust.y);
  }
}
