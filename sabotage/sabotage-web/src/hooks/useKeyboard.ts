// Keyboard input hook - based on original Sabotage controls

import { useEffect, useRef, useCallback } from 'react';
import type { InputState } from '../types/game';
import { KEYS } from '../constants/game';

export function useKeyboard(): InputState {
  const inputRef = useRef<InputState>({
    rotateLeft: false,
    rotateRight: false,
    fire: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default for game keys
    if (['KeyD', 'KeyF', 'Space', 'Enter'].includes(e.code)) {
      e.preventDefault();
    }

    const key = e.key;
    const code = e.code;

    if (KEYS.ROTATE_LEFT.includes(key) || KEYS.ROTATE_LEFT.includes(code)) {
      inputRef.current.rotateLeft = true;
    } else if (KEYS.ROTATE_RIGHT.includes(key) || KEYS.ROTATE_RIGHT.includes(code)) {
      inputRef.current.rotateRight = true;
    } else {
      // Any other key fires
      inputRef.current.fire = true;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    const code = e.code;

    if (KEYS.ROTATE_LEFT.includes(key) || KEYS.ROTATE_LEFT.includes(code)) {
      inputRef.current.rotateLeft = false;
    } else if (KEYS.ROTATE_RIGHT.includes(key) || KEYS.ROTATE_RIGHT.includes(code)) {
      inputRef.current.rotateRight = false;
    } else {
      inputRef.current.fire = false;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return inputRef.current;
}
