// Game renderer - supports three visual modes

import type { GameState } from '../types/game';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  GUN_X,
  GUN_Y,
  GUN_ANGLE_CENTER,
  FLIER_HEIGHTS,
  FLIER_LANE_HEIGHT,
  GROUND_Y,
  PARA_HEIGHT,
  GUN_FOUNDATION_LEFT,
  GUN_FOUNDATION_RIGHT,
} from '../constants/game';

// Scale factor for rendering
const SCALE = 3;

// Apple II color palette for retro mode
const APPLE_COLORS = {
  black: '#000000',
  green: '#14F53C',
  violet: '#FF44FD',
  white: '#FFFFFF',
  orange: '#FF6A00',
  blue: '#14CFFD',
};

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private scanlinePattern: CanvasPattern | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Create offscreen canvas at native resolution
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = SCREEN_WIDTH;
    this.offscreenCanvas.height = SCREEN_HEIGHT;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    // Set up canvas size
    this.canvas.width = SCREEN_WIDTH * SCALE;
    this.canvas.height = SCREEN_HEIGHT * SCALE;

    // Create scanline pattern for retro mode
    this.createScanlinePattern();
  }

  private createScanlinePattern(): void {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 1;
    patternCanvas.height = 2;
    const patternCtx = patternCanvas.getContext('2d')!;
    patternCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    patternCtx.fillRect(0, 0, 1, 1);
    patternCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    patternCtx.fillRect(0, 1, 1, 1);
    this.scanlinePattern = this.ctx.createPattern(patternCanvas, 'repeat');
  }

  render(state: GameState): void {
    const ctx = this.offscreenCtx;

    // Clear screen
    ctx.fillStyle = APPLE_COLORS.black;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    if (state.screen === 'title' || state.screen === 'gameOver') {
      this.renderTitleScreen(state);
    } else {
      this.renderGame(state);
    }

    // Scale to main canvas
    this.ctx.imageSmoothingEnabled = state.visualMode !== 'retro';

    if (state.visualMode === 'retro') {
      // Pixel-perfect scaling
      this.ctx.imageSmoothingEnabled = false;
    }

    this.ctx.drawImage(
      this.offscreenCanvas,
      0, 0, SCREEN_WIDTH, SCREEN_HEIGHT,
      0, 0, this.canvas.width, this.canvas.height
    );

    // Apply scanlines for retro mode
    if (state.visualMode === 'retro' && this.scanlinePattern) {
      this.ctx.fillStyle = this.scanlinePattern;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private renderTitleScreen(state: GameState): void {
    const ctx = this.offscreenCtx;
    ctx.fillStyle = APPLE_COLORS.white;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';

    // Title
    ctx.fillText('S A B O T A G E', SCREEN_WIDTH / 2, 30);
    ctx.font = '6px monospace';
    ctx.fillText('BY MARK ALLEN', SCREEN_WIDTH / 2, 45);

    // Instructions
    ctx.fillText('CONTROLS:', SCREEN_WIDTH / 2, 70);
    ctx.fillText('D - ROTATE LEFT', SCREEN_WIDTH / 2, 85);
    ctx.fillText('F - ROTATE RIGHT', SCREEN_WIDTH / 2, 95);
    ctx.fillText('ANY OTHER KEY - FIRE', SCREEN_WIDTH / 2, 105);

    // Scores
    ctx.fillText(`HIGH SCORE: ${state.highScore}`, SCREEN_WIDTH / 2, 130);

    if (state.screen === 'gameOver') {
      ctx.fillStyle = APPLE_COLORS.orange;
      ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, 150);
      ctx.fillText(`SCORE: ${state.score}`, SCREEN_WIDTH / 2, 165);
    }

    // Start prompt
    ctx.fillStyle = APPLE_COLORS.green;
    ctx.fillText('PRESS ANY KEY TO START', SCREEN_WIDTH / 2, 180);

    // Visual mode indicator
    ctx.fillStyle = APPLE_COLORS.violet;
    ctx.font = '5px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`MODE: ${state.visualMode.toUpperCase()} (1/2/3)`, 5, SCREEN_HEIGHT - 5);
  }

  private renderGame(state: GameState): void {
    const ctx = this.offscreenCtx;

    // Draw ground line
    ctx.strokeStyle = APPLE_COLORS.green;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(SCREEN_WIDTH, GROUND_Y);
    ctx.stroke();

    // Draw gun foundation
    this.renderGunFoundation(state);

    // Draw landed paratroopers
    this.renderLandedParas(state);

    // Draw gun
    if (state.gunExploding === 0) {
      this.renderGun(state);
    }

    // Draw fliers
    this.renderFliers(state);

    // Draw paratroopers (falling)
    this.renderParatroopers(state);

    // Draw shell
    if (state.shell.active) {
      this.renderShell(state);
    }

    // Draw bombs
    this.renderBombs(state);

    // Draw shrapnel
    this.renderShrapnel(state);

    // Draw sabotage walking para
    if (state.sabotage.inProgress) {
      this.renderSabotageWalker(state);
    }

    // Draw HUD
    this.renderHUD(state);
  }

  private renderGunFoundation(_state: GameState): void {
    const ctx = this.offscreenCtx;
    ctx.fillStyle = APPLE_COLORS.green;

    // Gun base/foundation - wider platform
    const baseLeft = GUN_FOUNDATION_LEFT * 7;
    const baseRight = (GUN_FOUNDATION_RIGHT + 1) * 7;
    ctx.fillRect(baseLeft, GROUND_Y - 3, baseRight - baseLeft, 3);
  }

  private renderLandedParas(state: GameState): void {
    const ctx = this.offscreenCtx;

    for (let col = 0; col < state.groundHeights.length; col++) {
      const height = state.groundHeights[col];
      if (height === 0) continue;

      // Skip foundation columns
      if (col >= GUN_FOUNDATION_LEFT && col <= GUN_FOUNDATION_RIGHT) continue;

      const x = col * 7;
      for (let h = 0; h < height; h++) {
        const y = GROUND_Y - ((h + 1) * PARA_HEIGHT);
        this.drawLandedPara(ctx, x, y);
      }
    }
  }

  private drawLandedPara(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Simple standing paratrooper
    ctx.fillStyle = APPLE_COLORS.white;
    // Body
    ctx.fillRect(x + 2, y, 3, 6);
    // Head
    ctx.fillRect(x + 2, y - 2, 3, 2);
  }

  private renderGun(state: GameState): void {
    const ctx = this.offscreenCtx;

    // Calculate barrel angle
    const angleRange = 70; // degrees from vertical
    const normalizedAngle = (state.gunAngle - GUN_ANGLE_CENTER) / (52 - 4);
    const radians = normalizedAngle * (angleRange * Math.PI / 180);

    // Gun base
    ctx.fillStyle = APPLE_COLORS.green;
    ctx.fillRect(GUN_X - 10, GUN_Y, 20, 10);

    // Gun turret
    ctx.fillStyle = APPLE_COLORS.green;
    ctx.beginPath();
    ctx.arc(GUN_X, GUN_Y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Gun barrel
    const barrelLength = 25;
    const barrelEndX = GUN_X + Math.sin(radians) * barrelLength;
    const barrelEndY = GUN_Y - Math.cos(radians) * barrelLength;

    ctx.strokeStyle = APPLE_COLORS.green;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(GUN_X, GUN_Y);
    ctx.lineTo(barrelEndX, barrelEndY);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  private renderFliers(state: GameState): void {
    const ctx = this.offscreenCtx;

    for (const flier of state.fliers) {
      if (flier.status === 0) continue;

      const x = flier.xHi * 7 + flier.xLo;
      const y = FLIER_HEIGHTS[state.flierHeightCap] + (flier.y * FLIER_LANE_HEIGHT);

      // Direction: even = left, odd = right
      const facingRight = (flier.status & 1) === 1;

      if (state.mode === 'helicopter') {
        this.drawHelicopter(ctx, x, y, facingRight);
      } else {
        this.drawBomber(ctx, x, y, facingRight);
      }
    }
  }

  private drawHelicopter(ctx: CanvasRenderingContext2D, x: number, y: number, facingRight: boolean): void {
    ctx.fillStyle = APPLE_COLORS.violet;

    // Body
    ctx.fillRect(x + 8, y + 4, 12, 5);

    // Cockpit
    if (facingRight) {
      ctx.fillRect(x + 20, y + 3, 6, 6);
    } else {
      ctx.fillRect(x + 2, y + 3, 6, 6);
    }

    // Tail
    if (facingRight) {
      ctx.fillRect(x, y + 5, 8, 2);
      ctx.fillRect(x, y + 2, 2, 3);
    } else {
      ctx.fillRect(x + 20, y + 5, 8, 2);
      ctx.fillRect(x + 26, y + 2, 2, 3);
    }

    // Rotor (animated based on frame)
    ctx.fillStyle = APPLE_COLORS.white;
    ctx.fillRect(x + 4, y, 20, 1);

    // Skids
    ctx.fillRect(x + 8, y + 9, 2, 2);
    ctx.fillRect(x + 18, y + 9, 2, 2);
  }

  private drawBomber(ctx: CanvasRenderingContext2D, x: number, y: number, facingRight: boolean): void {
    ctx.fillStyle = APPLE_COLORS.orange;

    // Fuselage
    ctx.fillRect(x + 4, y + 4, 20, 4);

    // Nose
    if (facingRight) {
      ctx.fillRect(x + 24, y + 5, 4, 2);
    } else {
      ctx.fillRect(x, y + 5, 4, 2);
    }

    // Wings
    ctx.fillRect(x + 8, y + 2, 12, 8);

    // Tail
    if (facingRight) {
      ctx.fillRect(x, y + 2, 4, 4);
    } else {
      ctx.fillRect(x + 24, y + 2, 4, 4);
    }
  }

  private renderParatroopers(state: GameState): void {
    const ctx = this.offscreenCtx;

    for (const para of state.paratroopers) {
      if (para.status === 0) continue;

      const x = para.x * 7;
      const y = para.y;

      if (para.status < 0) {
        // Falling without chute
        this.drawFallingPara(ctx, x, y, false);
      } else {
        // Falling with chute
        this.drawFallingPara(ctx, x, y, true);
      }
    }
  }

  private drawFallingPara(ctx: CanvasRenderingContext2D, x: number, y: number, hasChute: boolean): void {
    ctx.fillStyle = APPLE_COLORS.white;

    if (hasChute) {
      // Parachute canopy
      ctx.beginPath();
      ctx.arc(x + 3, y - 8, 6, Math.PI, 0);
      ctx.fill();

      // Strings
      ctx.strokeStyle = APPLE_COLORS.white;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 8);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x + 9, y - 8);
      ctx.lineTo(x + 3, y);
      ctx.stroke();
    }

    // Body
    ctx.fillRect(x + 2, y, 3, 5);
    // Head
    ctx.fillRect(x + 2, y - 2, 3, 2);
    // Arms
    ctx.fillRect(x, y + 1, 7, 1);
    // Legs
    ctx.fillRect(x + 1, y + 5, 2, 2);
    ctx.fillRect(x + 4, y + 5, 2, 2);
  }

  private renderShell(state: GameState): void {
    const ctx = this.offscreenCtx;
    ctx.fillStyle = APPLE_COLORS.white;
    ctx.fillRect(state.shell.xHi - 1, state.shell.yHi - 1, 3, 3);
  }

  private renderBombs(state: GameState): void {
    const ctx = this.offscreenCtx;
    ctx.fillStyle = APPLE_COLORS.orange;

    for (const bomb of state.bombs) {
      if (!bomb.active) continue;
      // Bomb shape
      ctx.beginPath();
      ctx.ellipse(bomb.x, bomb.y, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderShrapnel(state: GameState): void {
    const ctx = this.offscreenCtx;

    for (const particle of state.shrapnel) {
      if (!particle.active) continue;
      ctx.fillStyle = particle.color === 1 ? APPLE_COLORS.orange : APPLE_COLORS.white;
      ctx.fillRect(particle.x, particle.y, 2, 2);
    }
  }

  private renderSabotageWalker(state: GameState): void {
    const ctx = this.offscreenCtx;
    const { walkX, walkY } = state.sabotage;

    ctx.fillStyle = APPLE_COLORS.white;
    // Walking paratrooper
    ctx.fillRect(walkX + 2, walkY, 3, 6);
    ctx.fillRect(walkX + 2, walkY - 2, 3, 2);
  }

  private renderHUD(state: GameState): void {
    const ctx = this.offscreenCtx;
    ctx.fillStyle = APPLE_COLORS.white;
    ctx.font = '6px monospace';
    ctx.textAlign = 'left';

    // Score
    ctx.fillText(`SCORE: ${state.score}`, 5, 10);

    // High score
    ctx.textAlign = 'right';
    ctx.fillText(`HI: ${state.highScore}`, SCREEN_WIDTH - 5, 10);

    // Mode indicator
    ctx.textAlign = 'center';
    ctx.fillStyle = state.mode === 'helicopter' ? APPLE_COLORS.violet : APPLE_COLORS.orange;
    ctx.fillText(state.mode.toUpperCase(), SCREEN_WIDTH / 2, 10);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
