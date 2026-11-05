import { CONFIG } from '../config.js';

// Auto-gathering: when a node is in range and the cooldown is ready, swing the
// right tool at it. The hit lands at the end of the swing and uses the node's
// own health (node.hit), so the player and workers share the same rules.
//
// `actor` needs x, y, radius, tool (Tool) and faceTowards(x, y).
// options (all optional; defaults are the player's behaviour):
//   findTarget: () => node | null   which node to hit (default: nearest in range)
//   cooldown:   () => ms            time between swings (default GATHER.COOLDOWN)
//   swing:      { windup, strike }  swing animation timings
//   shake:      boolean             small camera shake on hit (player only)
export class Gatherer {
  // onYield(node, resourceType, amount) is called every time a hit lands.
  constructor(scene, actor, resources, onYield, options = {}) {
    this.scene = scene;
    this.actor = actor;
    this.resources = resources;
    this.onYield = onYield;
    this.findTarget = options.findTarget
      ?? (() => this.resources.findNearestInRange(actor.x, actor.y, actor.radius, CONFIG.GATHER.RANGE));
    this.cooldownMs = options.cooldown ?? (() => CONFIG.GATHER.COOLDOWN);
    this.swingTimings = options.swing ?? {};
    this.shake = options.shake ?? true;
    this.cooldown = 0;
    this.target = null;
  }

  update(delta) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    const G = CONFIG.GATHER;
    const a = this.actor;
    this.target = this.findTarget();

    if (!this.target || this.cooldown > 0 || a.tool.swinging) return;

    const node = this.target;
    this.cooldown = this.cooldownMs();
    const angle = Math.atan2(node.y - a.y, node.x - a.x);
    a.faceTowards(node.x, node.y);
    a.tool.swing(node.tool, angle, () => {
      if (node.hit(G.DAMAGE_PER_HIT)) {
        this.scene.fx?.nodeHit(node);
        if (this.shake) this.scene.cameras.main.shake(40, 0.0015);
        this.onYield(node, node.resource, G.RESOURCE_PER_HIT);
      }
    }, this.swingTimings);
  }
}
