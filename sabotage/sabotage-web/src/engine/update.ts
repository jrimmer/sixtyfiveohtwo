// Game update logic - ported from Sabotage 6502 assembly

import type {
  GameState,
  InputState,
  FlierStatus,
} from '../types/game';

import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  GUN_ANGLE_MIN,
  GUN_ANGLE_MAX,
  GUN_ANGLE_STEP,
  GUN_ANGLE_MAX_DELTA,
  GUN_X,
  GUN_Y,
  MAX_FLIERS,
  MAX_PARATROOPERS,
  FLIER_HEIGHTS,
  FLIER_HEIGHT,
  FLIER_LANE_HEIGHT,
  PARA_FALL_SPEED,
  PARA_PRE_CHUTE_SPEED,
  GROUND_Y,
  GUN_FOUNDATION_LEFT,
  GUN_FOUNDATION_RIGHT,
  PARA_HEIGHT,
  MAX_STACK_HEIGHT,
  SABOTAGE_FOUNDATION_HEIGHT,
  SABOTAGE_ADJACENT_HEIGHT,
  SABOTAGE_SIDE_COUNT,
  DROP_CHECK_INTERVAL,
  SHOT_COOLDOWN,
  MODE_CHANGE_FRAMES,
  MODE_TRANSITION_DELAY,
  MODE_TRANSITION_SHORT,
  GUN_EXPLOSION_FRAMES,
  MAX_DIFFICULTY,
  BOMBS_PER_DIFFICULTY,
  SHELL_TRAJECTORIES,
  SCORE_HELICOPTER,
  SCORE_BOMBER,
  SCORE_PARATROOPER,
  SCORE_BOMB,
} from '../constants/game';

import { createShrapnel } from './state';

// Simple RNG (mimics the original's crude RNG)
let rngState = Math.floor(Math.random() * 256);
function random(): number {
  rngState = (rngState * 5 + 1) & 0xFF;
  return rngState;
}

// Main game update function - called every frame
export function updateGame(state: GameState, input: InputState): GameState {
  if (state.screen !== 'playing') {
    return state;
  }

  // Clone state for mutation
  const newState: GameState = {
    ...state,
    fliers: state.fliers.map(f => ({ ...f })),
    paratroopers: state.paratroopers.map(p => ({ ...p })),
    bombs: state.bombs.map(b => ({ ...b })),
    shrapnel: state.shrapnel.map(s => ({ ...s })),
    shell: { ...state.shell },
    sabotage: { ...state.sabotage },
    groundHeights: [...state.groundHeights],
  };

  newState.frameCount++;

  // Handle delay counter (waiting for stuff to clear between modes)
  if (newState.delayCounter > 0) {
    newState.delayCounter--;
    // Still update some things during delay
    updateShrapnel(newState);
    updateFliers(newState);
    return newState;
  }

  // Handle gun exploding
  if (newState.gunExploding !== 0) {
    return handleGunExplosion(newState, input);
  }

  // Handle sabotage in progress
  if (newState.sabotage.inProgress) {
    updateSabotage(newState);
    return newState;
  }

  // Normal gameplay updates

  // Process input
  processInput(newState, input);

  // Update gun angle (smooth movement toward desired angle)
  updateGunAngle(newState);

  // Update shell
  if (newState.shell.active) {
    updateShell(newState);
  }

  // Check fire button
  if (input.fire && newState.shotCooldown === 0 && !newState.shell.active) {
    fireShell(newState);
  }

  // Update shot cooldown
  if (newState.shotCooldown > 0) {
    newState.shotCooldown--;
  }

  // Update fliers
  updateFliers(newState);

  // Update paratroopers
  updateParatroopers(newState);

  // Update bombs
  updateBombs(newState);

  // Update shrapnel
  updateShrapnel(newState);

  // Check for drops (every DROP_CHECK_INTERVAL frames)
  newState.dropCounter--;
  if (newState.dropCounter <= 0) {
    newState.dropCounter = DROP_CHECK_INTERVAL;
    tryDropParatrooper(newState);
    tryDropBomb(newState);
  }

  // Try to create new flier
  if (newState.flierCooldown > 0) {
    newState.flierCooldown--;
  } else {
    tryCreateFlier(newState);
  }

  // Update mode counter
  newState.modeCounter++;
  if (newState.modeCounter >= MODE_CHANGE_FRAMES) {
    handleModeChange(newState);
  }

  // Check sabotage conditions
  checkSabotage(newState);

  return newState;
}

// Process keyboard input
function processInput(state: GameState, input: InputState): void {
  if (input.rotateLeft) {
    // D key - rotate left (increase angle toward max)
    state.desiredGunAngle = Math.min(GUN_ANGLE_MAX, state.desiredGunAngle + GUN_ANGLE_STEP);
  } else if (input.rotateRight) {
    // F key - rotate right (decrease angle toward min)
    state.desiredGunAngle = Math.max(GUN_ANGLE_MIN, state.desiredGunAngle - GUN_ANGLE_STEP);
  }
}

// Update gun angle toward desired angle (with speed limit)
function updateGunAngle(state: GameState): void {
  state.prevGunAngle = state.gunAngle;

  const delta = state.desiredGunAngle - state.gunAngle;
  if (delta === 0) return;

  // Clamp delta to max speed
  const clampedDelta = Math.max(-GUN_ANGLE_MAX_DELTA, Math.min(GUN_ANGLE_MAX_DELTA, delta));
  state.gunAngle += clampedDelta;
}

// Fire a shell
function fireShell(state: GameState): void {
  const trajectory = SHELL_TRAJECTORIES[state.gunAngle];
  if (!trajectory) return;

  state.shell.active = true;
  // Start from gun barrel position
  state.shell.xHi = GUN_X;
  state.shell.xLo = 0;
  state.shell.yHi = GUN_Y - 30; // Start above gun
  state.shell.yLo = 0;

  // Set velocity (using 8.8 fixed point simulation)
  state.shell.dxHi = Math.floor(trajectory.dx);
  state.shell.dxLo = Math.floor((trajectory.dx % 1) * 256);
  state.shell.dyHi = Math.floor(trajectory.dy);
  state.shell.dyLo = Math.floor((trajectory.dy % 1) * 256);

  state.shotCooldown = SHOT_COOLDOWN;
}

// Update shell position and check collisions
function updateShell(state: GameState): void {
  const shell = state.shell;

  // Update position using 8.8 fixed point arithmetic
  let xLo = shell.xLo + shell.dxLo;
  let xHi = shell.xHi + shell.dxHi + Math.floor(xLo / 256);
  xLo = xLo & 0xFF;

  let yLo = shell.yLo + shell.dyLo;
  let yHi = shell.yHi + shell.dyHi + Math.floor(yLo / 256);
  yLo = yLo & 0xFF;

  shell.xHi = xHi;
  shell.xLo = xLo;
  shell.yHi = yHi;
  shell.yLo = yLo;

  // Check bounds
  if (xHi < 0 || xHi >= SCREEN_WIDTH || yHi < 0 || yHi >= SCREEN_HEIGHT) {
    shell.active = false;
    return;
  }

  // Check collision with fliers
  for (let i = 0; i < MAX_FLIERS; i++) {
    const flier = state.fliers[i];
    if (flier.status === 0) continue;

    const flierX = flier.xHi * 7 + flier.xLo;
    const flierY = FLIER_HEIGHTS[state.flierHeightCap] + (flier.y * FLIER_LANE_HEIGHT);

    // Simple bounding box collision
    if (xHi >= flierX && xHi <= flierX + 28 &&
        yHi >= flierY && yHi <= flierY + FLIER_HEIGHT) {
      // Hit!
      destroyFlier(state, i);
      shell.active = false;
      return;
    }
  }

  // Check collision with paratroopers
  for (let i = 0; i < MAX_PARATROOPERS; i++) {
    const para = state.paratroopers[i];
    if (para.status === 0) continue;

    const paraX = para.x * 7;
    // Simple collision
    if (xHi >= paraX && xHi <= paraX + 7 &&
        yHi >= para.y - 8 && yHi <= para.y + 8) {
      // Hit!
      destroyParatrooper(state, i);
      shell.active = false;
      return;
    }
  }

  // Check collision with bombs
  for (let i = 0; i < state.bombs.length; i++) {
    const bomb = state.bombs[i];
    if (!bomb.active) continue;

    if (Math.abs(xHi - bomb.x) < 4 && Math.abs(yHi - bomb.y) < 4) {
      // Hit bomb!
      state.bombs[i].active = false;
      state.score += SCORE_BOMB;
      state.shrapnel.push(...createShrapnel(bomb.x, bomb.y, 4));
      shell.active = false;
      return;
    }
  }
}

// Destroy a flier (helicopter or bomber)
function destroyFlier(state: GameState, index: number): void {
  const flier = state.fliers[index];
  const flierX = flier.xHi * 7 + flier.xLo;
  const flierY = FLIER_HEIGHTS[state.flierHeightCap] + (flier.y * FLIER_LANE_HEIGHT);

  // Add score based on mode
  state.score += state.mode === 'helicopter' ? SCORE_HELICOPTER : SCORE_BOMBER;

  // Create explosion
  state.shrapnel.push(...createShrapnel(flierX + 14, flierY + 5, 8));

  // Deactivate flier
  flier.status = 0;
}

// Destroy a paratrooper
function destroyParatrooper(state: GameState, index: number): void {
  const para = state.paratroopers[index];

  state.score += SCORE_PARATROOPER;
  state.shrapnel.push(...createShrapnel(para.x * 7 + 3, para.y, 4));

  para.status = 0;
}

// Update all fliers
function updateFliers(state: GameState): void {
  state.hasActiveFlier = false;

  for (let i = 0; i < MAX_FLIERS; i++) {
    const flier = state.fliers[i];
    if (flier.status === 0) continue;

    state.hasActiveFlier = true;

    // Get direction from status (even = left, odd = right)
    const movingRight = (flier.status & 1) === 1;

    // Move horizontally
    if (movingRight) {
      flier.xLo++;
      if (flier.xLo >= 7) {
        flier.xLo = 0;
        flier.xHi++;
      }
      // Check if off right edge
      if (flier.xHi >= 40) {
        flier.status = 0;
      }
    } else {
      flier.xLo--;
      if (flier.xLo < 0) {
        flier.xLo = 6;
        flier.xHi--;
      }
      // Check if off left edge
      if (flier.xHi < 0) {
        flier.status = 0;
      }
    }
  }
}

// Try to create a new flier
function tryCreateFlier(state: GameState): void {
  if (state.sabotage.inProgress || state.delayCounter > 0) {
    return;
  }

  // Check if random threshold met
  const rand = random();
  if (rand > state.flierCreateThreshold) {
    return;
  }

  // Find empty slot
  let slotIndex = -1;
  for (let i = 0; i < MAX_FLIERS; i++) {
    if (state.fliers[i].status === 0) {
      slotIndex = i;
      break;
    }
  }

  if (slotIndex === -1) return;

  const flier = state.fliers[slotIndex];

  // Randomly choose direction
  const movingRight = random() > 127;

  // Set initial position
  if (movingRight) {
    flier.xHi = 0;
    flier.xLo = 0;
    flier.status = (2 + (random() & 6) | 1) as FlierStatus; // odd = right
  } else {
    flier.xHi = 39;
    flier.xLo = 6;
    flier.status = (2 + (random() & 6) & ~1) as FlierStatus; // even = left
  }

  // Random lane
  flier.y = random() % Math.min(4, state.flierHeightCap + 1);
  flier.velocityY = 0;

  state.flierCooldown = 30 + random() % 30;
}

// Update all paratroopers
function updateParatroopers(state: GameState): void {
  for (let i = 0; i < MAX_PARATROOPERS; i++) {
    const para = state.paratroopers[i];
    if (para.status === 0) continue;

    if (para.status < 0) {
      // Pre-chute falling (status is negative distance remaining)
      para.y += PARA_PRE_CHUTE_SPEED;
      para.status++;
      if (para.status >= 0) {
        para.status = 0x80; // Switch to chute-open falling
      }
    } else if (para.status === 0x80) {
      // Falling with chute
      para.y += PARA_FALL_SPEED;

      // Check for landing
      const groundHeight = state.groundHeights[para.x] || 0;
      const landingY = GROUND_Y - (groundHeight * PARA_HEIGHT);

      if (para.y >= landingY) {
        // Landed!
        para.y = landingY;
        para.status = 0; // Deactivate (now part of ground)
        state.groundHeights[para.x]++;
      }
    }
  }
}

// Try to drop a paratrooper from a helicopter
function tryDropParatrooper(state: GameState): void {
  if (state.mode !== 'helicopter') return;
  if (state.sabotage.inProgress || state.delayCounter > 0) return;

  // Check random threshold
  if (random() > state.paraDropThreshold) return;

  // Find a helicopter to drop from
  let sourceFlier = -1;
  for (let i = 0; i < MAX_FLIERS; i++) {
    const flier = state.fliers[i];
    if (flier.status === 0) continue;
    // Random selection
    if (random() > 127 || sourceFlier === -1) {
      sourceFlier = i;
    }
  }

  if (sourceFlier === -1) return;

  // Find empty para slot
  let paraSlot = -1;
  for (let i = 0; i < MAX_PARATROOPERS; i++) {
    if (state.paratroopers[i].status === 0) {
      paraSlot = i;
      break;
    }
  }

  if (paraSlot === -1) return;

  const flier = state.fliers[sourceFlier];
  const para = state.paratroopers[paraSlot];

  // Check if drop column already has max height
  const dropCol = flier.xHi;
  if (state.groundHeights[dropCol] >= MAX_STACK_HEIGHT) return;

  // Set up paratrooper
  para.x = dropCol;
  para.y = FLIER_HEIGHTS[state.flierHeightCap] + (flier.y * FLIER_LANE_HEIGHT) + FLIER_HEIGHT;
  para.status = -10; // Fall 10 pixels before chute opens
}

// Update all bombs
function updateBombs(state: GameState): void {
  for (let i = state.bombs.length - 1; i >= 0; i--) {
    const bomb = state.bombs[i];
    if (!bomb.active) {
      state.bombs.splice(i, 1);
      continue;
    }

    bomb.y += bomb.velocityY;
    bomb.velocityY += 0.2; // Gravity

    // Check if hit ground
    if (bomb.y >= GROUND_Y) {
      bomb.active = false;
      state.shrapnel.push(...createShrapnel(bomb.x, GROUND_Y, 4));
    }

    // Check if hit gun
    const gunLeft = GUN_X - 20;
    const gunRight = GUN_X + 20;
    if (bomb.x >= gunLeft && bomb.x <= gunRight && bomb.y >= GUN_Y - 30) {
      // Bomb hit gun!
      bomb.active = false;
      state.gunExploding = 0xFF; // Start explosion
    }
  }
}

// Try to drop a bomb from a bomber
function tryDropBomb(state: GameState): void {
  if (state.mode !== 'bomber') return;
  if (state.bombsRemaining <= 0) return;
  if (state.sabotage.inProgress || state.delayCounter > 0) return;

  // Check random threshold
  if (random() > state.paraDropThreshold) return;

  // Find a bomber to drop from
  for (let i = 0; i < MAX_FLIERS; i++) {
    const flier = state.fliers[i];
    if (flier.status === 0) continue;

    // Only drop if near center (to hit gun)
    const flierX = flier.xHi;
    if (flierX >= 15 && flierX <= 25) {
      state.bombs.push({
        active: true,
        x: flierX * 7 + 14,
        y: FLIER_HEIGHTS[state.flierHeightCap] + (flier.y * FLIER_LANE_HEIGHT) + FLIER_HEIGHT,
        velocityY: 1,
      });
      state.bombsRemaining--;
      return;
    }
  }
}

// Update shrapnel particles
function updateShrapnel(state: GameState): void {
  for (let i = state.shrapnel.length - 1; i >= 0; i--) {
    const particle = state.shrapnel[i];
    if (!particle.active) {
      state.shrapnel.splice(i, 1);
      continue;
    }

    particle.x += particle.dx;
    particle.y += particle.dy;
    particle.dy += 0.1; // Gravity
    particle.life--;

    if (particle.life <= 0 || particle.y > SCREEN_HEIGHT) {
      particle.active = false;
    }
  }
}

// Handle mode change (helicopter <-> bomber)
function handleModeChange(state: GameState): void {
  state.modeCounter = 0;

  if (state.mode === 'helicopter') {
    // Transition to bomber mode
    state.delayCounter = MODE_TRANSITION_SHORT;

    // Increase flier height cap (fliers get closer to ground)
    state.flierHeightCap++;
    if (state.flierHeightCap > MAX_DIFFICULTY) {
      state.flierHeightCap = 0;
      state.delayCounter = MODE_TRANSITION_DELAY;
      state.mode = 'bomber';
      state.bombsRemaining = (state.difficulty + 1) * BOMBS_PER_DIFFICULTY;

      // Increase difficulty
      if (state.difficulty < MAX_DIFFICULTY) {
        state.difficulty++;
      }

      // Update thresholds based on difficulty
      state.paraDropThreshold = 30 + state.difficulty * 10;
      state.flierCreateThreshold = 20 + state.difficulty * 8;
    }
  } else {
    // Check if all bombs dropped
    if (state.bombsRemaining <= 0) {
      state.delayCounter = MODE_TRANSITION_DELAY;
      state.mode = 'helicopter';
      state.flierHeightCap = 0;
    }
  }
}

// Check sabotage conditions
function checkSabotage(state: GameState): void {
  if (state.gunExploding !== 0) return;
  if (state.sabotage.inProgress) return;

  // Check left side of foundation (column 16)
  if (state.groundHeights[GUN_FOUNDATION_LEFT] >= SABOTAGE_FOUNDATION_HEIGHT) {
    startSabotage(state, 1);
    return;
  }

  // Check right side of foundation (column 21)
  if (state.groundHeights[GUN_FOUNDATION_RIGHT] >= SABOTAGE_FOUNDATION_HEIGHT) {
    startSabotage(state, 2);
    return;
  }

  // Check adjacent to foundation
  if (state.groundHeights[GUN_FOUNDATION_LEFT - 1] >= SABOTAGE_ADJACENT_HEIGHT) {
    startSabotage(state, 1);
    return;
  }
  if (state.groundHeights[GUN_FOUNDATION_RIGHT + 1] >= SABOTAGE_ADJACENT_HEIGHT) {
    startSabotage(state, 2);
    return;
  }

  // Count total paras on each side
  let leftCount = 0;
  let rightCount = 0;
  for (let col = 1; col < GUN_FOUNDATION_LEFT; col++) {
    leftCount += state.groundHeights[col];
  }
  for (let col = GUN_FOUNDATION_RIGHT + 1; col < 37; col++) {
    rightCount += state.groundHeights[col];
  }

  if (leftCount >= SABOTAGE_SIDE_COUNT) {
    startSabotage(state, 1);
    return;
  }
  if (rightCount >= SABOTAGE_SIDE_COUNT) {
    startSabotage(state, 2);
    return;
  }
}

// Start sabotage animation
function startSabotage(state: GameState, side: 1 | 2): void {
  state.sabotage.inProgress = true;
  state.sabotage.side = side;

  // Find starting position for walking paratrooper
  if (side === 1) {
    // Left side - start from leftmost para stack
    for (let col = GUN_FOUNDATION_LEFT - 1; col >= 1; col--) {
      if (state.groundHeights[col] > 0) {
        state.sabotage.walkX = col * 7;
        state.sabotage.walkY = GROUND_Y - (state.groundHeights[col] * PARA_HEIGHT);
        state.groundHeights[col]--;
        break;
      }
    }
  } else {
    // Right side
    for (let col = GUN_FOUNDATION_RIGHT + 1; col < 37; col++) {
      if (state.groundHeights[col] > 0) {
        state.sabotage.walkX = col * 7;
        state.sabotage.walkY = GROUND_Y - (state.groundHeights[col] * PARA_HEIGHT);
        state.groundHeights[col]--;
        break;
      }
    }
  }

  state.sabotage.horizMovement = 7;
}

// Update sabotage animation
function updateSabotage(state: GameState): void {
  const sabo = state.sabotage;

  if (sabo.horizMovement > 0) {
    // Horizontal movement toward gun
    if (sabo.side === 1) {
      sabo.walkX += 1;
    } else {
      sabo.walkX -= 1;
    }
    sabo.horizMovement--;
  } else {
    // Climbing phase
    sabo.walkY -= 2;

    // Check if reached top of gun
    if (sabo.walkY <= GUN_Y - 30) {
      // Sabotage complete - gun explodes!
      state.gunExploding = 0xFF;
      sabo.inProgress = false;
    }
  }
}

// Handle gun explosion
function handleGunExplosion(state: GameState, _input: InputState): GameState {
  if (state.gunExploding === 0xFF) {
    // Start explosion
    state.gunExploding = GUN_EXPLOSION_FRAMES;
    state.shrapnel.push(...createShrapnel(GUN_X, GUN_Y, 12));
  } else {
    state.gunExploding--;

    // Update shrapnel during explosion
    updateShrapnel(state);

    if (state.gunExploding <= 0) {
      // Game over - go to title screen
      state.screen = 'gameOver';

      // Update high score
      if (state.score > state.highScore) {
        state.highScore = state.score;
        try {
          localStorage.setItem('sabotage_highscore', state.highScore.toString());
        } catch {
          // localStorage not available
        }
      }
    }
  }

  return state;
}
