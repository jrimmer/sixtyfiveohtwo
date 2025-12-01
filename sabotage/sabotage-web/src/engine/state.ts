// Game state management

import type {
  GameState,
  GameScreen,
  VisualMode,
  Shell,
  Flier,
  Paratrooper,
  Shrapnel,
  SabotageState,
} from '../types/game';

import {
  GUN_ANGLE_MAX,
  GUN_ANGLE_CENTER,
  MAX_FLIERS,
  MAX_PARATROOPERS,
  GROUND_COLUMNS,
  INITIAL_DROP_COUNTER,
  MAX_SHRAPNEL,
} from '../constants/game';

// Create initial shell state
function createInitialShell(): Shell {
  return {
    active: false,
    xHi: 0,
    xLo: 0,
    yHi: 0,
    yLo: 0,
    dxLo: 0,
    dxHi: 0,
    dyLo: 0,
    dyHi: 0,
  };
}

// Create initial flier state
function createInitialFlier(): Flier {
  return {
    status: 0,
    xHi: 0,
    xLo: 0,
    y: 0,
    velocityY: 0,
  };
}

// Create initial paratrooper state
function createInitialParatrooper(): Paratrooper {
  return {
    status: 0,
    x: 0,
    y: 0,
    newY: 0,
  };
}

// Create initial sabotage state
function createInitialSabotage(): SabotageState {
  return {
    inProgress: false,
    side: 0,
    walkX: 0,
    walkY: 0,
    horizMovement: 0,
    extraDrop: 0,
  };
}

// Create initial ground heights
// Gun foundation is at columns 16-21, starts at height 0
// Other columns start at 0 (ground level)
function createInitialGroundHeights(): number[] {
  const heights = new Array(GROUND_COLUMNS).fill(0);
  // Gun foundation columns have implicit height from the gun structure
  return heights;
}

// Create initial game state
export function createInitialState(): GameState {
  // Try to load high score from localStorage
  let highScore = 0;
  try {
    const saved = localStorage.getItem('sabotage_highscore');
    if (saved) {
      highScore = parseInt(saved, 10) || 0;
    }
  } catch {
    // localStorage not available
  }

  return {
    screen: 'title',
    mode: 'helicopter',
    visualMode: 'retro',

    score: 0,
    highScore,

    // Gun starts at far right (angle 52 from disassembly)
    gunAngle: GUN_ANGLE_MAX,
    desiredGunAngle: GUN_ANGLE_CENTER,
    prevGunAngle: GUN_ANGLE_MAX,
    gunExploding: 0,

    shell: createInitialShell(),
    fliers: Array.from({ length: MAX_FLIERS }, createInitialFlier),
    paratroopers: Array.from({ length: MAX_PARATROOPERS }, createInitialParatrooper),
    bombs: [],
    shrapnel: [],

    groundHeights: createInitialGroundHeights(),

    dropCounter: INITIAL_DROP_COUNTER,
    flierCooldown: 0,
    shotCooldown: 0,
    delayCounter: 0,
    modeCounter: 0,

    difficulty: 0,
    flierHeightCap: 0,
    paraDropThreshold: 0,
    flierCreateThreshold: 0,

    bombsRemaining: 0,

    sabotage: createInitialSabotage(),

    hasActiveFlier: false,
    frameCount: 0,
  };
}

// Reset game state for new game (preserves high score and visual mode)
export function resetGameState(state: GameState): GameState {
  const newState = createInitialState();
  newState.highScore = Math.max(state.highScore, state.score);
  newState.visualMode = state.visualMode;

  // Save high score
  try {
    localStorage.setItem('sabotage_highscore', newState.highScore.toString());
  } catch {
    // localStorage not available
  }

  return newState;
}

// Start playing
export function startGame(state: GameState): GameState {
  const newState = resetGameState(state);
  newState.screen = 'playing';
  return newState;
}

// Game action types
export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SET_VISUAL_MODE'; mode: VisualMode }
  | { type: 'UPDATE_GUN_ANGLE'; delta: number }
  | { type: 'SET_DESIRED_ANGLE'; angle: number }
  | { type: 'FIRE_SHELL' }
  | { type: 'TICK' }
  | { type: 'UPDATE_STATE'; state: Partial<GameState> };

// Game reducer
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return startGame(state);

    case 'RESET_GAME':
      return resetGameState(state);

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_VISUAL_MODE':
      return { ...state, visualMode: action.mode };

    case 'SET_DESIRED_ANGLE':
      return { ...state, desiredGunAngle: action.angle };

    case 'UPDATE_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

// Helper to add shrapnel at a position
export function createShrapnel(x: number, y: number, count: number = 8): Shrapnel[] {
  const particles: Shrapnel[] = [];
  for (let i = 0; i < count && particles.length < MAX_SHRAPNEL; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 3;
    particles.push({
      active: true,
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed - 2, // bias upward
      life: 15 + Math.floor(Math.random() * 10),
      color: Math.random() > 0.5 ? 1 : 2, // mix of colors
    });
  }
  return particles;
}
