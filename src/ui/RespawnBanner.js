import { CONFIG } from '../config.js';

// Centre-screen "You died" message with what was lost and a respawn countdown.
export class RespawnBanner {
  constructor(scene, combat) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setVisible(false);
    this.title = scene.add
      .text(0, 0, 'You died!', {
        fontFamily: 'Arial', fontSize: '44px', fontStyle: 'bold',
        color: '#ff5252', stroke: '#000000', strokeThickness: 6,
      })
      .setOrigin(0.5, 1);
    this.detail = scene.add
      .text(0, 10, '', {
        fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this.container.add([this.title, this.detail]);
    this.place();

    const onDied = (info) => this.show(info);
    const onRespawned = () => this.hide();
    combat.on('player-died', onDied);
    combat.on('player-respawned', onRespawned);
    scene.events.once('shutdown', () => {
      combat.off('player-died', onDied);
      combat.off('player-respawned', onRespawned);
    });
  }

  // Called by UIScene.layout() on start and on every resize.
  place() {
    const { width, height } = this.scene.scale;
    const k = this.scene.uiScale ?? 1;
    this.container.setScale(k).setPosition(width / 2, height * 0.4);
    this.detail.setWordWrapWidth((width - 32) / k);
  }

  show({ respawnIn, lost }) {
    const parts = Object.entries(lost).map(([type, n]) => `${n} ${CONFIG.RESOURCES[type].label}`);
    this.lostLine = parts.length ? `Dropped ${parts.join(', ')}` : 'Your backpack was empty';
    this.endsAt = this.scene.time.now + respawnIn;
    this.container.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 200 });
    this.tick();
    this.timer?.remove();
    this.timer = this.scene.time.addEvent({ delay: 100, loop: true, callback: this.tick, callbackScope: this });
  }

  tick() {
    const secs = Math.max(0, Math.ceil((this.endsAt - this.scene.time.now) / 1000));
    this.detail.setText(`${this.lostLine}\nRespawning at the base in ${secs}...`);
  }

  hide() {
    this.timer?.remove();
    this.timer = null;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      onComplete: () => this.container.setVisible(false),
    });
  }
}
