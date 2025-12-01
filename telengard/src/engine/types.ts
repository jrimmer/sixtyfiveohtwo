// Core type definitions for Telengard

export interface Character {
  name: string;
  level: number;
  experience: number;
  gold: number;
  bankGold: number; // Gold stored at Inn (TG in original)
  currentHp: number;
  maxHp: number;
  spellUnits: number;
  maxSpellUnits: number;
  stats: Stats;
  inventory: Inventory;
  position: Position;
  spellEffects: SpellEffects;
}

export interface Stats {
  strength: number;     // ST(0)
  intelligence: number; // ST(1)
  wisdom: number;       // ST(2)
  constitution: number; // ST(3)
  dexterity: number;    // ST(4)
  charisma: number;     // ST(5)
}

export interface Inventory {
  sword: number;              // I(1) - 0 = none, positive = bonus
  armor: number;              // I(2)
  shield: number;             // I(3)
  elvenCloak: number;         // I(4)
  elvenBoots: number;         // I(5)
  ringOfRegeneration: number; // I(6)
  ringOfProtection: number;   // I(7)
  scrollOfRescue: number;     // I(8) - count
  potionOfHealing: number;    // I(9) - count
  potionOfStrength: number;   // I(10) - count
}

export interface Position {
  x: number;  // 1-200
  y: number;  // 1-200
  z: number;  // 1-50 (dungeon level)
}

export interface SpellEffects {
  strength: number;        // SF(1) - temporary strength bonus
  detectTraps: number;     // SF(2)
  light: number;           // SF(3)
  protectionFromEvil: number; // SF(4)
  levitate: number;        // SF(5)
  invisibility: number;    // SF(6)
  fear: number;            // SF(7)
  astralWalk: number;      // SF(8)
  timeStop: number;        // SF(9)
  raiseDead: number;       // SF(10)
  drunk: number;           // SF(11) - confusion from fountain
}

export interface Monster {
  id: number;           // 1-20
  name: string;
  level: number;        // ML
  currentHp: number;    // MH
  isUndead: boolean;
}

export interface Room {
  walls: WallConfiguration;
  specialType: SpecialLocationType;
  hasStairsUp: boolean;
  hasStairsDown: boolean;
}

export interface WallConfiguration {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export const SpecialLocationType = {
  None: 0,
  Inn: 1,
  Elevator: 2,
  Pit: 3,
  Teleporter: 4,
  Stairs: 5,
  Altar: 6,
  Fountain: 7,
  GrayCube: 8,
  Throne: 9,
  Safe: 10,
} as const;
export type SpecialLocationType = typeof SpecialLocationType[keyof typeof SpecialLocationType];

export const GamePhase = {
  Title: 'title',
  CharacterCreation: 'characterCreation',
  LoadCharacter: 'loadCharacter',
  Exploration: 'exploration',
  Combat: 'combat',
  SpecialLocation: 'specialLocation',
  Inn: 'inn',
  Dead: 'dead',
  Victory: 'victory',
} as const;
export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export const CombatAction = {
  Fight: 'fight',
  Cast: 'cast',
  Evade: 'evade',
  Wait: 'wait',
} as const;
export type CombatAction = typeof CombatAction[keyof typeof CombatAction];

export interface GameMessage {
  text: string;
  type: 'info' | 'combat' | 'treasure' | 'danger' | 'magic';
  timestamp: number;
}

// Spell definitions
export interface Spell {
  id: number;
  name: string;
  level: number;       // 1-6
  slot: number;        // 1-6 within level
  inCombatOnly: boolean;
  outOfCombatOnly: boolean;
}

// Inn names generator data
export interface InnNameParts {
  adjectives: string[];
  nouns: string[];
  suffixes: string[];
}

// Safe puzzle state
export interface SafeState {
  combination: [number, number, number, number]; // 1-4 for each button (R,G,Y,B)
  currentPosition: number; // 1-4
}

// Monster tracking for following monsters
export interface MonsterTracker {
  monsterId: number;
  level: number;
  hp: number;
}

// Render mode
export const RenderMode = {
  Ascii: 'ascii',
  Modern: 'modern',
} as const;
export type RenderMode = typeof RenderMode[keyof typeof RenderMode];

// Direction
export const Direction = {
  North: 'north',
  South: 'south',
  East: 'east',
  West: 'west',
  Up: 'up',
  Down: 'down',
} as const;
export type Direction = typeof Direction[keyof typeof Direction];

// Treasure type
export const TreasureType = {
  Silver: 0,
  Gold: 1,
  Gems: 2,
  Jewels: 3,
  Refuse: 4, // Nothing
} as const;
export type TreasureType = typeof TreasureType[keyof typeof TreasureType];

// Fountain water colors
export const FountainColor = {
  White: 0,
  Green: 1,
  Clear: 2,
  Red: 3,
  Black: 4,
} as const;
export type FountainColor = typeof FountainColor[keyof typeof FountainColor];
