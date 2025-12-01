// Game loop hook using requestAnimationFrame

import { useEffect, useRef, useCallback } from 'react';

const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

export function useGameLoop(callback: (deltaTime: number) => void, isRunning: boolean): void {
  const callbackRef = useRef(callback);
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const loop = useCallback((currentTime: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = currentTime;
    }

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    // Accumulate time and run fixed timestep updates
    accumulatorRef.current += deltaTime;

    // Cap accumulated time to prevent spiral of death
    if (accumulatorRef.current > FRAME_TIME * 5) {
      accumulatorRef.current = FRAME_TIME * 5;
    }

    // Run updates at fixed timestep
    while (accumulatorRef.current >= FRAME_TIME) {
      callbackRef.current(FRAME_TIME);
      accumulatorRef.current -= FRAME_TIME;
    }

    frameIdRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
      frameIdRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [isRunning, loop]);
}
