import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Player } from '../entities/Player.js';
import { Backpack } from '../entities/Backpack.js';
import { Inventory } from '../systems/Inventory.js';
import { ResourceManager } from '../systems/ResourceManager.js';
import { Gatherer } from '../systems/Gatherer.js';
import { BuildManager } from '../systems/BuildManager.js';
import { Base } from '../entities/Base.js';
import { Road } from '../entities/Road.js';
import { Fence } from '../entities/Fence.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const W = CONFIG.WORLD;
    this.physics.world.setBounds(0, 0, W.WIDTH, W.HEIGHT);
    const ground = this.drawWorld();

    this.inventory = new Inventory();
    this.registry.set('inventory', this.inventory);

    this.base = new Base(this, W.WIDTH / 2, W.HEIGHT / 2);
    this.road = new Road(this, this.base);
    this.bakeGround([ground, this.road.graphics]);
    this.player = new Player(this, this.base.x, this.base.y);
    this.fence = new Fence(this, this.base, this.road, this.player);
    this.backpack = new Backpack(this, this.player, this.inventory);

    this.resources = new ResourceManager(this, this.base, this.road);
    this.resources.spawnAll();
    if (this.resources.colliders) {
      this.physics.add.collider(this.player.sprite, this.resources.colliders);
    }

    // A landed hit sends items flying to the backpack; they count once they arrive.
    this.gatherer = new Gatherer(this, this.player, this.resources, (node, type, amount) => {
      for (let i = 0; i < amount; i++) {
        this.backpack.flyIn(node.x, node.y, type, () => this.inventory.add(type, 1));
      }
    });

    this.builds = new BuildManager(this, {
      player: this.player,
      inventory: this.inventory,
      backpack: this.backpack,
      base: this.base,
      resources: this.resources,
      road: this.road,
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W.WIDTH, W.HEIGHT);
    cam.startFollow(this.player.sprite, true, CONFIG.CAMERA.FOLLOW_LERP, CONFIG.CAMERA.FOLLOW_LERP);

    this.scene.launch('UIScene');
  }

  // Graphics objects are re-drawn command by command every frame. The ground
  // and road never change, so draw them once into a single texture instead.
  bakeGround(graphicsList) {
    const W = CONFIG.WORLD;
    const max = this.renderer.getMaxTextureSize?.() ?? Infinity;
    if (W.WIDTH > max || W.HEIGHT > max) return; // GPU too small: keep live graphics
    const rt = this.add.renderTexture(0, 0, W.WIDTH, W.HEIGHT).setOrigin(0).setDepth(-1000);
    rt.draw(graphicsList);
    graphicsList.forEach((g) => g.destroy());
  }

  drawWorld() {
    const W = CONFIG.WORLD;
    const g = this.add.graphics().setDepth(-1000);

    g.fillStyle(W.BG_COLOR, 1).fillRect(0, 0, W.WIDTH, W.HEIGHT);

    g.fillStyle(W.GRASS_TUFT_COLOR, 1);
    for (let i = 0; i < W.GRASS_TUFTS; i++) {
      const x = Phaser.Math.Between(0, W.WIDTH);
      const y = Phaser.Math.Between(0, W.HEIGHT);
      g.fillRect(x, y, 3, 6);
      g.fillRect(x + 4, y + 2, 3, 4);
    }

    g.lineStyle(1, W.GRID_COLOR, 1);
    for (let x = 0; x <= W.WIDTH; x += W.GRID_SIZE) g.lineBetween(x, 0, x, W.HEIGHT);
    for (let y = 0; y <= W.HEIGHT; y += W.GRID_SIZE) g.lineBetween(0, y, W.WIDTH, y);

    g.lineStyle(8, 0x2b4a22, 1).strokeRect(0, 0, W.WIDTH, W.HEIGHT);
    return g;
  }

  update(time, delta) {
    this.player.update(delta);
    this.gatherer.update(delta);
    this.builds.update(delta);
    this.fence.update(delta);
  }
}
