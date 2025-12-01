// Zustand game state management
import { create } from 'zustand';
import type {
  Character,
  Monster,
  GameMessage,
  SafeState,
  Stats,
} from '../engine/types';
import {
  GamePhase,
  RenderMode,
  Direction,
  SpecialLocationType,
} from '../engine/types';
import {
  createCharacter,
  rollStats,
  checkLevelChange,
  applyRegeneration,
  calculatePlayerAttack,
  attemptEvade,
  applyDamage,
  applyHealing,
  isDead,
  moveCharacter,
  changeLevel,
  useScrollOfRescue,
  usePotionOfHealing,
  usePotionOfStrength,
} from '../engine/character';
import { getRoom, canMove } from '../engine/dungeon';
import { generateMonster, calculateExperience, calculateMonsterAttack } from '../engine/monsters';
import { castSpell, getSpell, tickSpellEffects, canCastLevel } from '../engine/spells';
import {
  handleSpecialLocation,
  processInnStay,
  processStairsChoice,
  generateSafeCombination,
  processSafeButton,
  processAltarWorship,
  processFountainDrink,
  processGrayCubeEntry,
  processThroneAction,
  processTreasurePickup,
  processTreasureChest,
  generateEquipmentDrop,
} from '../engine/locations';
import { FountainColor } from '../engine/types';

// Seeded random number generator for deterministic gameplay
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface GameState {
  // Core state
  phase: GamePhase;
  character: Character | null;
  currentMonster: Monster | null;
  renderMode: RenderMode;
  messages: GameMessage[];
  seed: number;
  random: () => number;

  // Location state
  currentLocation: SpecialLocationType;
  safeState: SafeState | null;
  fountainColor: FountainColor | null;

  // Treasure state
  pendingTreasure: { isChest: boolean; isTrapped: boolean } | null;

  // Character creation state
  rolledStats: Stats | null;

  // UI state
  showHelp: boolean;
  showSpellList: boolean;
  selectedSpellLevel: number;

  // Actions
  initGame: () => void;
  setRenderMode: (mode: RenderMode) => void;
  addMessage: (text: string, type: GameMessage['type']) => void;
  clearMessages: () => void;

  // Character creation
  rollNewStats: () => void;
  acceptStats: (name: string) => void;

  // Save/Load
  saveCharacter: () => void;
  loadCharacter: (name: string) => boolean;
  getSavedCharacters: () => string[];

  // Movement
  move: (direction: Direction) => void;
  useStairs: (direction: 'up' | 'down') => void;

  // Combat
  fight: () => void;
  evade: () => void;
  monsterTurn: () => void;

  // Spells
  castSpellAction: (level: number, slot: number) => void;
  setSelectedSpellLevel: (level: number) => void;
  toggleSpellList: () => void;

  // Items
  useScroll: () => void;
  useHealingPotion: () => void;
  useStrengthPotion: () => void;

  // Locations
  handleLocationChoice: (choice: string) => void;
  ignoreLocation: () => void;

  // Location-specific actions
  handleAltarDonation: (amount: number) => void;
  handleFountainDrink: () => void;
  handleGrayCubeLevel: (level: number | null) => void;
  handleThroneAction: (action: 'pry' | 'sit' | 'read' | 'ignore') => void;
  handlePitChoice: (descend: boolean) => void;
  handleSafeButton: (button: number) => void;

  // Treasure
  handleTreasurePickup: () => void;
  ignoreTreasure: () => void;

  // Inn
  leaveInn: () => void;

  // Game flow
  startNewGame: () => void;
  endTurn: () => void;
  processEncounter: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  phase: GamePhase.Title,
  character: null,
  currentMonster: null,
  renderMode: RenderMode.Ascii,
  messages: [],
  seed: Date.now(),
  random: createSeededRandom(Date.now()),
  currentLocation: SpecialLocationType.None,
  safeState: null,
  fountainColor: null,
  pendingTreasure: null,
  rolledStats: null,
  showHelp: false,
  showSpellList: false,
  selectedSpellLevel: 1,

  initGame: () => {
    const seed = Date.now();
    set({
      seed,
      random: createSeededRandom(seed),
      phase: GamePhase.Title,
      character: null,
      currentMonster: null,
      messages: [],
    });
  },

  setRenderMode: (mode) => set({ renderMode: mode }),

  addMessage: (text, type) => {
    set((state) => ({
      messages: [
        ...state.messages.slice(-50), // Keep last 50 messages
        { text, type, timestamp: Date.now() },
      ],
    }));
  },

  clearMessages: () => set({ messages: [] }),

  // Character creation
  rollNewStats: () => {
    const { random } = get();
    const stats = rollStats(random);
    set({ rolledStats: stats });
  },

  acceptStats: (name) => {
    const { rolledStats } = get();
    if (!rolledStats || !name.trim()) return;

    const character = createCharacter(name.trim().toUpperCase(), rolledStats);
    set({
      character,
      phase: GamePhase.Exploration,
      rolledStats: null,
    });
    get().addMessage('You are now descending into the depths of the Telengard dungeon...', 'info');
    get().addMessage('BEWARE...', 'danger');
  },

  // Save/Load
  saveCharacter: () => {
    const { character } = get();
    if (!character) return;

    const saves = JSON.parse(localStorage.getItem('telengard_saves') || '{}');
    saves[character.name] = character;
    localStorage.setItem('telengard_saves', JSON.stringify(saves));
    get().addMessage(`${character.name} saved.`, 'info');
  },

  loadCharacter: (name) => {
    const saves = JSON.parse(localStorage.getItem('telengard_saves') || '{}');
    const character = saves[name];

    if (!character) {
      get().addMessage('There is no such character.', 'danger');
      return false;
    }

    set({
      character,
      phase: GamePhase.Exploration,
    });
    get().addMessage(`${character.name} loaded.`, 'info');
    return true;
  },

  getSavedCharacters: () => {
    const saves = JSON.parse(localStorage.getItem('telengard_saves') || '{}');
    return Object.keys(saves);
  },

  // Movement
  move: (direction) => {
    const { character, random, phase } = get();
    if (!character || phase !== GamePhase.Exploration) return;

    const dirMap: Record<Direction, 'north' | 'south' | 'east' | 'west' | null> = {
      [Direction.North]: 'north',
      [Direction.South]: 'south',
      [Direction.East]: 'east',
      [Direction.West]: 'west',
      [Direction.Up]: null,
      [Direction.Down]: null,
    };

    const moveDir = dirMap[direction];
    if (!moveDir) return;

    // Check for confusion (drunk effect)
    let actualDir = moveDir;
    if (character.spellEffects.drunk > 0 && random() < 0.5) {
      const dirs: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
      actualDir = dirs[Math.floor(random() * 4)];
      get().addMessage("You're confused ->", 'info');
    }

    // Check if can move
    if (!canMove(character.position, actualDir)) {
      get().addMessage('NO', 'info');
      return;
    }

    const newCharacter = moveCharacter(character, actualDir);
    set({ character: newCharacter });
    get().addMessage(actualDir.toUpperCase(), 'info');
    get().endTurn();
  },

  useStairs: (direction) => {
    const { character, phase } = get();
    if (!character || phase !== GamePhase.Exploration) return;

    const room = getRoom(character.position);

    if (direction === 'up' && !room.hasStairsUp) {
      get().addMessage('No stairs up here.', 'info');
      return;
    }

    if (direction === 'down' && !room.hasStairsDown) {
      get().addMessage('No stairs down here.', 'info');
      return;
    }

    const newCharacter = changeLevel(character, direction);

    // Going to level 0 means exiting (victory/surface)
    if (newCharacter.position.z === 0) {
      get().addMessage('You see LIGHT above!', 'info');
      // Could handle victory condition here
      newCharacter.position.z = 1; // Stay on level 1 for now
    }

    set({ character: newCharacter });
    get().addMessage(direction.toUpperCase(), 'info');
    get().endTurn();
  },

  // Combat
  fight: () => {
    const { character, currentMonster, random } = get();
    if (!character || !currentMonster) return;

    const attack = calculatePlayerAttack(character, random);

    if (!attack.hit) {
      get().addMessage('You missed...', 'combat');
      get().monsterTurn();
      return;
    }

    get().addMessage(`You do ${attack.damage} points damage!`, 'combat');

    const newMonsterHp = currentMonster.currentHp - attack.damage;

    if (newMonsterHp <= 0) {
      // Monster defeated
      const xp = calculateExperience(currentMonster.level, currentMonster.id);
      let newCharacter = {
        ...character,
        experience: character.experience + xp,
      };

      get().addMessage('It died...', 'combat');
      get().addMessage(`You gain ${xp} experience points!`, 'info');

      // Chance for equipment drop (10% base + 2% per monster level)
      const dropChance = 0.10 + (currentMonster.level * 0.02);
      if (random() < dropChance) {
        const equipResult = generateEquipmentDrop(newCharacter, random);
        newCharacter = equipResult.character;
        if (equipResult.message) {
          get().addMessage(equipResult.message, 'treasure');
        }
      }

      // Check for level up
      const levelResult = checkLevelChange(newCharacter, random);
      if (levelResult.levelChanged) {
        get().addMessage(levelResult.message, 'info');
      }

      set({
        character: levelResult.character,
        currentMonster: null,
        phase: GamePhase.Exploration,
      });
      return;
    }

    set({
      currentMonster: { ...currentMonster, currentHp: newMonsterHp },
    });
    get().monsterTurn();
  },

  evade: () => {
    const { character, random } = get();
    if (!character) return;

    if (attemptEvade(character, random)) {
      get().addMessage('You evade!', 'combat');
      set({
        currentMonster: null,
        phase: GamePhase.Exploration,
      });
    } else {
      get().addMessage("You're rooted to the spot!", 'combat');
      get().monsterTurn();
    }
  },

  monsterTurn: () => {
    const { character, currentMonster, random } = get();
    if (!character || !currentMonster) return;

    const attack = calculateMonsterAttack(
      currentMonster.level,
      character.inventory.armor,
      character.inventory.shield,
      0,
      random
    );

    if (!attack.hit) {
      get().addMessage('It missed...', 'combat');
      return;
    }

    const damage = Math.floor(attack.damage * attack.damageMultiplier);
    get().addMessage(`It does ${damage} points damage!`, 'danger');

    const newCharacter = applyDamage(character, damage);
    set({ character: newCharacter });

    if (isDead(newCharacter)) {
      get().addMessage('YOU DIED!!', 'danger');

      // Check for Raise Dead spell effect
      if (newCharacter.spellEffects.raiseDead > 0) {
        if (random() < newCharacter.stats.constitution * 0.05) {
          get().addMessage('RAISE DEAD - It works!!', 'magic');
          set({
            character: {
              ...newCharacter,
              currentHp: newCharacter.maxHp,
              spellEffects: {
                ...newCharacter.spellEffects,
                raiseDead: 0,
              },
              stats: {
                ...newCharacter.stats,
                constitution: newCharacter.stats.constitution - 1,
              },
            },
          });
          return;
        }
        get().addMessage("RAISE DEAD - It doesn't work!", 'danger');
      }

      set({ phase: GamePhase.Dead });
    }
  },

  // Spells
  castSpellAction: (level, slot) => {
    const { character, currentMonster, random, phase } = get();
    if (!character) return;

    const spell = getSpell(level, slot);
    if (!spell) {
      get().addMessage('Unknown spell!', 'danger');
      return;
    }

    if (!canCastLevel(character.level, level)) {
      get().addMessage("You don't have that level spells!", 'danger');
      return;
    }

    if (character.spellUnits < level) {
      get().addMessage("You don't have enough spell units!", 'danger');
      return;
    }

    const inCombat = phase === GamePhase.Combat;
    const result = castSpell(spell, character, currentMonster, inCombat, random);

    // Deduct spell units
    let newCharacter = {
      ...character,
      spellUnits: character.spellUnits - level,
    };

    get().addMessage(result.message, 'magic');

    if (result.healing) {
      newCharacter = applyHealing(newCharacter, result.healing);
      get().addMessage(`Healed for ${result.healing} HP.`, 'magic');
    }

    if (result.effectApplied && result.effectDuration) {
      newCharacter = {
        ...newCharacter,
        spellEffects: {
          ...newCharacter.spellEffects,
          [result.effectApplied]: newCharacter.spellEffects[result.effectApplied] + result.effectDuration,
        },
      };
    }

    if (result.teleportTo) {
      newCharacter = {
        ...newCharacter,
        position: result.teleportTo,
      };
    }

    set({ character: newCharacter, showSpellList: false });

    if (inCombat && currentMonster) {
      if (result.damage) {
        const newMonsterHp = currentMonster.currentHp - result.damage;
        if (newMonsterHp <= 0) {
          const xp = calculateExperience(currentMonster.level, currentMonster.id);
          newCharacter = {
            ...newCharacter,
            experience: newCharacter.experience + xp,
          };
          get().addMessage('It died...', 'combat');
          get().addMessage(`You gain ${xp} experience points!`, 'info');

          const levelResult = checkLevelChange(newCharacter, random);
          if (levelResult.levelChanged) {
            get().addMessage(levelResult.message, 'info');
          }

          set({
            character: levelResult.character,
            currentMonster: null,
            phase: GamePhase.Exploration,
          });
          return;
        }
        set({ currentMonster: { ...currentMonster, currentHp: newMonsterHp } });
      }

      if (result.monsterKilled) {
        const xp = calculateExperience(currentMonster.level, currentMonster.id);
        newCharacter = {
          ...newCharacter,
          experience: newCharacter.experience + xp,
        };
        get().addMessage(`You gain ${xp} experience points!`, 'info');

        const levelResult = checkLevelChange(newCharacter, random);
        if (levelResult.levelChanged) {
          get().addMessage(levelResult.message, 'info');
        }

        set({
          character: levelResult.character,
          currentMonster: null,
          phase: GamePhase.Exploration,
        });
        return;
      }

      if (result.monsterFled) {
        const xp = Math.floor(calculateExperience(currentMonster.level, currentMonster.id) / 2);
        newCharacter = {
          ...newCharacter,
          experience: newCharacter.experience + xp,
        };
        get().addMessage('It runs in fear!', 'combat');

        set({
          character: newCharacter,
          currentMonster: null,
          phase: GamePhase.Exploration,
        });
        return;
      }

      // Monster's turn if spell didn't end combat
      if (result.success) {
        get().monsterTurn();
      }
    }
  },

  setSelectedSpellLevel: (level) => set({ selectedSpellLevel: level }),
  toggleSpellList: () => set((state) => ({ showSpellList: !state.showSpellList })),

  // Items
  useScroll: () => {
    const { character, phase } = get();
    if (!character || phase === GamePhase.Combat) return;

    const result = useScrollOfRescue(character);
    if (!result) {
      get().addMessage("You don't have one!!", 'danger');
      return;
    }

    get().addMessage('***ZAP!!***', 'magic');
    set({
      character: result,
      currentMonster: null,
      phase: GamePhase.Exploration,
    });
  },

  useHealingPotion: () => {
    const { character, random } = get();
    if (!character) return;

    const result = usePotionOfHealing(character, random);
    if (!result) {
      get().addMessage("You don't have one!!", 'danger');
      return;
    }

    get().addMessage('You feel better!', 'info');
    set({ character: result });
  },

  useStrengthPotion: () => {
    const { character, random } = get();
    if (!character) return;

    const result = usePotionOfStrength(character, random);
    if (!result) {
      get().addMessage("You don't have one!!", 'danger');
      return;
    }

    get().addMessage('Strength flows through your body!', 'magic');
    set({ character: result });
  },

  // Locations
  handleLocationChoice: (choice) => {
    const { character, currentLocation } = get();
    if (!character) return;

    // Handle different location-specific choices
    switch (currentLocation) {
      case SpecialLocationType.Stairs:
        if (choice === 'up' || choice === 'down' || choice === 'stay') {
          const newChar = processStairsChoice(character, choice as 'up' | 'down' | 'stay');
          set({
            character: newChar,
            currentLocation: SpecialLocationType.None,
            phase: GamePhase.Exploration,
          });
        }
        break;
      default:
        // Other locations use specific handlers
        break;
    }
  },

  ignoreLocation: () => {
    set({
      currentLocation: SpecialLocationType.None,
      safeState: null,
      fountainColor: null,
      phase: GamePhase.Exploration,
    });
  },

  handleAltarDonation: (amount) => {
    const { character, random } = get();
    if (!character) return;

    if (amount > character.gold) {
      get().addMessage("You don't have that much gold!", 'danger');
      return;
    }

    const newChar = { ...character, gold: character.gold - amount };
    const result = processAltarWorship(newChar, amount, random);

    get().addMessage(result.message, result.triggerEncounter ? 'danger' : 'magic');

    if (result.triggerEncounter) {
      // Spawn a monster
      const monster = generateMonster(character.position.z + 2, random);
      if (monster) {
        set({
          character: result.character,
          currentLocation: SpecialLocationType.None,
          currentMonster: monster,
          phase: GamePhase.Combat,
        });
        get().addMessage(`A ${monster.name} appears!`, 'danger');
        return;
      }
    }

    set({
      character: result.character,
      currentLocation: SpecialLocationType.None,
      phase: GamePhase.Exploration,
    });
  },

  handleFountainDrink: () => {
    const { character, fountainColor, random } = get();
    if (!character || fountainColor === null) return;

    const result = processFountainDrink(character, fountainColor, random);
    get().addMessage(result.message, result.nextPhase === 'dead' ? 'danger' : 'magic');

    if (result.nextPhase === 'dead') {
      set({
        character: result.character,
        currentLocation: SpecialLocationType.None,
        fountainColor: null,
        phase: GamePhase.Dead,
      });
      return;
    }

    set({
      character: result.character,
      currentLocation: SpecialLocationType.None,
      fountainColor: null,
      phase: GamePhase.Exploration,
    });
  },

  handleGrayCubeLevel: (level) => {
    const { character, random } = get();
    if (!character) return;

    const result = processGrayCubeEntry(character, level, random);
    get().addMessage(result.message, 'magic');

    set({
      character: result.character,
      currentLocation: SpecialLocationType.None,
      phase: GamePhase.Exploration,
    });
    get().addMessage(`You are now on level ${result.character.position.z}.`, 'info');
  },

  handleThroneAction: (action) => {
    const { character, random } = get();
    if (!character) return;

    if (action === 'ignore') {
      set({
        currentLocation: SpecialLocationType.None,
        phase: GamePhase.Exploration,
      });
      return;
    }

    const result = processThroneAction(character, action, random);
    if (result.message) {
      get().addMessage(result.message, result.triggerEncounter ? 'danger' : 'info');
    }

    if (result.triggerEncounter) {
      // Monster King appears
      const monster = generateMonster(character.position.z + 5, random);
      if (monster) {
        monster.name = 'MONSTER KING';
        monster.level = Math.max(monster.level, character.position.z + 3);
        set({
          character: result.character,
          currentLocation: SpecialLocationType.None,
          currentMonster: monster,
          phase: GamePhase.Combat,
        });
        return;
      }
    }

    set({
      character: result.character,
      currentLocation: SpecialLocationType.None,
      phase: GamePhase.Exploration,
    });
  },

  handlePitChoice: (descend) => {
    const { character, random } = get();
    if (!character) return;

    if (!descend) {
      set({
        currentLocation: SpecialLocationType.None,
        phase: GamePhase.Exploration,
      });
      return;
    }

    // Descend into pit
    const newZ = Math.min(50, character.position.z + 1);
    const damage = character.spellEffects.levitate > 0 ? 0 : Math.floor(random() * character.position.z + 1);

    const newCharacter = {
      ...character,
      currentHp: character.currentHp - damage,
      position: { ...character.position, z: newZ },
    };

    if (damage > 0) {
      get().addMessage(`You descend and suffer ${damage} points of damage!`, 'danger');
    } else {
      get().addMessage('You float gently down.', 'info');
    }

    if (newCharacter.currentHp < 1) {
      set({
        character: newCharacter,
        currentLocation: SpecialLocationType.None,
        phase: GamePhase.Dead,
      });
      return;
    }

    set({
      character: newCharacter,
      currentLocation: SpecialLocationType.None,
      phase: GamePhase.Exploration,
    });
  },

  handleSafeButton: (button) => {
    const { character, safeState, random } = get();
    if (!character || !safeState) return;

    const result = processSafeButton(character, safeState, button, random);
    get().addMessage(result.result.message, result.opened ? 'treasure' : (result.result.nextPhase === 'dead' ? 'danger' : 'info'));

    if (result.result.nextPhase === 'dead') {
      set({
        character: result.result.character,
        safeState: null,
        currentLocation: SpecialLocationType.None,
        phase: GamePhase.Dead,
      });
      return;
    }

    if (result.opened) {
      set({
        character: result.result.character,
        safeState: null,
        currentLocation: SpecialLocationType.None,
        phase: GamePhase.Exploration,
      });
      return;
    }

    set({
      character: result.result.character,
      safeState: result.safeState,
    });
  },

  handleTreasurePickup: () => {
    const { character, pendingTreasure, random } = get();
    if (!character || !pendingTreasure) return;

    let result;
    if (pendingTreasure.isChest) {
      result = processTreasureChest(character, pendingTreasure.isTrapped, random);
    } else {
      result = processTreasurePickup(character, pendingTreasure.isTrapped, random);
    }

    get().addMessage(result.message, result.nextPhase === 'dead' ? 'danger' : 'treasure');

    if (result.nextPhase === 'dead') {
      set({
        character: result.character,
        pendingTreasure: null,
        phase: GamePhase.Dead,
      });
      return;
    }

    set({
      character: result.character,
      pendingTreasure: null,
    });
  },

  ignoreTreasure: () => {
    set({ pendingTreasure: null });
  },

  // Inn
  leaveInn: () => {
    const { character } = get();
    if (!character) return;

    const newCharacter = processInnStay(character);
    set({
      character: newCharacter,
      phase: GamePhase.Exploration,
      currentLocation: SpecialLocationType.None,
    });
    get().addMessage('You spend the night. You feel better!', 'info');
  },

  // Game flow
  startNewGame: () => {
    set({
      phase: GamePhase.CharacterCreation,
      character: null,
      currentMonster: null,
      messages: [],
    });
    get().rollNewStats();
  },

  endTurn: () => {
    const { character } = get();
    if (!character) return;

    // Apply regeneration
    let newCharacter = applyRegeneration(character);

    // Tick spell effects
    newCharacter = {
      ...newCharacter,
      spellEffects: tickSpellEffects(newCharacter.spellEffects),
    };

    set({ character: newCharacter });

    // Check for encounters and special locations
    get().processEncounter();
  },

  processEncounter: () => {
    const { character, random } = get();
    if (!character) return;

    const room = getRoom(character.position);

    // Check for special location
    if (room.specialType !== SpecialLocationType.None) {
      const result = handleSpecialLocation(room.specialType, character, random);
      get().addMessage(result.message, 'info');

      if (result.nextPhase === 'inn') {
        set({
          character: result.character,
          phase: GamePhase.Inn,
          currentLocation: room.specialType,
        });
        return;
      }

      if (result.nextPhase === 'dead') {
        set({
          character: result.character,
          phase: GamePhase.Dead,
        });
        return;
      }

      if (result.requiresInput) {
        // Set up location-specific state
        let fountainColor: FountainColor | null = null;
        let safeState: SafeState | null = null;

        if (room.specialType === SpecialLocationType.Fountain) {
          // Extract color from message
          const colorMatch = result.message.match(/running (\w+) water/);
          if (colorMatch) {
            const colorName = colorMatch[1].toUpperCase();
            const colorMap: Record<string, FountainColor> = {
              'WHITE': FountainColor.White,
              'GREEN': FountainColor.Green,
              'CLEAR': FountainColor.Clear,
              'RED': FountainColor.Red,
              'BLACK': FountainColor.Black,
            };
            fountainColor = colorMap[colorName] ?? FountainColor.Clear;
          }
        }

        if (room.specialType === SpecialLocationType.Safe) {
          safeState = generateSafeCombination(random);
        }

        set({
          currentLocation: room.specialType,
          phase: GamePhase.SpecialLocation,
          safeState,
          fountainColor,
        });
        return;
      }

      set({ character: result.character });
    }

    // Check for random monster encounter (30% base chance)
    if (random() < 0.3) {
      // Skip if invisible and lucky
      if (character.spellEffects.invisibility > 0 && random() < 0.2) {
        return;
      }

      // Skip if time stop active
      if (character.spellEffects.timeStop > 0) {
        return;
      }

      const monster = generateMonster(character.position.z, random);
      if (monster) {
        get().addMessage(
          `You have encountered a LVL ${monster.level} ${monster.name}!`,
          'danger'
        );
        set({
          currentMonster: monster,
          phase: GamePhase.Combat,
        });
        return;
      }
    }

    // Check for treasure (20% chance if no monster)
    if (!get().currentMonster && random() < 0.2) {
      const isChest = random() < 0.3;
      const isTrapped = random() < 0.15;
      const detectTraps = character.spellEffects.detectTraps > 0;

      if (isChest) {
        let msg = 'You find a treasure chest!!';
        if (isTrapped && detectTraps && random() < 0.5) {
          msg += ' You detect a trap!';
        }
        get().addMessage(msg, 'treasure');
      } else {
        const treasures = ['SILVER', 'GOLD', 'GEMS', 'JEWELS'];
        const treasure = treasures[Math.floor(random() * 4)];
        let msg = `You see some ${treasure}.`;
        if (isTrapped && detectTraps && random() < 0.5) {
          msg += ' You detect a trap!';
        }
        get().addMessage(msg, 'treasure');
      }

      set({
        pendingTreasure: { isChest, isTrapped },
      });
    }
  },
}));
