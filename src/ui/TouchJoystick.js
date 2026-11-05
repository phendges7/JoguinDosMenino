import Phaser from 'phaser';
import { VISUALS } from '../visuals.js';

// Floating virtual joystick: put a thumb down anywhere (except on a button),
// drag towards where the player should go, lift to stop. The further the drag
// (up to FULL_SPEED_AT of the ring), the faster the player runs. Dragging past
// the ring pulls the joystick along, so it never gets "stuck".
//
// Writes into `moveInput` ({ active, x, y, strength }), which the Player reads.
// Lives in the UI scene, so pointer coordinates are screen pixels.
export class TouchJoystick {
  constructor(scene, moveInput) {
    const T = VISUALS.TOUCH;
    this.scene = scene;
    this.moveInput = moveInput;
    this.pointerId = null;
    this.origin = { x: 0, y: 0 };

    const ring = scene.add.graphics();
    ring.fillStyle(T.BASE_COLOR, T.BASE_ALPHA).fillCircle(0, 0, T.RADIUS);
    ring.lineStyle(3, T.BASE_COLOR, T.RING_ALPHA).strokeCircle(0, 0, T.RADIUS);
    this.knob = scene.add.circle(0, 0, T.KNOB_RADIUS, T.KNOB_COLOR, T.KNOB_ALPHA)
      .setStrokeStyle(2, 0x000000, 0.25);
    this.container = scene.add.container(0, 0, [ring, this.knob]).setDepth(50).setVisible(false);

    const input = scene.input;
    input.on('pointerdown', this.onDown, this);
    input.on('pointermove', this.onMove, this);
    input.on('pointerup', this.onUp, this);
    input.on('pointerupoutside', this.onUp, this);
    input.on('gameout', this.release, this);
    scene.events.once('shutdown', () => {
      input.off('pointerdown', this.onDown, this);
      input.off('pointermove', this.onMove, this);
      input.off('pointerup', this.onUp, this);
      input.off('pointerupoutside', this.onUp, this);
      input.off('gameout', this.release, this);
      this.reset();
    });
  }

  onDown(pointer, over) {
    if (this.pointerId !== null) return; // already steering with another finger
    if (over.length > 0) return; // started on a button
    if (!pointer.wasTouch && !VISUALS.TOUCH.MOUSE_DRAG) return;
    this.pointerId = pointer.id;
    this.origin.x = pointer.x;
    this.origin.y = pointer.y;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setPosition(pointer.x, pointer.y).setAlpha(1).setVisible(true);
    this.knob.setPosition(0, 0);
  }

  onMove(pointer) {
    if (pointer.id !== this.pointerId || !pointer.isDown) return;
    const T = VISUALS.TOUCH;
    let dx = pointer.x - this.origin.x;
    let dy = pointer.y - this.origin.y;
    let d = Math.hypot(dx, dy);
    if (T.FOLLOW && d > T.RADIUS) {
      // drag the base along behind the thumb
      const over = d - T.RADIUS;
      this.origin.x += (dx / d) * over;
      this.origin.y += (dy / d) * over;
      this.container.setPosition(this.origin.x, this.origin.y);
      dx = pointer.x - this.origin.x;
      dy = pointer.y - this.origin.y;
      d = T.RADIUS;
    }
    const reach = Math.min(d, T.RADIUS);
    this.knob.setPosition(d > 0 ? (dx / d) * reach : 0, d > 0 ? (dy / d) * reach : 0);

    const m = this.moveInput;
    if (d <= T.DEADZONE) {
      m.active = false;
      m.strength = 0;
      return;
    }
    const full = T.RADIUS * T.FULL_SPEED_AT;
    const t = Phaser.Math.Clamp((d - T.DEADZONE) / (full - T.DEADZONE), 0, 1);
    m.active = true;
    m.x = dx / d;
    m.y = dy / d;
    m.strength = T.MIN_STRENGTH + (1 - T.MIN_STRENGTH) * t;
  }

  onUp(pointer) {
    if (pointer.id === this.pointerId) this.release();
  }

  release() {
    if (this.pointerId === null) return;
    this.reset();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: VISUALS.TOUCH.FADE_DURATION,
      onComplete: () => this.container.setVisible(false),
    });
  }

  reset() {
    this.pointerId = null;
    const m = this.moveInput;
    m.active = false;
    m.strength = 0;
  }
}
