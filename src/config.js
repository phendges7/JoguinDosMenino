// All tunable numbers live here. Change values, reload, play.
// Times are in milliseconds, distances in pixels, speeds in pixels/second.

export const CONFIG = {
  WORLD: {
    WIDTH: 3000,
    HEIGHT: 3000,
    BG_COLOR: 0x4f8a3c,
    GRID_SIZE: 100,
    GRID_COLOR: 0x477d36,
    GRASS_TUFTS: 900,           // decorative darker specks so movement is easy to read
    GRASS_TUFT_COLOR: 0x3f7230,
    EDGE_MARGIN: 60,            // keep nodes this far from the world edge
  },

  BASE: {
    RADIUS: 280,
    COLOR: 0x9ccc74,
    EDGE_COLOR: 0xb9df96,
    EDGE_WIDTH: 6,
    NODE_CLEARANCE: 70,         // extra gap between base edge and the nearest node
    EXPAND_DURATION: 900,       // how long the base takes to grow after an expansion
  },

  CAMERA: {
    FOLLOW_LERP: 0.12,          // 1 = rigid follow, lower = smoother
  },

  PLAYER: {
    RADIUS: 15,                 // collision circle around the feet/hips
    SPEED: 240,
    ACCELERATION: 14,           // how fast velocity reaches target speed (higher = snappier)
    DECELERATION: 18,           // how fast the player stops when keys are released
    STEP_RATE: 13,              // walk-cycle speed at full running speed
    LOOK: {
      SKIN: 0xf1c27d,
      HAIR: 0x5b3a1e,
      SHIRT: 0x3a7bd5,
      PANTS: 0x2f3e5c,
      SHOES: 0x3b2a1a,
    },
  },

  // A dirt road from the zombie spawn at the map edge to the base gate.
  // WAYPOINTS are offsets from the base centre, listed from the centre outwards.
  // The first stretch must run straight out past the largest base radius,
  // because the gate sits where the road crosses the fence.
  ROAD: {
    WIDTH: 64,
    COLOR: 0xb8935e,
    EDGE_COLOR: 0x7a5a32,
    RUT_COLOR: 0x9c7a4a,
    NODE_CLEARANCE: 150,        // no trees/rocks this close to the road's centre line
    CHEVRON_SPACING: 200,       // red arrows showing the direction enemies travel
    CHEVRON_COLOR: 0xc0392b,
    WAYPOINTS: [
      [0, 0], [0, 400], [0, 720], [-130, 950], [-70, 1180], [150, 1340], [220, 1500],
    ],
  },

  FENCE: {
    POST_SPACING: 22,           // must stay below the player's diameter + post size
    POST_SIZE: 9,
    POST_RADIUS: 7,             // collider per post
    RAIL_WIDTH: 4,
    RAIL_COLOR: 0x8b5a2b,
    POST_COLOR: 0xa47148,
    POST_DARK: 0x5a3a1e,
    GATE_WIDTH: 96,
    GATE_POST_SIZE: 16,
    GATE_POST_COLOR: 0x8d8d8d,
    GATE_OPEN_DISTANCE: 120,    // gate swings open when the player is this close
    GATE_OPEN_SPEED: 8,
  },

  GATHER: {
    RANGE: 34,                  // max gap between player edge and node edge to gather
    COOLDOWN: 550,              // time between swing starts
    WINDUP_DURATION: 120,       // tool pulls back
    STRIKE_DURATION: 90,        // tool swings forward; the hit lands at the end
    DAMAGE_PER_HIT: 1,
    RESOURCE_PER_HIT: 1,
  },

  TOOLS: {
    axe:     { HANDLE_COLOR: 0x7a4e24, HEAD_COLOR: 0xcfd8dc, LENGTH: 26 },
    pickaxe: { HANDLE_COLOR: 0x7a4e24, HEAD_COLOR: 0x90a4ae, LENGTH: 28 },
  },

  NODE: {
    MIN_SCALE: 0.55,            // node scale when almost empty
    FLASH_DURATION: 70,
    SPAWN_SPACING: 40,          // minimum gap between two nodes' edges
    RESPAWN_PLAYER_CLEARANCE: 50, // won't respawn if the player stands this close
    RESPAWN_RETRY: 1500,
    BLOCKS_PLAYER: true,        // nodes are solid obstacles
  },

  // Node types. `count` = how many exist in the world.
  NODES: {
    tree: {
      resource: 'wood', tool: 'axe',
      count: 80, health: 5, radius: 26, colliderRadius: 12,
      respawnTime: 15000, minDistanceFromBase: 0,
    },
    stone: {
      resource: 'stone', tool: 'pickaxe',
      count: 45, health: 6, radius: 22, colliderRadius: 18,
      respawnTime: 20000, minDistanceFromBase: 0,
    },
    gold: {
      resource: 'gold', tool: 'pickaxe',
      count: 14, health: 8, radius: 20, colliderRadius: 16,
      respawnTime: 45000, minDistanceFromBase: 450, // gold sits further out
    },
  },

  RESOURCES: {
    wood:  { label: 'Wood',  color: 0x8b5a2b },
    stone: { label: 'Stone', color: 0x9e9e9e },
    gold:  { label: 'Gold',  color: 0xf2c94c },
  },

  BACKPACK: {
    VISIBLE_CAP: 24,            // max blocks drawn; the real amount can go higher
    COLUMNS: 3,
    BLOCK_WIDTH: 10,
    BLOCK_HEIGHT: 6,
    BLOCK_GAP: 1,
    BACK_OFFSET: 10,            // how far behind the player the pack sits
    LIFT: 6,                    // pack is drawn slightly above centre
    FLY_DURATION: 380,
    FLY_ARC_HEIGHT: 50,
  },

  HUD: {
    X: 16,
    Y: 16,
    ROW_HEIGHT: 30,
    ICON_SIZE: 18,
    FONT_SIZE: 20,
    PANEL_ALPHA: 0.4,
  },

  BUILD: {
    PAD_SIZE: 90,
    PAD_COLOR: 0xf5e6c4,
    PAD_ALPHA: 0.35,
    PAD_BORDER: 0xfff3d6,
    PAD_BORDER_ACTIVE: 0xffd54f,
    PROGRESS_COLOR: 0xffd54f,
    PROGRESS_ALPHA: 0.45,
    DEPOSIT_DELAY: 250,         // stand on a pad this long before items start flowing
    DEPOSIT_INTERVAL: 70,       // time between items leaving the backpack
    FLY_DURATION: 320,
    FLY_ARC_HEIGHT: 40,
    UNLOCK_DELAY: 700,          // pause before newly unlocked pads pop in
  },

  TOWER: {
    SIZE: 48,
    RANGE: 260,                 // shown when built; used for shooting in a later milestone
    BASE_COLOR: 0x8d8d8d,
    TOP_COLOR: 0x8b5a2b,
    ARCHER_COLOR: 0x3a7bd5,
  },

  // Build pads. Place a pad either:
  //   x / y:  offsets from the base centre (inside the base), or
  //   road: { distance, side }: beside the road, `distance` px along it from the
  //         base centre, side 1 or -1 for which side of the road.
  // building: 'tower' places an archery tower, 'expansion' grows the base to `radius`.
  // unlocked: visible from the start. unlocks: pad ids that appear once this one is built.
  // Keep road pads beyond the largest base radius so the fence never cuts through them.
  PADS: [
    { id: 'expand_1', building: 'expansion', label: 'Expand Base', x: 170, y: 90,
      cost: { wood: 25, stone: 15 }, radius: 450, unlocked: true,
      unlocks: ['expand_2', 'tower_3', 'tower_4'] },
    { id: 'tower_1', building: 'tower', label: 'Archery Tower', road: { distance: 780, side: 1 },
      cost: { wood: 10, stone: 5 }, unlocked: true, unlocks: ['tower_2'] },
    { id: 'tower_2', building: 'tower', label: 'Archery Tower', road: { distance: 780, side: -1 },
      cost: { wood: 15, stone: 8 } },
    { id: 'expand_2', building: 'expansion', label: 'Expand Base', x: -200, y: 260,
      cost: { wood: 50, stone: 35, gold: 8 }, radius: 650,
      unlocks: ['tower_5', 'tower_6'] },
    { id: 'tower_3', building: 'tower', label: 'Archery Tower', road: { distance: 1010, side: 1 },
      cost: { wood: 20, stone: 12 } },
    { id: 'tower_4', building: 'tower', label: 'Archery Tower', road: { distance: 1010, side: -1 },
      cost: { wood: 20, stone: 12 } },
    { id: 'tower_5', building: 'tower', label: 'Archery Tower', road: { distance: 1250, side: 1 },
      cost: { wood: 30, stone: 20, gold: 4 } },
    { id: 'tower_6', building: 'tower', label: 'Archery Tower', road: { distance: 1250, side: -1 },
      cost: { wood: 30, stone: 20, gold: 4 } },
  ],
};
