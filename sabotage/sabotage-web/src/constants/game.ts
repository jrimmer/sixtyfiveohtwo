// Game constants derived from Sabotage disassembly

// Screen dimensions (Apple II hi-res)
export const SCREEN_WIDTH = 280;
export const SCREEN_HEIGHT = 192;

// Gun turret constants
export const GUN_ANGLE_MIN = 4;
export const GUN_ANGLE_MAX = 52;
export const GUN_ANGLE_CENTER = 28;      // straight up
export const GUN_ANGLE_STEP = 6;         // keyboard rotation step
export const GUN_ANGLE_MAX_DELTA = 4;    // max angle change per frame
export const GUN_X = 140;                // center of screen (columns 17-20)
export const GUN_Y = 157;                // bottom of gun position (line 157)
export const GUN_BASE_Y = 191;           // very bottom

// Flier constants
export const MAX_FLIERS = 4;
export const FLIER_STRUCT_SIZE = 10;     // bytes per flier in original
export const FLIER_HEIGHT = 10;          // helicopter/bomber bitmap height
export const FLIER_LANE_HEIGHT = 14;     // pixels per "lane"

// Flier height levels (Y positions for each difficulty level)
export const FLIER_HEIGHTS = [
  20,   // level 0 - highest (top of screen)
  34,   // level 1
  48,   // level 2
  62,   // level 3
  76,   // level 4
  90,   // level 5 - lowest
];

// Paratrooper constants
export const MAX_PARATROOPERS = 8;
export const PARA_STRUCT_SIZE = 5;       // bytes per para in original
export const PARA_FALL_SPEED = 1;        // pixels per frame with chute
export const PARA_PRE_CHUTE_SPEED = 3;   // pixels per frame before chute opens
export const PARA_CHUTE_OPEN_DISTANCE = 10; // pixels to fall before chute opens

// Ground/landing constants
export const GROUND_Y = 191;             // bottom of playfield
export const GROUND_COLUMNS = 40;        // hi-res columns
export const GUN_FOUNDATION_LEFT = 16;   // left column of gun foundation
export const GUN_FOUNDATION_RIGHT = 21;  // right column of gun foundation
export const PARA_HEIGHT = 8;            // height of landed paratrooper
export const MAX_STACK_HEIGHT = 4;       // max paras stacked before sabotage

// Sabotage trigger conditions
export const SABOTAGE_FOUNDATION_HEIGHT = 4;  // height on foundation columns
export const SABOTAGE_ADJACENT_HEIGHT = 3;    // height on adjacent columns
export const SABOTAGE_SIDE_COUNT = 4;         // total paras on one side

// Timing constants (frames)
export const DROP_CHECK_INTERVAL = 21;   // frames between drop checks
export const INITIAL_DROP_COUNTER = 30;  // initial drop counter
export const SHOT_COOLDOWN = 12;         // frames between shots
export const FLIER_COOLDOWN = 10;        // frames between flier creation checks
export const MODE_CHANGE_FRAMES = 768;   // frames until mode switch ($300)
export const MODE_TRANSITION_DELAY = 100; // frames to let stuff clear
export const MODE_TRANSITION_SHORT = 6;  // short delay for height change
export const GUN_EXPLOSION_FRAMES = 100; // frames for gun explosion

// Difficulty constants
export const MAX_DIFFICULTY = 5;
export const BOMBS_PER_DIFFICULTY = 4;   // (difficulty + 1) * 4 bombs

// Shell constants
export const SHELL_SPEED = 4;            // base speed multiplier

// Shrapnel constants
export const MAX_SHRAPNEL = 14;          // from original (shrp_* arrays)
export const SHRAPNEL_LIFETIME = 20;     // frames

// Scoring (estimated from gameplay)
export const SCORE_HELICOPTER = 25;
export const SCORE_BOMBER = 50;
export const SCORE_PARATROOPER = 10;
export const SCORE_BOMB = 15;

// Apple II color palette (hi-res)
export const COLORS = {
  BLACK: '#000000',
  GREEN: '#00FF00',      // hi-res green
  VIOLET: '#FF00FF',     // hi-res violet/purple
  WHITE: '#FFFFFF',
  ORANGE: '#FF8000',     // hi-res orange
  BLUE: '#0080FF',       // hi-res blue
};

// Keyboard mappings (original: D=left, F=right, other=fire)
export const KEYS = {
  ROTATE_LEFT: ['KeyD', 'd', 'D'],
  ROTATE_RIGHT: ['KeyF', 'f', 'F'],
};

// Shell trajectory table (angle -> dx, dy multipliers)
// Derived from gun angles 4-52 mapping to screen directions
export const SHELL_TRAJECTORIES: { [angle: number]: { dx: number; dy: number } } = {};

// Generate trajectory table
// Angle 4 = far right (~70 degrees from vertical)
// Angle 28 = straight up (0 degrees)
// Angle 52 = far left (~-70 degrees from vertical)
for (let angle = GUN_ANGLE_MIN; angle <= GUN_ANGLE_MAX; angle++) {
  // Convert angle to radians
  // Map angle 4-52 to approximately +70 to -70 degrees from vertical
  const normalizedAngle = (angle - GUN_ANGLE_CENTER) / (GUN_ANGLE_MAX - GUN_ANGLE_CENTER);
  const radians = normalizedAngle * (70 * Math.PI / 180);

  SHELL_TRAJECTORIES[angle] = {
    dx: Math.sin(radians) * SHELL_SPEED,
    dy: -Math.cos(radians) * SHELL_SPEED, // negative because Y increases downward
  };
}
