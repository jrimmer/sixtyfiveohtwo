// Main Game component

import { useEffect, useRef, useReducer, useCallback } from 'react';
import { GameRenderer } from '../engine/renderer';
import { gameReducer, createInitialState } from '../engine/state';
import { updateGame } from '../engine/update';
import { useKeyboard } from '../hooks/useKeyboard';
import { useGameLoop } from '../hooks/useGameLoop';
import { initAudio, sounds } from '../audio/sounds';

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const input = useKeyboard();

  // Track previous state for sound triggers
  const prevStateRef = useRef(state);

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new GameRenderer(canvasRef.current);
    }
  }, []);

  // Handle visual mode switching (keys 1, 2, 3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        dispatch({ type: 'SET_VISUAL_MODE', mode: 'retro' });
      } else if (e.key === '2') {
        dispatch({ type: 'SET_VISUAL_MODE', mode: 'clean' });
      } else if (e.key === '3') {
        dispatch({ type: 'SET_VISUAL_MODE', mode: 'modern' });
      }

      // Start game on any key from title/game over screen
      if (state.screen === 'title' || state.screen === 'gameOver') {
        if (!['1', '2', '3'].includes(e.key)) {
          initAudio();
          sounds.menuSelect();
          dispatch({ type: 'START_GAME' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.screen]);

  // Game update callback
  const gameUpdate = useCallback(() => {
    const prevState = prevStateRef.current;
    const newState = updateGame(state, input);

    // Trigger sounds based on state changes
    if (newState.shell.active && !prevState.shell.active) {
      sounds.fire();
    }

    if (newState.shrapnel.length > prevState.shrapnel.length) {
      if (newState.gunExploding !== 0 && prevState.gunExploding === 0) {
        sounds.gunDestroyed();
      } else if (prevState.shrapnel.length === 0) {
        sounds.explosion();
      } else {
        sounds.smallExplosion();
      }
    }

    if (newState.sabotage.inProgress && !prevState.sabotage.inProgress) {
      sounds.sabotageStart();
    }

    // Flier sound (periodic)
    if (newState.hasActiveFlier && newState.frameCount % 8 === 0) {
      sounds.flierTick();
    }

    prevStateRef.current = newState;
    dispatch({ type: 'UPDATE_STATE', state: newState });
  }, [state, input]);

  // Run game loop
  useGameLoop(gameUpdate, true);

  // Render
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.render(state);
    }
  }, [state]);

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        tabIndex={0}
      />
      <div style={styles.instructions}>
        <p><strong>SABOTAGE</strong> - Apple II Classic</p>
        <p>D = Rotate Left | F = Rotate Right | Any Key = Fire</p>
        <p>1/2/3 = Switch Visual Mode (Retro/Clean/Modern)</p>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#111',
    padding: '20px',
  },
  canvas: {
    border: '2px solid #333',
    borderRadius: '4px',
    imageRendering: 'pixelated',
  },
  instructions: {
    marginTop: '20px',
    color: '#888',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: '14px',
  },
};
