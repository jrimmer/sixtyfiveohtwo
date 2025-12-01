import { useEffect, useCallback } from 'react';
import { useGameStore } from './state/gameState';
import { AsciiRenderer } from './renderers/AsciiRenderer';
import { ModernRenderer } from './renderers/ModernRenderer';
import { RenderMode, Direction, GamePhase, SpecialLocationType } from './engine/types';
import './App.css';

function App() {
  const {
    renderMode,
    phase,
    initGame,
    move,
    useStairs,
    fight,
    evade,
    toggleSpellList,
    useScroll,
    useHealingPotion,
    useStrengthPotion,
    setRenderMode,
    startNewGame,
    leaveInn,
    saveCharacter,
    // Location handlers
    currentLocation,
    ignoreLocation,
    handleFountainDrink,
    handleThroneAction,
    handlePitChoice,
    handleSafeButton,
    handleLocationChoice,
    handleAltarDonation,
    handleGrayCubeLevel,
    // Treasure handlers
    pendingTreasure,
    handleTreasurePickup,
    ignoreTreasure,
  } = useGameStore();

  // Initialize game on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Keyboard controls
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip game controls when typing in an input field
    const activeElement = document.activeElement;
    const isTyping = activeElement instanceof HTMLInputElement ||
                     activeElement instanceof HTMLTextAreaElement;

    if (isTyping) {
      return; // Let the input handle the keypress normally
    }

    // Prevent default for game keys
    const gameKeys = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'f', 'c', 'e', 'h', '<', '>', ',', '.'];
    if (gameKeys.includes(e.key.toLowerCase()) || gameKeys.includes(e.key)) {
      e.preventDefault();
    }

    const key = e.key.toLowerCase();

    // Toggle render mode with Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      setRenderMode(renderMode === RenderMode.Ascii ? RenderMode.Modern : RenderMode.Ascii);
      return;
    }

    // Title screen controls
    if (phase === GamePhase.Title) {
      if (key === 's') {
        startNewGame();
      }
      return;
    }

    // Exploration controls
    if (phase === GamePhase.Exploration) {
      switch (key) {
        case 'w':
        case 'arrowup':
          move(Direction.North);
          break;
        case 's':
        case 'arrowdown':
          move(Direction.South);
          break;
        case 'a':
        case 'arrowleft':
          move(Direction.West);
          break;
        case 'd':
        case 'arrowright':
          move(Direction.East);
          break;
        case '<':
        case ',':
          useStairs('up');
          break;
        case '>':
        case '.':
          useStairs('down');
          break;
        case 'c':
          toggleSpellList();
          break;
        case 'r':
          if (e.ctrlKey) {
            useScroll();
          }
          break;
        case 'h':
          if (e.ctrlKey) {
            useHealingPotion();
          }
          break;
        case 'p':
          if (e.ctrlKey) {
            useStrengthPotion();
          }
          break;
      }
    }

    // Combat controls
    if (phase === GamePhase.Combat) {
      switch (key) {
        case 'f':
          fight();
          break;
        case 'c':
          toggleSpellList();
          break;
        case 'e':
          evade();
          break;
      }
    }

    // Inn controls
    if (phase === GamePhase.Inn) {
      switch (key) {
        case 's':
          saveCharacter();
          break;
        case 'l':
          leaveInn();
          break;
      }
    }

    // Death screen controls
    if (phase === GamePhase.Dead) {
      if (key === 't') {
        initGame();
        startNewGame();
      }
    }

    // Special location controls
    if (phase === GamePhase.SpecialLocation) {
      // Common ignore key for all locations
      if (key === 'i' || key === 'escape') {
        ignoreLocation();
        return;
      }

      switch (currentLocation) {
        case SpecialLocationType.Fountain:
          if (key === 'd') handleFountainDrink();
          break;

        case SpecialLocationType.Throne:
          if (key === 'p') handleThroneAction('pry');
          else if (key === 's') handleThroneAction('sit');
          else if (key === 'r') handleThroneAction('read');
          break;

        case SpecialLocationType.Pit:
          if (key === 'd') handlePitChoice(true);
          else if (key === 's') handlePitChoice(false);
          break;

        case SpecialLocationType.Safe:
          // R=1 (Red), G=2 (Green), Y=3 (Yellow), B=4 (Blue)
          if (key === 'r') handleSafeButton(1);
          else if (key === 'g') handleSafeButton(2);
          else if (key === 'y') handleSafeButton(3);
          else if (key === 'b') handleSafeButton(4);
          break;

        case SpecialLocationType.Stairs:
          if (key === 'u') handleLocationChoice('up');
          else if (key === 'd') handleLocationChoice('down');
          else if (key === 's') handleLocationChoice('stay');
          break;

        case SpecialLocationType.Altar:
          // 'w' or Enter to worship with donation of 0 (simplified for text mode)
          if (key === 'w' || e.key === 'Enter') handleAltarDonation(0);
          break;

        case SpecialLocationType.GrayCube:
          // 'w' or Enter to walk in (random destination)
          if (key === 'w' || e.key === 'Enter') handleGrayCubeLevel(null);
          break;
      }
    }

    // Treasure prompt controls (during exploration)
    // Original uses <RET> to pick up, any movement or Space to leave
    if (phase === GamePhase.Exploration && pendingTreasure) {
      if (e.key === 'Enter') {
        handleTreasurePickup();
      } else if (e.key === ' ' || e.key === 'Escape') {
        ignoreTreasure();
      }
    }
  }, [phase, renderMode, move, useStairs, fight, evade, toggleSpellList, useScroll, useHealingPotion, useStrengthPotion, setRenderMode, startNewGame, leaveInn, saveCharacter, initGame, currentLocation, ignoreLocation, handleFountainDrink, handleThroneAction, handlePitChoice, handleSafeButton, handleLocationChoice, handleAltarDonation, handleGrayCubeLevel, pendingTreasure, handleTreasurePickup, ignoreTreasure]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Render based on mode
  if (renderMode === RenderMode.Ascii) {
    return <AsciiRenderer />;
  }

  return <ModernRenderer />;
}

export default App;
