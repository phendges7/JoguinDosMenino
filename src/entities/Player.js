import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Tool } from './Tool.js';
import { CharacterView } from './CharacterView.js';

// The player is two objects:
//  - `sprite`: an invisible physics circle that moves and collides
//  - `view`:   a container holding the visuals (character, tool, backpack)
// The view is synced to the sprite after physics runs each frame.
export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    const P = CONFIG.PLAYER;
    this.radius = P.RADIUS;

    this.sprite = scene.add.circle(x, y, P.RADIUS, 0x000000, 0);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body;
    this.body.setCircle(P.RADIUS);
    this.body.setCollideWorldBounds(true);

    this.view = scene.add.container(x, y);
    this.character = new CharacterView(scene, P.LOOK);
    this.backSlot = this.character.backSlot;
    this.tool = new Tool(scene, P.RADIUS);
    this.tool.container.setPosition(0, -10); // swings from shoulder height
    this.view.add([this.character.container, this.tool.container]);

    this.facing = new Phaser.Math.Vector2(0, 1);
    this.alive = true; // set by Combat; a dead player ignores input
    this.moveInput = null; // { active, x, y, strength } written by the touch joystick

    this.keys = scene.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
    });

    scene.events.on('postupdate', this.syncView, this);
    scene.events.once('shutdown', () => scene.events.off('postupdate', this.syncView, this));
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  attachToBack(container) {
    this.backSlot.add(container);
  }

  update(delta) {
    if (!this.alive) {
      this.body.setVelocity(0, 0);
      return;
    }
    const k = this.keys;
    const dir = new Phaser.Math.Vector2(
      (k.right.isDown || k.right2.isDown ? 1 : 0) - (k.left.isDown || k.left2.isDown ? 1 : 0),
      (k.down.isDown || k.down2.isDown ? 1 : 0) - (k.up.isDown || k.up2.isDown ? 1 : 0),
    );
    // No keys held: steer with the touch joystick (analog: strength 0..1).
    let strength = 1;
    const touch = this.moveInput;
    if (dir.lengthSq() === 0 && touch?.active) {
      dir.set(touch.x, touch.y);
      strength = touch.strength;
    }
    const moving = dir.lengthSq() > 0 && strength > 0;
    if (moving) dir.normalize().scale(CONFIG.PLAYER.SPEED * strength);

    // Exponential smoothing towards target velocity: frame-rate independent.
    const rate = moving ? CONFIG.PLAYER.ACCELERATION : CONFIG.PLAYER.DECELERATION;
    const t = 1 - Math.exp(-rate * (delta / 1000));
    const v = this.body.velocity;
    let vx = Phaser.Math.Linear(v.x, dir.x, t);
    let vy = Phaser.Math.Linear(v.y, dir.y, t);
    if (!moving && Math.abs(vx) < 2 && Math.abs(vy) < 2) { vx = 0; vy = 0; }
    this.body.setVelocity(vx, vy);

    if (moving) this.facing.copy(dir).normalize();
  }

  // Move instantly (respawn).
  teleport(x, y) {
    this.body.reset(x, y);
    this.view.setPosition(x, y);
  }

  // Turn to look at a point (used while gathering).
  faceTowards(x, y) {
    this.facing.set(x - this.x, y - this.y).normalize();
  }

  syncView() {
    this.view.setPosition(this.sprite.x, this.sprite.y);
    this.view.setDepth(this.sprite.y + this.radius); // y-sort by the feet

    const f = this.facing;
    const dir = Math.abs(f.x) > Math.abs(f.y) ? (f.x > 0 ? 'right' : 'left') : (f.y > 0 ? 'down' : 'up');
    this.character.setFacing(dir);
    this.character.update(this.scene.game.loop.delta, this.body.velocity.length());
  }
}
