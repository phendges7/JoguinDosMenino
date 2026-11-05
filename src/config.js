// All tunable numbers live here. Change values, reload, play.
// Times are in milliseconds, distances in pixels, speeds in pixels/second.

export const CONFIG = {
  WORLD: {
    WIDTH: 3000,
    HEIGHT: 3000,
    BG_COLOR: 0x4f8a3c,
    GRID_SIZE: 100,
    GRID_COLOR: 0x477d36,
    GRASS_TUFTS: 900, // decorative darker specks so movement is easy to read
    GRASS_TUFT_COLOR: 0x3f7230,
    EDGE_MARGIN: 60, // keep nodes this far from the world edge
  },

  BASE: {
    RADIUS: 280,
    COLOR: 0x9ccc74,
    EDGE_COLOR: 0xb9df96,
    EDGE_WIDTH: 6,
    NODE_CLEARANCE: 70, // extra gap between base edge and the nearest node
    EXPAND_DURATION: 900, // how long the base takes to grow after an expansion
  },

  CAMERA: {
    FOLLOW_LERP: 0.12, // 1 = rigid follow, lower = smoother
  },

  PLAYER: {
    RADIUS: 15, // collision circle around the feet/hips
    SPEED: 240,
    ACCELERATION: 14, // how fast velocity reaches target speed (higher = snappier)
    DECELERATION: 18, // how fast the player stops when keys are released
    STEP_RATE: 13, // walk-cycle speed at full running speed
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
    NODE_CLEARANCE: 150, // no trees/rocks this close to the road's centre line
    CHEVRON_SPACING: 200, // red arrows showing the direction enemies travel
    CHEVRON_COLOR: 0xc0392b,
    WAYPOINTS: [
      [0, 0],
      [0, 400],
      [0, 720],
      [-130, 950],
      [-70, 1180],
      [150, 1340],
      [220, 1500],
    ],
  },

  FENCE: {
    POST_SPACING: 22, // must stay below the player's diameter + post size
    POST_SIZE: 9,
    POST_RADIUS: 7, // collider per post
    RAIL_WIDTH: 4,
    RAIL_COLOR: 0x8b5a2b,
    POST_COLOR: 0xa47148,
    POST_DARK: 0x5a3a1e,
    GATE_WIDTH: 96,
    GATE_POST_SIZE: 16,
    GATE_POST_COLOR: 0x8d8d8d,
    GATE_OPEN_DISTANCE: 120, // gate swings open when the player is this close
    GATE_OPEN_SPEED: 8,
  },

  GATHER: {
    RANGE: 34, // max gap between player edge and node edge to gather
    COOLDOWN: 550, // time between swing starts
    WINDUP_DURATION: 120, // tool pulls back
    STRIKE_DURATION: 90, // tool swings forward; the hit lands at the end
    DAMAGE_PER_HIT: 1,
    RESOURCE_PER_HIT: 1,
  },

  TOOLS: {
    axe: { HANDLE_COLOR: 0x7a4e24, HEAD_COLOR: 0xcfd8dc, LENGTH: 26 },
    pickaxe: { HANDLE_COLOR: 0x7a4e24, HEAD_COLOR: 0x90a4ae, LENGTH: 28 },
  },

  NODE: {
    MIN_SCALE: 0.55, // node scale when almost empty
    FLASH_DURATION: 70,
    SPAWN_SPACING: 40, // minimum gap between two nodes' edges
    RESPAWN_PLAYER_CLEARANCE: 50, // won't respawn if the player stands this close
    RESPAWN_RETRY: 1500,
    BLOCKS_PLAYER: true, // nodes are solid obstacles
  },

  // Node types. `count` = how many exist in the world.
  NODES: {
    tree: {
      resource: "wood",
      tool: "axe",
      count: 80,
      health: 5,
      radius: 26,
      colliderRadius: 12,
      respawnTime: 15000,
      minDistanceFromBase: 0,
    },
    stone: {
      resource: "stone",
      tool: "pickaxe",
      count: 45,
      health: 6,
      radius: 22,
      colliderRadius: 18,
      respawnTime: 20000,
      minDistanceFromBase: 0,
    },
    gold: {
      resource: "gold",
      tool: "pickaxe",
      count: 14,
      health: 8,
      radius: 20,
      colliderRadius: 16,
      respawnTime: 45000,
      minDistanceFromBase: 450, // gold sits further out
    },
  },

  RESOURCES: {
    wood: { label: "Wood", color: 0x8b5a2b },
    stone: { label: "Stone", color: 0x9e9e9e },
    gold: { label: "Gold", color: 0xf2c94c },
  },

  BACKPACK: {
    VISIBLE_CAP: 24, // max blocks drawn; the real amount can go higher
    COLUMNS: 3,
    BLOCK_WIDTH: 10,
    BLOCK_HEIGHT: 6,
    BLOCK_GAP: 1,
    BACK_OFFSET: 10, // how far behind the player the pack sits
    LIFT: 6, // pack is drawn slightly above centre
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
    PANEL_WIDTH: 160,
    PANEL_GAP: 8, // space between the resource panel and the status panel
    PLAYER_BAR_COLOR: 0xe53935,
    BASE_BAR_COLOR: 0x7cb342,
    BAR_LAG_COLOR: 0xffd54f, // trailing chunk that shows how much was just lost
    BASE_BAR_WIDTH: 260,
    UNDER_ATTACK_TIME: 1500, // "under attack" warning stays this long after the last hit
  },

  // ---- Milestone 3: zombies, bow, health ----

  ZOMBIE: {
    RADIUS: 16,
    SPEED: 58, // walking to the base
    CHASE_SPEED: 76, // chasing the player (player runs at 240)
    SPEED_VARIANCE: 0.15, // each zombie's speed is randomised by up to ±15%
    HEALTH: 30,
    PLAYER_DAMAGE: 12,
    PLAYER_ATTACK_COOLDOWN: 900,
    BASE_DAMAGE: 5,
    BASE_ATTACK_COOLDOWN: 1000,
    TOWER_DAMAGE: 8,
    TOWER_ATTACK_COOLDOWN: 1000,
    WORKER_DAMAGE: 10,
    WORKER_ATTACK_COOLDOWN: 900,
    TOWER_NOTICE_RADIUS: 140, // leave the road to attack a tower whose centre is this close; 0 = only towers they bump into
    CONTACT_RANGE: 4, // gap between edges that still counts as touching
    BASE_STOP_GAP: 4, // zombies stop this far outside the fence line
    NOTICE_RADIUS: 0, // start chasing a player (outside the base) this close; 0 = never leave the road
    LOSE_RADIUS: 420, // give up and walk back to the road beyond this
    PATH_STEP: 32, // spacing of the road points zombies walk between
    WAYPOINT_REACH: 20, // a road point counts as reached this close
    LANE_SPREAD: 0.9, // 0 = single file on the centre line, 1 = use the full road width
    EMERGE_DURATION: 450, // grow-in when climbing out of the portal
    SEPARATION: 0.85, // push apart until centres are this x (sum of radii) apart
    SEPARATION_STRENGTH: 0.35, // fraction of the overlap fixed per frame (soft push)
    BLOCKED_BY_NODES: true, // walk around trees / rocks instead of through them
    TURN_SPEED: 8, // radians/s the face turns towards where it's going
    COLOR: 0x7cb342,
    OUTLINE_COLOR: 0x33691e,
    EYE_COLOR: 0xb71c1c,
    FLASH_DURATION: 80,
    DEATH_DURATION: 220,
    LUNGE_DISTANCE: 7,
    HEALTH_BAR: { WIDTH: 28, HEIGHT: 4, OFFSET: 8, COLOR: 0xe53935 },
  },

  // Simple trickle spawner: zombies climb out of the portal at the road's end.
  // Proper waves replace this in a later milestone.
  SPAWNER: {
    FIRST_DELAY: 6000, // grace period before the first zombie
    START_INTERVAL: 5000, // time between zombies at the start
    MIN_INTERVAL: 1200, // it never gets faster than this
    DECAY_PER_MINUTE: 0.82, // interval is multiplied by this every minute survived
    MAX_ALIVE: 60,
    PORTAL_JITTER: 18, // random offset from the portal centre
    RETRY_DELAY: 500, // wait this long when MAX_ALIVE is reached
  },

  // The player's bow. Any Shooter (e.g. archery towers) takes the same keys.
  BOW: {
    RANGE: 290, // centre-to-centre distance to a target
    COOLDOWN: 550,
    ARROW_SPEED: 650,
    ARROW_DAMAGE: 10,
    ARROW_MAX_DISTANCE: 400, // arrows vanish after flying this far
    LEAD_TARGET: true, // aim where the target will be, not where it is
    SHOW_DURATION: 280, // how long the bow stays visible after a shot
    COLOR: 0x8b5a2b,
    STRING_COLOR: 0xf5f5f5,
    MARKER_COLOR: 0xff5252, // ring under the current target
  },

  ARROW: {
    LENGTH: 20,
    HIT_RADIUS: 3, // added to the target's radius for hit tests
    SHAFT_COLOR: 0x6d4425,
    HEAD_COLOR: 0xcfd8dc,
    FLETCH_COLOR: 0xffffff,
    DEPTH: 5000, // drawn above the world
  },

  HEALTH: {
    PLAYER_MAX: 100,
    BASE_MAX: 300,
    REGEN_PER_SECOND: 6, // player heals this much per second inside the base
    RESPAWN_DELAY: 3000,
    BACKPACK_LOSS: 0.5, // fraction of each resource lost on death (rounded down)
    DAMAGE_SHAKE_DURATION: 140,
    DAMAGE_SHAKE_INTENSITY: 0.006,
    GAME_OVER_DELAY: 900, // the world keeps animating this long before freezing
  },

  BUILD: {
    PAD_SIZE: 90,
    PAD_COLOR: 0xf5e6c4,
    PAD_ALPHA: 0.35,
    PAD_BORDER: 0xfff3d6,
    PAD_BORDER_ACTIVE: 0xffd54f,
    PROGRESS_COLOR: 0xffd54f,
    PROGRESS_ALPHA: 0.45,
    DEPOSIT_DELAY: 250, // stand on a pad this long before items start flowing
    DEPOSIT_INTERVAL: 70, // time between items leaving the backpack
    FLY_DURATION: 320,
    FLY_ARC_HEIGHT: 40,
    UNLOCK_DELAY: 700, // pause before newly unlocked pads pop in
  },

  // ---- Milestone 4: archery towers ----

  TOWER: {
    SIZE: 48, // side of the stone base at level 1 (scaled per level)
    BASE_COLOR: 0x8d8d8d,
    ARCHER_COLOR: 0x3a7bd5,
    PIP_COLOR: 0xffd54f, // little squares showing the level
    MUZZLE_OFFSET: 12, // arrows leave the archer this far from the tower centre
    AIM_TURN_SPEED: 10, // radians/s the archer turns towards the target
    REPAIR_DELAY: 3000, // no zombie hit for this long -> start repairing
    REPAIR_PER_SECOND: 4,
    REBUILD_COST_FACTOR: 0.5, // a destroyed tower's pad costs this x the original (rounded up)
    REBUILD_DELAY: 900, // pause before the rebuild pad appears
    RANGE_SHOW_DISTANCE: 170, // range circle fades in when the player is this close
    RANGE_FILL_ALPHA: 0.06,
    RANGE_STROKE_ALPHA: 0.35,
    UPGRADE_PAD_DISTANCE: 106, // upgrade pad sits this far from its tower (beside it, away from the road)
    HEALTH_BAR: { WIDTH: 46, HEIGHT: 5, OFFSET: 10, COLOR: 0x7cb342 },

    // One entry per level (capped at the list length). Shooter stats use the same
    // keys as BOW. UPGRADE_COST is what it costs to reach that level.
    LEVELS: [
      {
        RANGE: 340,
        COOLDOWN: 900,
        ARROW_SPEED: 700,
        ARROW_DAMAGE: 10,
        ARROW_MAX_DISTANCE: 440,
        LEAD_TARGET: true,
        MAX_HEALTH: 120,
        SCALE: 1,
        TOP_COLOR: 0x8b5a2b,
      },
      {
        RANGE: 380,
        COOLDOWN: 700,
        ARROW_SPEED: 750,
        ARROW_DAMAGE: 13,
        ARROW_MAX_DISTANCE: 490,
        LEAD_TARGET: true,
        MAX_HEALTH: 160,
        SCALE: 1.1,
        TOP_COLOR: 0x607d8b,
        UPGRADE_COST: { wood: 30, stone: 15 },
      },
      {
        RANGE: 420,
        COOLDOWN: 520,
        ARROW_SPEED: 800,
        ARROW_DAMAGE: 16,
        ARROW_MAX_DISTANCE: 540,
        LEAD_TARGET: true,
        MAX_HEALTH: 200,
        SCALE: 1.2,
        TOP_COLOR: 0xc9971a,
        UPGRADE_COST: { wood: 55, stone: 35 },
      },
    ],
  },

  // Build pads. Place a pad either:
  //   x / y:  offsets from the base centre (inside the base), or
  //   road: { distance, side }: beside the road, `distance` px along it from the
  //         base centre, side 1 or -1 for which side of the road.
  // building: 'tower' places an archery tower, 'expansion' grows the base to `radius`.
  // unlocked: visible from the start.
  // unlockedBy: pad id (or list of ids, any one is enough) whose first build reveals this pad.
  // Tower pads get an upgrade pad next to them automatically (see TOWER.LEVELS);
  // set upgradeOffset: { x, y } (from the tower pad) to place it by hand.
  // Trees and rocks never spawn on pads.
  // Keep road pads (and their upgrade pads) beyond the largest base radius so the
  // fence never cuts through them.
  PADS: [
    {
      id: "expand_1",
      building: "expansion",
      label: "Expand Base",
      x: 0,
      y: -115,
      cost: { wood: 25, stone: 15 },
      radius: 450,
      unlocked: true,
    },

    // Worker huts. hut: key into HUTS. The hut stands on the pad; hirePad,
    // upgradePad and stockpile are base-centre offsets for what appears next to it.
    {
      id: "hut_lumber",
      building: "hut",
      hut: "lumberjack",
      label: "Lumberjack Hut",
      x: -105,
      y: -115,
      cost: { gold: 3, wood: 15 },
      unlocked: true,
      hirePad: { x: -105, y: 0 },
      upgradePad: { x: -105, y: 115 },
      stockpile: { x: -205, y: -10 },
    },
    {
      id: "hut_miner",
      building: "hut",
      hut: "miner",
      label: "Miner Hut",
      x: 105,
      y: -115,
      cost: { gold: 3, wood: 20 },
      unlocked: true,
      hirePad: { x: 105, y: 0 },
      upgradePad: { x: 105, y: 115 },
      stockpile: { x: 205, y: -10 },
    },

    {
      id: "expand_2",
      building: "expansion",
      label: "Expand Base",
      x: -200,
      y: 260,
      cost: { wood: 50, stone: 35, gold: 8 },
      radius: 650,
      unlockedBy: "expand_1",
    },

    // The road is the only way zombies come in, so towers line it.
    {
      id: "tower_1",
      building: "tower",
      label: "Archery Tower",
      road: { distance: 780, side: 1 },
      cost: { wood: 15 },
      unlocked: true,
    },
    {
      id: "tower_2",
      building: "tower",
      label: "Archery Tower",
      road: { distance: 780, side: -1 },
      cost: { wood: 15 },
      unlocked: true,
    },
    {
      id: "tower_3",
      building: "tower",
      label: "Archery Tower",
      road: { distance: 1010, side: 1 },
      cost: { wood: 25 },
      unlockedBy: ["tower_1", "tower_2"],
    },
    {
      id: "tower_4",
      building: "tower",
      label: "Archery Tower",
      road: { distance: 1010, side: -1 },
      cost: { wood: 25 },
      unlockedBy: ["tower_1", "tower_2"],
    },
    {
      id: "tower_5",
      building: "tower",
      label: "Archery Tower",
      road: { distance: 1250, side: 1 },
      cost: { wood: 40 },
      unlockedBy: ["tower_3", "tower_4"],
    },
    {
      id: "tower_6",
      building: "tower",
      label: "Archery Tower",
      road: { distance: 1250, side: -1 },
      cost: { wood: 40 },
      unlockedBy: ["tower_3", "tower_4"],
    },
  ],

  // Testing helpers. On with `npm run dev`, off in the published build
  // (`npm run build`). Set to true / false to force it either way.
  DEBUG: {
    ENABLED: import.meta.env.DEV,
    GIVE_KEY: "G", // adds GIVE_AMOUNT to the backpack
    GIVE_AMOUNT: { wood: 50, stone: 30, gold: 10 },
    SPAWN_KEY: "Z", // spawns SPAWN_COUNT zombies at the portal
    SPAWN_COUNT: 5,
    SPAWN_NEAR_KEY: "X", // spawns zombies near the worker furthest from the base (or the player)
    SPAWN_NEAR_COUNT: 3,
    SPAWN_NEAR_DISTANCE: 170, // inside WORKER.DANGER_RADIUS, so the worker flees
  },

  // ---- Milestone 5: worker huts ----

  // Per hut type. NODE_TYPES: which resource nodes its workers gather.
  HUTS: {
    lumberjack: {
      NODE_TYPES: ["tree"],
      WALL_COLOR: 0xa47148,
      SIGN: "axe", // icon on the hut, drawn with the tool colours
      LOOK: {
        SKIN: 0xe0ac69,
        HAIR: 0x3e2723,
        SHIRT: 0xc62828,
        PANTS: 0x33691e,
        SHOES: 0x3b2a1a,
      },
    },
    miner: {
      NODE_TYPES: ["stone", "gold"],
      WALL_COLOR: 0x9e9e9e,
      SIGN: "pickaxe",
      // the yellow "hair" reads as a hard hat
      LOOK: {
        SKIN: 0xf1c27d,
        HAIR: 0xffc107,
        SHIRT: 0x8d6e63,
        PANTS: 0x455a64,
        SHOES: 0x263238,
      },
    },
  },

  // Shared by all hut types.
  HUT: {
    SIZE: 60,
    MAX_WORKERS: 3,
    // HIRE_COSTS[i] is the cost of worker i + 1. Worker 1 comes with the hut;
    // its entry is only used to price a rehire after it dies.
    HIRE_COSTS: [{ gold: 2 }, { gold: 4 }, { gold: 7 }],
    REHIRE_COST_FACTOR: 0.5, // a dead worker's slot costs this x its hire cost (rounded up)
    PIP_COLOR: 0xffd54f,
    // Per level. SPEED px/s, CAPACITY items carried, GATHER_COOLDOWN ms between swings.
    // UPGRADE_COST is what it costs to reach that level.
    LEVELS: [
      {
        SPEED: 95,
        CAPACITY: 5,
        GATHER_COOLDOWN: 900,
        ROOF_COLOR: 0x8d4b2b,
        SCALE: 1,
      },
      {
        SPEED: 115,
        CAPACITY: 8,
        GATHER_COOLDOWN: 720,
        ROOF_COLOR: 0x5d7f99,
        SCALE: 1.08,
        UPGRADE_COST: { gold: 5, stone: 20 },
      },
      {
        SPEED: 135,
        CAPACITY: 12,
        GATHER_COOLDOWN: 560,
        ROOF_COLOR: 0xc9971a,
        SCALE: 1.16,
        UPGRADE_COST: { gold: 10, stone: 40 },
      },
    ],
  },

  WORKER: {
    RADIUS: 14,
    MAX_HEALTH: 40,
    REGEN_PER_SECOND: 3, // while inside the base
    WINDUP_DURATION: 80, // shorter swing than the player's
    STRIKE_DURATION: 60,
    GATHER_REACH: 22, // edge gap to a node at which they stop walking and start swinging
    DANGER_RADIUS: 220, // a zombie this close makes them run back to the base
    SAFE_DELAY: 2000, // no zombie near for this long -> back to work
    FLEE_SPEED_MULTIPLIER: 1.35,
    GOLD_PREFERENCE_DISTANCE: 150, // miners take a gold rock up to this much further than the nearest rock
    AVOID_NODES_NEAR_ZOMBIES: true, // skip nodes that have a zombie within DANGER_RADIUS
    DROP_INTERVAL: 90, // ms between items flying from the back onto the stockpile
    IDLE_RETRY: 1000, // nothing to gather: look again after this long
    ORBIT_MARGIN: 40, // walk around the fence at this distance outside it
    GATE_CORRIDOR: 50, // within this of the gate they may cross the fence line
    SEPARATION: 0.8, // soft push between workers (x sum of radii)
    HEALTH_BAR: { WIDTH: 26, HEIGHT: 4, OFFSET: 46, COLOR: 0x66bb6a },
  },

  STOCKPILE: {
    COLUMNS: 4,
    VISIBLE_CAP: 32,
    BLOCK_WIDTH: 12,
    BLOCK_HEIGHT: 7,
    BLOCK_GAP: 1,
    PALLET_COLOR: 0x8b5a2b,
    PICKUP_RADIUS: 42, // player this close to the centre collects
    PICKUP_INTERVAL: 60, // ms between items flying to the backpack
  },
};
