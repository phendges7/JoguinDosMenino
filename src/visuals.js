// Visual-only tuning: particles, tweens, colours, shadows, UI style.
// Nothing here changes gameplay rules or balance (those live in config.js).
// Times are in milliseconds, distances in pixels.

export const VISUALS = {
  // Soft round shadows under everything that stands on the ground.
  SHADOW: {
    TEXTURE_SIZE: 64,
    CHARACTER: { W: 34, H: 12, Y: 14, ALPHA: 0.42 }, // player and workers
    ZOMBIE: { W_FACTOR: 2.3, H_FACTOR: 0.85, Y_FACTOR: 0.8, ALPHA: 0.4 },
    NODE: { W_FACTOR: 2.2, H_FACTOR: 0.95, Y_FACTOR: 0.6, ALPHA: 0.35 },
    BUILDING_ALPHA: 0.38,
  },

  // Depth = the y of an object's feet, so lower on screen draws in front.
  DEPTH: {
    WALK_DUST: 1, // under every standing object, above ground/pads
    FX: 4000, // bursts (chips, sparks, splats) draw over the world
    FLOAT_TEXT: 4500,
  },

  PARTICLES: {
    MAX_PER_EMITTER: 400, // hard cap so big fights can't flood the screen
    CHIPS: {
      // chopping trees
      COUNT: 6,
      LIFESPAN: [350, 600],
      SPEED: [80, 200],
      GRAVITY: 650,
      SCALE: [1, 0.6],
      TINTS: [0xa47148, 0xd7a86e, 0x6d4425, 0xc8e6a0],
    },
    SPARKS: {
      // mining stone / gold
      COUNT: 5,
      LIFESPAN: [180, 320],
      SPEED: [140, 280],
      GRAVITY: 400,
      SCALE: [1, 0.2],
      STONE_TINTS: [0xffffff, 0xfff3c4, 0xffe082],
      GOLD_TINTS: [0xfff59d, 0xffd54f, 0xffffff],
    },
    DUST: {
      // mining dust and building dust
      COUNT: 5,
      LIFESPAN: [400, 700],
      SPEED: [20, 70],
      SCALE: [0.6, 1.6],
      ALPHA: 0.5,
      STONE_TINTS: [0xbdbdbd, 0x9e9e9e, 0xd7ccc8],
      GOLD_TINTS: [0xe0c070, 0xbdbdbd],
      BUILD_COUNT: 14,
      BUILD_TINTS: [0xd7ccc8, 0xbcaaa4, 0xefebe9],
    },
    SPLAT: {
      // zombie death puff (green, no blood)
      COUNT: 12,
      LIFESPAN: [300, 550],
      SPEED: [60, 190],
      GRAVITY: 250,
      SCALE: [1.4, 0.3],
      TINTS: [0x7cb342, 0x9ccc65, 0x558b2f, 0xc5e1a5],
    },
    WALK_DUST: {
      // puffs behind the player's feet
      INTERVAL: 110, // ms between puffs at full speed
      MIN_SPEED: 60, // px/s before puffs start
      LIFESPAN: [350, 550],
      SPEED: [5, 25],
      SCALE: [0.5, 1.3],
      ALPHA: 0.4,
      TINTS: [0xd7ccc8, 0xc5b9a8],
      OFFSET_Y: 14, // from the player's centre to the feet
    },
  },

  FLOAT_TEXT: {
    RISE: 34,
    DURATION: 750,
    FONT_SIZE: 15,
    COLORS: { wood: "#ffcc80", stone: "#eeeeee", gold: "#ffe082" },
  },

  SQUASH: {
    WALK: 0.06, // player / workers stretch this much per step
    ITEM_LAND_X: 1.55, // backpack/stockpile block squash when it lands
    ITEM_LAND_Y: 0.55,
    ITEM_LAND_DURATION: 220,
  },

  BACKPACK_SWAY: {
    MAX_ANGLE: 0.18, // radians the pack leans when running sideways
    SPEED_FOR_MAX: 240, // px/s at which the lean is full
    SMOOTHING: 10, // higher = snappier
  },

  FLY: {
    // items flying to the backpack / pads (duration and height stay in config.js)
    SIDE_CURVE: 0.35, // sideways bend as a fraction of the distance
    MID_SCALE: 1.35, // grows mid-flight
    SPIN: 1, // turns per flight
  },

  POP: {
    // buildings, towers, workers and pads appearing
    DURATION: 480,
    OVERSHOOT: 2.6, // Back ease strength; higher = bigger overshoot
    SETTLE_SQUASH: 0.12, // little squash after landing
    SETTLE_DURATION: 140,
  },

  PAD_PULSE: {
    // pad being paid into
    SCALE: 1.05,
    DURATION: 420,
    GLOW_COLOR: 0xffe082,
    GLOW_ALPHA: 0.55,
  },

  KNOCKBACK: {
    // Visual only: the zombie sprite jolts back along the arrow and springs home.
    // (A real push spread tower damage across groups and changed balance.)
    DISTANCE: 8,
    DURATION: 150,
  },

  HITSTOP: {
    DURATION: 55, // ms the world freezes when a zombie dies near the player
    RADIUS: 220,
    COOLDOWN: 260, // ms before it can trigger again (no stutter in big fights)
  },

  GROUND: {
    NOISE_PATCHES: 520, // big soft blotches of lighter/darker grass
    NOISE_COLORS: [0x5a9645, 0x447a33, 0x55903f, 0x3f7230],
    NOISE_RADIUS: [30, 110],
    NOISE_ALPHA: [0.12, 0.28],
    GRID_ALPHA: 0.35, // the readability grid, now fainter
    TUFT_COLORS: [0x5f9e48, 0x376629], // mixed with config WORLD.GRASS_TUFT_COLOR (count stays in config)
    FLOWERS: 260,
    FLOWER_COLORS: [0xfff59d, 0xffffff, 0xf8bbd0, 0xb39ddb, 0xffcc80],
    PEBBLES: 220,
    PEBBLE_COLORS: [0x9e9e9e, 0x8d8d8d, 0xb0aca0],
  },

  BASE: {
    FEATHER: 26, // width of the soft edge
    FEATHER_STEPS: 6,
    WARM_TINT: 0xffe9a8, // warm glow laid over the base colour
    WARM_ALPHA: 0.22,
    INNER_GLOW_STEPS: 5,
  },

  VIGNETTE: {
    ALPHA: 0.42, // darkness at the corners
    INNER: 0.55, // fraction of the radius that stays clear
  },

  // Touch controls: a floating joystick that appears wherever the thumb goes down.
  TOUCH: {
    RADIUS: 62, // screen px the knob can travel from the centre
    KNOB_RADIUS: 28,
    DEADZONE: 8, // px of drag ignored (so a tap doesn't nudge the player)
    FULL_SPEED_AT: 0.75, // fraction of RADIUS where the player reaches full speed
    MIN_STRENGTH: 0.35, // speed fraction just past the deadzone
    FOLLOW: true, // dragging past the ring pulls the joystick along
    BASE_COLOR: 0xffffff,
    BASE_ALPHA: 0.16,
    RING_ALPHA: 0.45,
    KNOB_COLOR: 0xffffff,
    KNOB_ALPHA: 0.6,
    FADE_DURATION: 160,
    MOUSE_DRAG: true, // a mouse can drag-steer too (handy for testing on desktop)
  },

  // Small screens (phones): zoom the camera out and scale the HUD.
  MOBILE: {
    MIN_VISIBLE_WORLD: 560, // the screen's short side always shows at least this many world px
    MIN_ZOOM: 0.6,
    UI_REFERENCE: { WIDTH: 1000, HEIGHT: 640 }, // at or above this size the HUD is 1:1
    MIN_UI_SCALE: 0.72,
    NARROW_WIDTH: 720, // below this the base bar gets its own row above the panels
    HUD_MARGIN: 12,
    WORLD_TEXT_FACTOR: 0.85, // world text (pads, toasts) is scaled up by this / zoom when zoomed out
    MAX_WORLD_TEXT_SCALE: 1.5,
    DEBUG_BUTTON_SIZE: 46,
  },

  UI: {
    PANEL_COLOR: 0x15210f,
    PANEL_ALPHA: 0.62,
    PANEL_BORDER: 0xb9df96,
    PANEL_BORDER_ALPHA: 0.35,
    PANEL_RADIUS: 10,
    BAR_RADIUS: 5,
    BUMP_SCALE: 1.35, // counter bump when a value changes
    BUMP_DURATION: 220,
    BUMP_FLASH: "#fff59d",
    ICON_SIZE: 20,
    PAD_ICON_SIZE: 18,
    PAD_TITLE_SIZE: 13, // keeps neighbouring pad titles from running into each other
    BUTTON_COLOR: 0x7cb342,
    BUTTON_HOVER: 0x9ccc65,
    BUTTON_BORDER: 0x33691e,
  },
};
