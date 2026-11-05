import Phaser from 'phaser';
import { CONFIG } from '../config.js';

// A small human drawn from shapes, seen from a slightly tilted top-down view.
// Faces 4 directions and has a walk cycle. Reusable for workers later:
// pass a different `look` (skin / hair / shirt / pants / shoes colours).
//
// Local coordinates: (0, 0) is the hips, feet are at about y = +15,
// top of the head at about y = -37.
const SHOULDER_Y = -14;
const HEAD_Y = -26;

export class CharacterView {
  constructor(scene, look) {
    this.scene = scene;
    this.look = look;
    this.dir = null;
    this.walkPhase = 0;
    this.walkAmount = 0;

    this.container = scene.add.container(0, 0);
    this.shadow = scene.add.ellipse(0, 14, 28, 9, 0x000000, 0.25);
    this.legL = this.makeLeg();
    this.legR = this.makeLeg();
    this.torso = scene.add.graphics();
    this.armL = this.makeArm();
    this.armR = this.makeArm();
    this.head = this.makeHead();
    this.backSlot = scene.add.container(0, 0); // backpack attaches here

    this.container.add([
      this.shadow, this.legL, this.legR, this.armL, this.armR, this.torso, this.head, this.backSlot,
    ]);
    this.setFacing('down');
  }

  makeLeg() {
    const L = this.look;
    return this.scene.add.container(0, 2, [
      this.scene.add.rectangle(0, 0, 7, 10, L.PANTS).setOrigin(0.5, 0),
      this.scene.add.rectangle(0, 9, 8, 4, L.SHOES).setOrigin(0.5, 0),
    ]);
  }

  makeArm() {
    const L = this.look;
    return this.scene.add.container(0, SHOULDER_Y, [
      this.scene.add.rectangle(0, 0, 6, 9, L.SHIRT).setOrigin(0.5, 0),
      this.scene.add.circle(0, 11, 3.2, L.SKIN),
    ]);
  }

  makeHead() {
    const L = this.look;
    const s = this.scene;
    const skinDark = Phaser.Display.Color.IntegerToColor(L.SKIN).darken(15).color;
    this.face = s.add.circle(0, 0, 11, L.SKIN).setStrokeStyle(1, skinDark);
    this.hairFull = s.add.circle(0, -1, 11.5, L.HAIR);          // seen from behind
    this.hairCap = s.add.ellipse(0, -6, 24, 12, L.HAIR);        // fringe on top
    this.hairSide = s.add.ellipse(0, -2, 13, 18, L.HAIR);       // back of head in profile
    this.eyeL = s.add.circle(-4, 1, 1.8, 0x1d1d1d);
    this.eyeR = s.add.circle(4, 1, 1.8, 0x1d1d1d);
    this.mouth = s.add.rectangle(0, 6, 4, 1.5, 0x8a4b3a);
    return s.add.container(0, HEAD_Y, [
      this.face, this.hairSide, this.hairFull, this.hairCap, this.eyeL, this.eyeR, this.mouth,
    ]);
  }

  drawTorso(width) {
    const L = this.look;
    const g = this.torso;
    g.clear();
    g.fillStyle(L.SHIRT, 1).fillRoundedRect(-width / 2, -17, width, 19, 6);
    g.fillStyle(Phaser.Display.Color.IntegerToColor(L.SHIRT).darken(20).color, 1)
      .fillRoundedRect(-width / 2, -3, width, 5, { tl: 0, tr: 0, bl: 4, br: 4 });
  }

  // Draw order back-to-front for the current facing.
  order(list) {
    list.forEach((child) => this.container.bringToTop(child));
  }

  setFacing(dir) {
    if (dir === this.dir) return;
    this.dir = dir;
    const side = dir === 'left' ? -1 : 1;
    const profile = dir === 'left' || dir === 'right';

    this.drawTorso(profile ? 15 : 22);
    this.hairFull.setVisible(dir === 'up');
    this.hairCap.setVisible(dir !== 'up');
    this.hairSide.setVisible(profile).setX(-side * 4);
    this.eyeL.setVisible(dir === 'down');
    this.mouth.setVisible(dir !== 'up').setX(profile ? side * 6 : 0);
    this.eyeR.setVisible(dir !== 'up').setX(profile ? side * 5 : 4);
    this.hairCap.setX(profile ? -side * 2 : 0);

    if (profile) {
      // armL is the far arm, armR the near arm
      this.armL.setX(-side * 1);
      this.armR.setX(side * 1);
      this.backSlot.setPosition(-side * 11, -12);
      this.order([this.shadow, this.armL, this.legL, this.legR, this.torso, this.backSlot, this.armR, this.head]);
    } else {
      this.armL.setX(-13);
      this.armR.setX(13);
      this.legL.setX(-5);
      this.legR.setX(5);
      this.armL.rotation = 0;
      this.armR.rotation = 0;
      if (dir === 'down') {
        // We see the front: the backpack is behind everything.
        this.backSlot.setPosition(0, -18);
        this.order([this.shadow, this.backSlot, this.legL, this.legR, this.torso, this.armL, this.armR, this.head]);
      } else {
        // We see the back: the backpack is the closest thing to us.
        this.backSlot.setPosition(0, -10);
        this.order([this.shadow, this.legL, this.legR, this.torso, this.armL, this.armR, this.head, this.backSlot]);
      }
    }
  }

  // speed in px/s; drives the walk cycle.
  update(delta, speed) {
    const moving = speed > 20;
    const k = 1 - Math.exp(-12 * (delta / 1000));
    this.walkAmount = Phaser.Math.Linear(this.walkAmount, moving ? 1 : 0, k);
    if (moving) {
      this.walkPhase += (delta / 1000) * CONFIG.PLAYER.STEP_RATE * (speed / CONFIG.PLAYER.SPEED);
    }
    const s = Math.sin(this.walkPhase) * this.walkAmount;
    const bob = Math.abs(s) * 1.5;

    if (this.dir === 'left' || this.dir === 'right') {
      const side = this.dir === 'left' ? -1 : 1;
      this.legL.setX(s * 4).setScale(1, 1);
      this.legR.setX(-s * 4).setScale(1, 1);
      this.armR.rotation = -s * 0.7 * side;
      this.armL.rotation = s * 0.7 * side;
    } else {
      this.legL.setScale(1, 1 + 0.3 * s);
      this.legR.setScale(1, 1 - 0.3 * s);
      this.armL.setScale(1, 1 - 0.25 * s);
      this.armR.setScale(1, 1 + 0.25 * s);
    }

    this.torso.y = -bob;
    this.head.y = HEAD_Y - bob;
    this.armL.y = SHOULDER_Y - bob;
    this.armR.y = SHOULDER_Y - bob;
  }
}
