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
import { BowView } from '../entities/BowView.js';
import { ZombieManager } from '../systems/ZombieManager.js';
import { ZombieSpawner } from '../systems/ZombieSpawner.js';
import { Projectiles } from '../systems/Projectiles.js';
import { Combat } from '../systems/Combat.js';
import { Shooter } from '../components/Shooter.js';
import { TowerManager } from '../systems/TowerManager.js';
import { setupDebugKeys } from '../systems/DebugKeys.js';
import { WorkerManager } from '../systems/WorkerManager.js';
import { VISUALS } from '../visuals.js';
import { ensureTextures } from '../effects/textures.js';
import { Effects } from '../effects/Effects.js';
import { cameraZoom, worldTextScale } from '../ui/screen.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const W = CONFIG.WORLD;
    this.physics.world.setBounds(0, 0, W.WIDTH, W.HEIGHT);
    ensureTextures(this);
    this.fx = new Effects(this);
    // World text grows when a small screen zooms the camera out (read by pads, toasts...).
    this.worldTextScale = worldTextScale(cameraZoom(this.scale.width, this.scale.height));
    this.hitStopLeft = 0;
    this.lastHitStopAt = -Infinity;
    const ground = this.drawWorld();

    this.inventory = new Inventory();
    this.registry.set('inventory', this.inventory);

    this.base = new Base(this, W.WIDTH / 2, W.HEIGHT / 2);
    this.road = new Road(this, this.base);
    this.bakeGround([ground, this.road.graphics]);
    this.player = new Player(this, this.base.x, this.base.y);
    // Written by the UI scene's touch joystick, read by the player.
    this.moveInput = { active: false, x: 0, y: 0, strength: 0 };
    this.player.moveInput = this.moveInput;
    this.registry.set('moveInput', this.moveInput);
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
      this.fx.floatText(node.x, node.y - node.radius - 8, `+${amount} ${CONFIG.RESOURCES[type].label}`,
        VISUALS.FLOAT_TEXT.COLORS[type] ?? '#ffffff');
    });

    // --- Combat ---
    this.zombies = new ZombieManager(this, {
      player: this.player, base: this.base, resources: this.resources, road: this.road,
    });
    this.spawner = new ZombieSpawner(this, this.zombies, this.road);
    this.zombies.on('killed', this.onZombieKilled, this);
    this.projectiles = new Projectiles(this, this.zombies);
    this.towers = new TowerManager(this, {
      player: this.player, zombies: this.zombies, projectiles: this.projectiles,
    });
    this.zombies.setTowers(this.towers);
    this.workers = new WorkerManager(this, {
      player: this.player,
      inventory: this.inventory,
      backpack: this.backpack,
      base: this.base,
      fence: this.fence,
      resources: this.resources,
      zombies: this.zombies,
    });
    this.zombies.setWorkers(this.workers);

    this.builds = new BuildManager(this, {
      workers: this.workers,
      player: this.player,
      inventory: this.inventory,
      backpack: this.backpack,
      base: this.base,
      resources: this.resources,
      road: this.road,
      towers: this.towers,
    });
    this.combat = new Combat(this, {
      player: this.player,
      base: this.base,
      zombies: this.zombies,
      inventory: this.inventory,
    });
    this.registry.set('combat', this.combat);
    this.combat.on('game-over', this.onGameOver, this);

    this.bowView = new BowView(this, this.player);
    this.bow = new Shooter(this, {
      source: this.player,
      stats: CONFIG.BOW,
      targets: this.zombies,
      projectiles: this.projectiles,
      muzzleOffset: this.player.radius,
      canFire: () => this.player.alive,
      onFire: (target, angle) => this.bowView.onFire(angle),
    });

    const debugActions = setupDebugKeys(this, {
      player: this.player, inventory: this.inventory, zombies: this.zombies, road: this.road,
      workers: this.workers, base: this.base,
    });
    this.registry.set('debugActions', debugActions);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W.WIDTH, W.HEIGHT);
    cam.startFollow(this.player.sprite, true, CONFIG.CAMERA.FOLLOW_LERP, CONFIG.CAMERA.FOLLOW_LERP);
    this.applyScreenSize();
    this.scale.on('resize', this.applyScreenSize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyScreenSize, this));

    this.scene.launch('UIScene');
  }

  // Phones see less of the world at 1:1, so zoom out to keep about the same view,
  // and scale world text up to stay readable. Re-run on resize / rotation.
  applyScreenSize() {
    const zoom = cameraZoom(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(zoom);
    this.worldTextScale = worldTextScale(zoom);
    this.builds.pads.forEach((p) => p.setTextScale(this.worldTextScale));
    this.workers.huts.forEach((h) => h.stockpile.setTextScale(this.worldTextScale));
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

  // Ground: base colour, soft noise blotches, a faint grid, then scattered
  // grass tufts, pebbles and flowers. All decoration: nothing here blocks
  // movement, and it's baked into one texture with the road (bakeGround).
  drawWorld() {
    const W = CONFIG.WORLD;
    const V = VISUALS.GROUND;
    const M = Phaser.Math;
    const pick = (list) => list[M.Between(0, list.length - 1)];
    const rx = () => M.Between(0, W.WIDTH);
    const ry = () => M.Between(0, W.HEIGHT);
    const g = this.add.graphics().setDepth(-1000);

    g.fillStyle(W.BG_COLOR, 1).fillRect(0, 0, W.WIDTH, W.HEIGHT);

    for (let i = 0; i < V.NOISE_PATCHES; i++) {
      const x = rx();
      const y = ry();
      const r = M.Between(V.NOISE_RADIUS[0], V.NOISE_RADIUS[1]);
      const a = M.FloatBetween(V.NOISE_ALPHA[0], V.NOISE_ALPHA[1]);
      const c = pick(V.NOISE_COLORS);
      // three stacked circles = a soft-edged blotch
      g.fillStyle(c, a * 0.4).fillCircle(x, y, r);
      g.fillStyle(c, a * 0.35).fillCircle(x + r * 0.15, y - r * 0.1, r * 0.7);
      g.fillStyle(c, a * 0.3).fillCircle(x - r * 0.1, y + r * 0.1, r * 0.4);
    }

    g.lineStyle(1, W.GRID_COLOR, V.GRID_ALPHA);
    for (let x = 0; x <= W.WIDTH; x += W.GRID_SIZE) g.lineBetween(x, 0, x, W.HEIGHT);
    for (let y = 0; y <= W.HEIGHT; y += W.GRID_SIZE) g.lineBetween(0, y, W.WIDTH, y);

    // grass tufts: three little blades
    const tuftColors = [W.GRASS_TUFT_COLOR, ...V.TUFT_COLORS];
    for (let i = 0; i < W.GRASS_TUFTS; i++) {
      const x = rx();
      const y = ry();
      g.fillStyle(pick(tuftColors), 1);
      g.fillTriangle(x - 4, y, x - 2, y, x - 5, y - 6);
      g.fillTriangle(x - 1, y, x + 1, y, x, y - 8);
      g.fillTriangle(x + 2, y, x + 4, y, x + 5, y - 6);
    }
    // pebbles
    for (let i = 0; i < V.PEBBLES; i++) {
      const x = rx();
      const y = ry();
      const w = M.Between(4, 8);
      g.fillStyle(0x000000, 0.15).fillEllipse(x + 1, y + 2, w + 2, w * 0.6 + 1);
      g.fillStyle(pick(V.PEBBLE_COLORS), 1).fillEllipse(x, y, w, w * 0.65);
      g.fillStyle(0xffffff, 0.35).fillCircle(x - w * 0.15, y - w * 0.12, w * 0.15);
    }
    // flowers: four petals and a centre
    for (let i = 0; i < V.FLOWERS; i++) {
      const x = rx();
      const y = ry();
      g.fillStyle(0x2e5e22, 1).fillRect(x - 0.5, y, 1, 5);
      g.fillStyle(pick(V.FLOWER_COLORS), 1);
      g.fillCircle(x - 2, y, 1.8).fillCircle(x + 2, y, 1.8).fillCircle(x, y - 2, 1.8).fillCircle(x, y + 2, 1.8);
      g.fillStyle(0xffb300, 1).fillCircle(x, y, 1.2);
    }

    g.lineStyle(8, 0x2b4a22, 1).strokeRect(0, 0, W.WIDTH, W.HEIGHT);
    return g;
  }

  // Hit-stop: freeze the world for a few frames when a zombie dies close by.
  onZombieKilled(z) {
    const H = VISUALS.HITSTOP;
    const p = this.player;
    if (!p.alive || this.combat.gameOver) return;
    if (Phaser.Math.Distance.Between(z.x, z.y, p.x, p.y) > H.RADIUS) return;
    const now = performance.now();
    if (now - this.lastHitStopAt < H.COOLDOWN) return;
    this.lastHitStopAt = now;
    this.hitStopLeft = H.DURATION;
    this.setFrozen(true);
  }

  setFrozen(frozen) {
    if (frozen) this.physics.pause();
    else if (!this.combat.gameOver) this.physics.resume();
    this.tweens.timeScale = frozen ? 0 : 1;
    this.time.timeScale = frozen ? 0 : 1;
    this.fx.setTimeScale(frozen ? 0 : 1);
  }

  update(time, delta) {
    if (this.hitStopLeft > 0) {
      this.hitStopLeft -= delta;
      if (this.hitStopLeft > 0) return;
      this.setFrozen(false);
    }
    if (this.combat.gameOver) return;
    this.player.update(delta);
    if (this.player.alive) this.fx.walk(this.player, this.player.body.velocity.length(), delta);
    this.spawner.update(delta);
    this.zombies.update(delta);
    this.combat.update(delta);
    this.bow.update(delta);
    this.bowView.update(this.bow.target);
    this.towers.update(delta);
    this.workers.update(delta);
    this.projectiles.update(delta);
    if (this.player.alive) {
      this.gatherer.update(delta);
      this.builds.update(delta);
    }
    this.fence.update(delta);
  }

  // Base destroyed: stop spawning, let the last animations play, then freeze.
  // The UI scene shows the game over screen and restarts this scene.
  onGameOver() {
    this.spawner.stop();
    this.physics.pause();
    this.bowView.update(null);
    this.cameras.main.shake(400, 0.012);
    this.time.delayedCall(CONFIG.HEALTH.GAME_OVER_DELAY, () => this.scene.pause());
  }
}
