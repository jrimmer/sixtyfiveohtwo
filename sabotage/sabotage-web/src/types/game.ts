// Game types derived from Sabotage disassembly

export type GameScreen = 'title' | 'playing' | 'gameOver';
export type GameMode = 'helicopter' | 'bomber';
export type VisualMode = 'retro' | 'clean' | 'modern';

// Flier status: 0=inactive, 2/4/6/8 based on direction and type
export type FlierStatus = 0 | 2 | 4 | 6 | 8;

// Paratrooper status
export type ParaStatus =
  | 0      // inactive
  | number // negative = falling pre-chute, positive = falling with chute, 0x80 = landed/falling, 0xff = exploding

export interface Shell {
  active: boolean;
  // 8.8 fixed-point position (high byte is screen position)
  xHi: number;
  xLo: number;
  yHi: number;
  yLo: number;
  // Velocity components
  dxLo: number;
  dxHi: number;
  dyLo: number;
  dyHi: number;
}

export interface Flier {
  status: FlierStatus;        // 0=inactive, 2/4/6/8 = active (encodes direction)
  xHi: number;                // horizontal position, high part (div 7)
  xLo: number;                // horizontal position, low part (mod 7)
  y: number;                  // vertical position (row in height table)
  velocityY: number;          // always 0 for fliers
}

export interface Paratrooper {
  status: number;             // 0=inactive, negative=pre-chute, 0x80=falling, 0xff=exploding
  x: number;                  // X position (column 0-39)
  y: number;                  // Y position (0-191)
  newY: number;               // target Y position
}

export interface Bomb {
  active: boolean;
  x: number;                  // X position
  y: number;                  // Y position
  velocityY: number;          // falling speed
}

export interface Shrapnel {
  active: boolean;
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  color: number;
}

export interface SabotageState {
  inProgress: boolean;
  side: 0 | 1 | 2;            // 0=none, 1=left, 2=right
  walkX: number;              // walking paratrooper X
  walkY: number;              // walking paratrooper Y
  horizMovement: number;      // horizontal movement steps remaining
  extraDrop: number;          // extra vertical drop
}

export interface GameState {
  screen: GameScreen;
  mode: GameMode;
  visualMode: VisualMode;

  // Scores
  score: number;
  highScore: number;

  // Gun state
  gunAngle: number;           // [4, 52] - current angle
  desiredGunAngle: number;    // target angle (from input)
  prevGunAngle: number;       // previous frame's angle (for redraw)
  gunExploding: number;       // 0=normal, 0xff=start explosion, other=countdown

  // Game objects
  shell: Shell;
  fliers: Flier[];            // 4 slots
  paratroopers: Paratrooper[]; // 8 slots
  bombs: Bomb[];              // multiple active bombs
  shrapnel: Shrapnel[];       // explosion particles

  // Ground heights (40 columns, tracks landed paratroopers)
  groundHeights: number[];

  // Counters and timers
  dropCounter: number;        // frames until next drop check
  flierCooldown: number;      // frames until next flier creation
  shotCooldown: number;       // frames until can fire again
  delayCounter: number;       // delay between mode changes
  modeCounter: number;        // counts up to 768 for mode switch

  // Difficulty
  difficulty: number;         // 0-5
  flierHeightCap: number;     // cap on flier height index (0-5)
  paraDropThreshold: number;  // higher = more likely to drop
  flierCreateThreshold: number; // higher = more likely to create

  // Bomber mode
  bombsRemaining: number;     // bombs left to drop in bomber mode

  // Sabotage
  sabotage: SabotageState;

  // Active flier flag (for sound)
  hasActiveFlier: boolean;

  // Frame counter
  frameCount: number;
}

export interface InputState {
  rotateLeft: boolean;        // D key
  rotateRight: boolean;       // F key
  fire: boolean;              // any other key
}
