import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { VISUALS } from '../visuals.js';
import { softShadow } from '../effects/textures.js';

// Placeholder art for each node type, as Graphics commands in local
// coordinates (0, 0 = node centre). Same shapes as before; they are drawn once
// per type into a texture (see nodeTexture) because ~140 nodes made of many
// vector circles were the most expensive thing to render every frame.
function paintNode(g, type, r) {
  const circle = (x, y, rr, c) => g.fillStyle(c, 1).fillCircle(x, y, rr);
  switch (type) {
    case 'tree':
      g.fillStyle(0x6d4425, 1).fillRect(-r * 0.19, 0, r * 0.38, r * 0.8);
      circle(-r * 0.42, -r * 0.05, r * 0.68, 0x2a6e2e);
      circle(r * 0.42, -r * 0.05, r * 0.68, 0x2a6e2e);
      circle(0, -r * 0.45, r * 0.75, 0x2e7d32);
      circle(-r * 0.25, -r * 0.6, r * 0.38, 0x43a047);
      circle(r * 0.35, -r * 0.2, r * 0.22, 0x4caf50);
      break;
    case 'stone':
      circle(0, 0, r, 0x7d7d7d);
      circle(-r * 0.25, -r * 0.3, r * 0.55, 0xa9a9a9);
      circle(r * 0.4, r * 0.25, r * 0.3, 0x6a6a6a);
      break;
    case 'gold':
      circle(0, 0, r, 0xc9971a);
      circle(-r * 0.25, -r * 0.3, r * 0.55, 0xf2c94c);
      circle(r * 0.35, r * 0.3, r * 0.25, 0xfff1a8);
      break;
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}

// Texture key for a node type, generated on first use. The canvas is 2.6r
// square with the node centre in the middle.
function nodeTexture(scene, type, r) {
  const key = `node-${type}`;
  if (!scene.textures.exists(key)) {
    const half = Math.ceil(r * 1.3);
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.translateCanvas(half, half);
    paintNode(g, type, r);
    g.generateTexture(key, half * 2, half * 2);
    g.destroy();
  }
  return key;
}

export class ResourceNode {
  constructor(scene, type, x, y, colliderGroup, { growIn = false } = {}) {
    this.scene = scene;
    this.type = type;
    this.def = CONFIG.NODES[type];
    this.resource = this.def.resource;
    this.tool = this.def.tool;
    this.radius = this.def.radius;
    this.x = x;
    this.y = y;
    this.maxHealth = this.def.health;
    this.health = this.maxHealth;
    this.active = true;

    const r = this.radius;
    const S = VISUALS.SHADOW.NODE;
    const shadow = softShadow(scene, 4, r * S.Y_FACTOR, r * S.W_FACTOR, r * S.H_FACTOR, S.ALPHA);
    this.image = scene.add.image(0, 0, nodeTexture(scene, type, r));
    this.view = scene.add.container(x, y, [shadow, this.image]).setDepth(y + r * 0.6); // y-sort by the base

    this.collider = null;
    if (colliderGroup) {
      this.collider = scene.add.circle(x, y, this.def.colliderRadius, 0x000000, 0);
      colliderGroup.add(this.collider);
      this.collider.body.setCircle(this.def.colliderRadius);
    }

    this.destroyed = false;
    if (growIn) {
      this.view.setScale(0);
      scene.tweens.add({ targets: this.view, scale: 1, duration: 350, ease: 'Back.easeOut' });
    }
  }

  // Permanently removes the node (e.g. the base grew over it).
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.active = false;
    this.collider?.destroy();
    this.scene.tweens.killTweensOf(this.view);
    this.scene.tweens.add({
      targets: this.view,
      scale: 0,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeIn',
      onComplete: () => this.view.destroy(),
    });
  }

  // Applies damage. Returns true if the hit landed.
  hit(damage) {
    if (!this.active) return false;
    this.health = Math.max(0, this.health - damage);
    this.flash();
    if (this.health <= 0) {
      this.deplete();
    } else {
      const N = CONFIG.NODE;
      const target = N.MIN_SCALE + (1 - N.MIN_SCALE) * (this.health / this.maxHealth);
      this.scene.tweens.killTweensOf(this.view);
      this.view.setScale(target * 0.85);
      this.scene.tweens.add({ targets: this.view, scale: target, duration: 160, ease: 'Back.easeOut' });
    }
    return true;
  }

  flash() {
    this.image.setTintFill(0xffffff);
    this.scene.time.delayedCall(CONFIG.NODE.FLASH_DURATION, () => {
      if (this.destroyed) return;
      this.image.clearTint();
    });
  }

  deplete() {
    this.active = false;
    if (this.collider) this.collider.body.enable = false;
    this.scene.tweens.killTweensOf(this.view);
    this.scene.tweens.add({
      targets: this.view,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => this.view.setVisible(false),
    });
    this.scene.time.delayedCall(this.def.respawnTime, () => this.tryRespawn());
  }

  tryRespawn() {
    if (this.destroyed) return;
    // Wait if the player is standing where the node would reappear.
    const player = this.scene.player;
    const gap = Phaser.Math.Distance.Between(player.x, player.y, this.x, this.y) - player.radius - this.radius;
    if (gap < CONFIG.NODE.RESPAWN_PLAYER_CLEARANCE) {
      this.scene.time.delayedCall(CONFIG.NODE.RESPAWN_RETRY, () => this.tryRespawn());
      return;
    }
    this.health = this.maxHealth;
    this.active = true;
    if (this.collider) this.collider.body.enable = true;
    this.view.setVisible(true).setAlpha(1).setScale(0);
    this.scene.tweens.add({ targets: this.view, scale: 1, duration: 350, ease: 'Back.easeOut' });
  }
}
