import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { CharacterView } from './CharacterView.js';
import { Tool } from './Tool.js';
import { Backpack } from './Backpack.js';
import { Inventory } from '../systems/Inventory.js';
import { Health } from '../components/Health.js';

// A lumberjack or miner. Built from the same parts as the player: a
// CharacterView in the hut type's colours, a Tool, and a Backpack that mirrors
// its own small Inventory (what it's carrying). WorkerManager runs the AI;
// this class is the body.
export class Worker {
  constructor(scene, hut, x, y) {
    const W = CONFIG.WORKER;
    this.scene = scene;
    this.hut = hut;
    this.type = hut.type;
    this.tool = null;
    this.radius = W.RADIUS;
    this.x = x;
    this.y = y;
    this.alive = true;
    this.state = 'seek';
    this.node = null;          // node it's heading to / gathering
    this.incoming = 0;         // items flying into its pack
    this.facing = new Phaser.Math.Vector2(0, 1);
    this.speedNow = 0;
    this.health = new Health(W.MAX_HEALTH);
    this.lastDangerAt = -Infinity;
    this.timer = 0;

    this.view = scene.add.container(x, y);
    this.character = new CharacterView(scene, CONFIG.HUTS[this.type].LOOK);
    this.backSlot = this.character.backSlot;
    this.tool = new Tool(scene, W.RADIUS);
    this.tool.container.setPosition(0, -10);
    this.view.add([this.character.container, this.tool.container]);

    const HB = W.HEALTH_BAR;
    this.barFill = scene.add.rectangle(-HB.WIDTH / 2, -HB.OFFSET, HB.WIDTH, HB.HEIGHT, HB.COLOR).setOrigin(0, 0.5);
    this.bar = scene.add.container(0, 0, [
      scene.add.rectangle(0, -HB.OFFSET, HB.WIDTH + 2, HB.HEIGHT + 2, 0x000000, 0.65),
      this.barFill,
    ]).setVisible(false);
    this.view.add(this.bar);

    this.carry = new Inventory();
    this.backpack = new Backpack(scene, this, this.carry);

    scene.fx.popIn(this.view, { dust: { x, y: y + W.RADIUS } });
  }

  get carried() {
    return Object.values(this.carry.counts).reduce((a, b) => a + b, 0);
  }
  // Carried plus still in the air on the way to the pack.
  get load() { return this.carried + this.incoming; }

  attachToBack(container) {
    this.backSlot.add(container);
  }

  faceTowards(x, y) {
    if (x === this.x && y === this.y) return;
    this.facing.set(x - this.x, y - this.y).normalize();
  }

  sync(delta) {
    this.view.setPosition(this.x, this.y).setDepth(this.y + this.radius); // y-sort by the feet
    const f = this.facing;
    const dir = Math.abs(f.x) > Math.abs(f.y) ? (f.x > 0 ? 'right' : 'left') : (f.y > 0 ? 'down' : 'up');
    this.character.setFacing(dir);
    this.character.update(delta, this.speedNow);
  }

  refreshBar() {
    this.bar.setVisible(this.alive && !this.health.isFull);
    this.barFill.width = CONFIG.WORKER.HEALTH_BAR.WIDTH * this.health.ratio;
  }

  heal(amount) {
    this.health.heal(amount);
    this.refreshBar();
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health.damage(amount);
    this.refreshBar();
    // blink
    this.scene.tweens.killTweensOf(this.character.container);
    this.character.container.setAlpha(0.35);
    this.scene.tweens.add({ targets: this.character.container, alpha: 1, duration: 160 });
    if (this.health.isDead) this.die();
  }

  die() {
    this.alive = false;
    this.backpack.detach();
    this.bar.setVisible(false);
    this.scene.tweens.killTweensOf(this.view);
    this.scene.tweens.add({
      targets: this.view,
      alpha: 0,
      scaleY: 0.3,
      duration: 350,
      ease: 'Quad.easeIn',
      onComplete: () => this.view.destroy(),
    });
    this.onDeath?.(this);
  }
}
