import { CONFIG } from '../config.js';

// Auto-gathering: when a node is in range and the cooldown is ready,
// swing the right tool at the nearest node. The hit lands at the end of the swing.
export class Gatherer {
  // onYield(node, resourceType, amount) is called every time a hit lands.
  constructor(scene, player, resources, onYield) {
    this.scene = scene;
    this.player = player;
    this.resources = resources;
    this.onYield = onYield;
    this.cooldown = 0;
    this.target = null;
  }

  update(delta) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    const G = CONFIG.GATHER;
    const p = this.player;
    this.target = this.resources.findNearestInRange(p.x, p.y, p.radius, G.RANGE);

    if (!this.target || this.cooldown > 0 || p.tool.swinging) return;

    const node = this.target;
    this.cooldown = G.COOLDOWN;
    const angle = Math.atan2(node.y - p.y, node.x - p.x);
    p.faceTowards(node.x, node.y);
    p.tool.swing(node.tool, angle, () => {
      if (node.hit(G.DAMAGE_PER_HIT)) {
        this.scene.cameras.main.shake(40, 0.0015);
        this.onYield(node, node.resource, G.RESOURCE_PER_HIT);
      }
    });
  }
}
