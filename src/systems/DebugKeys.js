import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { toast } from '../effects/toast.js';

// Testing shortcuts (CONFIG.DEBUG):
//   G: add resources to the backpack
//   Z: spawn a group of zombies at the portal
//   X: spawn a few zombies close to the worker furthest from the base
//      (on its far side, so it has somewhere to run), or near the player
// Returns the actions (or null when disabled) so the UI can offer them as
// on-screen buttons on touch devices.
export function setupDebugKeys(scene, { player, inventory, zombies, road, workers, base }) {
  const D = CONFIG.DEBUG;
  if (!D.ENABLED) return null;

  const actions = {
    give() {
      if (!player.alive) return;
      for (const [type, n] of Object.entries(D.GIVE_AMOUNT)) inventory.add(type, n);
      toast(scene, player.x, player.y - 60, 'Debug: +resources', '#80deea');
    },
    spawnAtPortal() {
      const { x, y } = road.portalPoint;
      const j = CONFIG.SPAWNER.PORTAL_JITTER;
      for (let i = 0; i < D.SPAWN_COUNT; i++) {
        scene.time.delayedCall(i * 150, () => zombies.spawn(
          x + Phaser.Math.FloatBetween(-j, j), y + Phaser.Math.FloatBetween(-j, j), { emerge: true },
        ));
      }
      toast(scene, player.x, player.y - 60, `Debug: ${D.SPAWN_COUNT} zombies at the portal`, '#80deea');
    },
    spawnNear() {
      const far = (p) => Math.hypot(p.x - base.x, p.y - base.y);
      const outside = workers.alive.filter((w) => !base.contains(w.x, w.y));
      const target = outside.sort((a, b) => far(b) - far(a))[0] ?? player;
      const away = Math.atan2(target.y - base.y, target.x - base.x);
      for (let i = 0; i < D.SPAWN_NEAR_COUNT; i++) {
        const a = away + Phaser.Math.FloatBetween(-0.6, 0.6);
        const d = D.SPAWN_NEAR_DISTANCE + Phaser.Math.Between(-20, 20);
        zombies.spawn(target.x + Math.cos(a) * d, target.y + Math.sin(a) * d, { emerge: true });
      }
      const who = target === player ? 'you' : 'a worker';
      toast(scene, player.x, player.y - 60, `Debug: ${D.SPAWN_NEAR_COUNT} zombies near ${who}`, '#80deea');
    },
  };

  const kb = scene.input.keyboard;
  kb.on(`keydown-${D.GIVE_KEY}`, actions.give);
  kb.on(`keydown-${D.SPAWN_KEY}`, actions.spawnAtPortal);
  kb.on(`keydown-${D.SPAWN_NEAR_KEY}`, actions.spawnNear);
  return actions;
}
