import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { ResourceNode } from '../entities/ResourceNode.js';

// Spawns and owns all resource nodes; answers "what's the nearest node in range?".
// Nodes always spawn outside the base, and get moved out when the base grows.
export class ResourceManager {
  constructor(scene, base, road) {
    this.scene = scene;
    this.base = base;
    this.road = road;
    this.nodes = [];
    this.colliders = CONFIG.NODE.BLOCKS_PLAYER ? scene.physics.add.staticGroup() : null;
    this.reserved = []; // { x, y, radius } areas kept free of nodes (build pads)
  }

  // Keep an area clear of nodes from now on. Nodes already there move elsewhere.
  reserveArea(x, y, radius) {
    this.reserved.push({ x, y, radius });
    const hit = this.nodes.filter((n) => Phaser.Math.Distance.Between(x, y, n.x, n.y) < radius + n.radius);
    this.nodes = this.nodes.filter((n) => !hit.includes(n));
    for (const node of hit) {
      node.destroy();
      this.spawn(node.type, false);
    }
  }

  spawnAll() {
    // Spawn rarer types first so they get their pick of spots.
    const types = Object.keys(CONFIG.NODES).sort((a, b) => CONFIG.NODES[a].count - CONFIG.NODES[b].count);
    for (const type of types) {
      for (let i = 0; i < CONFIG.NODES[type].count; i++) {
        if (!this.spawn(type, false)) {
          console.warn(`Could not place ${type} #${i}: world too crowded`);
          break;
        }
      }
    }
  }

  spawn(type, growIn) {
    const pos = this.findSpot(CONFIG.NODES[type]);
    if (!pos) return null;
    const node = new ResourceNode(this.scene, type, pos.x, pos.y, this.colliders, { growIn });
    this.nodes.push(node);
    return node;
  }

  minDistanceFromCentre(def) {
    return Math.max(this.base.radius + CONFIG.BASE.NODE_CLEARANCE + def.radius, def.minDistanceFromBase);
  }

  findSpot(def) {
    const W = CONFIG.WORLD;
    const minFromCentre = this.minDistanceFromCentre(def);
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = Phaser.Math.Between(W.EDGE_MARGIN, W.WIDTH - W.EDGE_MARGIN);
      const y = Phaser.Math.Between(W.EDGE_MARGIN, W.HEIGHT - W.EDGE_MARGIN);
      if (Phaser.Math.Distance.Between(x, y, this.base.x, this.base.y) < minFromCentre) continue;
      if (this.road && this.road.distanceTo(x, y) < CONFIG.ROAD.NODE_CLEARANCE + def.radius) continue;
      if (this.reserved.some((r) => Phaser.Math.Distance.Between(x, y, r.x, r.y) < r.radius + def.radius)) continue;
      const clash = this.nodes.some(
        (n) => Phaser.Math.Distance.Between(x, y, n.x, n.y) < n.radius + def.radius + CONFIG.NODE.SPAWN_SPACING,
      );
      if (!clash) return { x, y };
    }
    return null;
  }

  // After the base grows: remove nodes now inside it and regrow the same
  // number elsewhere, so the world never runs dry.
  clearInsideBase() {
    const inside = this.nodes.filter(
      (n) => Phaser.Math.Distance.Between(n.x, n.y, this.base.x, this.base.y) < this.minDistanceFromCentre(n.def),
    );
    this.nodes = this.nodes.filter((n) => !inside.includes(n));
    for (const node of inside) {
      node.destroy();
      this.spawn(node.type, true);
    }
    return inside.length;
  }

  // Nearest active node whose edge is within `range` of the circle (x, y, radius).
  findNearestInRange(x, y, radius, range) {
    let best = null;
    let bestGap = Infinity;
    for (const node of this.nodes) {
      if (!node.active) continue;
      const gap = Phaser.Math.Distance.Between(x, y, node.x, node.y) - radius - node.radius;
      if (gap <= range && gap < bestGap) {
        best = node;
        bestGap = gap;
      }
    }
    return best;
  }
}
