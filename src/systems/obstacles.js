// Shared movement helpers for things that walk without Arcade physics
// (zombies, workers).

// Push a circle (entity.x, entity.y, entity.radius) out of every active
// resource node's collider, sliding sideways so it doesn't stall dead-centre
// behind a tree. walkX / walkY: the velocity it was trying to move at (px/s).
export function pushOutOfNodes(entity, nodes, walkX, walkY, dt) {
  for (const node of nodes) {
    if (!node.active) continue;
    const min = node.def.colliderRadius + entity.radius;
    const dx = entity.x - node.x;
    const dy = entity.y - node.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min || d2 === 0) continue;
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    entity.x = node.x + nx * min;
    entity.y = node.y + ny * min;
    const tx = -ny;
    const ty = nx;
    const side = walkX * tx + walkY * ty >= 0 ? 1 : -1;
    const slide = Math.hypot(walkX, walkY) * dt * 0.6;
    entity.x += tx * side * slide;
    entity.y += ty * side * slide;
  }
}

// Push a circle out of another circle (cx, cy, r).
export function pushOutOfCircle(entity, cx, cy, r) {
  const min = entity.radius + r;
  const dx = entity.x - cx;
  const dy = entity.y - cy;
  const d = Math.hypot(dx, dy);
  if (d < min && d > 0) {
    entity.x = cx + (dx / d) * min;
    entity.y = cy + (dy / d) * min;
  }
}
