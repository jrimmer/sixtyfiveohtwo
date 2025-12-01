// Character creation and management - ported from original Applesoft BASIC
// Original code from lines 1400-1630, 18000-18080, 20300-20400

import type { Character, Stats, Inventory, SpellEffects } from './types';

/**
 * Roll 3d6 for a stat
 * Original: FOR Q1=1 TO 3: Q = Q + INT(RND(1)*6+1): NEXT
 */
export function rollStat(random: () => number): number {
  return Math.floor(random() * 6 + 1) +
         Math.floor(random() * 6 + 1) +
         Math.floor(random() * 6 + 1);
}

/**
 * Generate random stats for a new character
 */
export function rollStats(random: () => number): Stats {
  return {
    strength: rollStat(random),
    intelligence: rollStat(random),
    wisdom: rollStat(random),
    constitution: rollStat(random),
    dexterity: rollStat(random),
    charisma: rollStat(random),
  };
}

/**
 * Create a new character with rolled stats
 */
export function createCharacter(name: string, stats: Stats): Character {
  return {
    name,
    level: 1,
    experience: 0,
    gold: 0,
    bankGold: 0,
    currentHp: stats.constitution, // HP starts at CON
    maxHp: stats.constitution,
    spellUnits: 1,
    maxSpellUnits: 1,
    stats,
    inventory: createEmptyInventory(),
    position: { x: 25, y: 13, z: 1 }, // Starting position
    spellEffects: createEmptySpellEffects(),
  };
}

/**
 * Create empty inventory
 */
export function createEmptyInventory(): Inventory {
  return {
    sword: 0,
    armor: 0,
    shield: 0,
    elvenCloak: 0,
    elvenBoots: 0,
    ringOfRegeneration: 0,
    ringOfProtection: 0,
    scrollOfRescue: 0,
    potionOfHealing: 0,
    potionOfStrength: 0,
  };
}

/**
 * Create empty spell effects
 */
export function createEmptySpellEffects(): SpellEffects {
  return {
    strength: 0,
    detectTraps: 0,
    light: 0,
    protectionFromEvil: 0,
    levitate: 0,
    invisibility: 0,
    fear: 0,
    astralWalk: 0,
    timeStop: 0,
    raiseDead: 0,
    drunk: 0,
  };
}

/**
 * Calculate experience needed for next level
 * Original: 1000 * 2^LV
 */
export function experienceForLevel(level: number): number {
  return 1000 * Math.pow(2, level);
}

/**
 * Check if character should level up and apply changes
 * Original from lines 18000-18080
 *
 * Level up: EX >= 1000 * 2^LV
 * Level down: EX < 1000 * 2^(LV-1) AND LV > 1
 *
 * On level up:
 * - LV += 1
 * - HP += INT(RND(1)*CON+1)
 * - CS += LV (spell units)
 * - SU += LV (max spell units)
 */
export function checkLevelChange(
  character: Character,
  random: () => number
): { character: Character; levelChanged: boolean; hpChange: number; message: string } {
  const expForNext = experienceForLevel(character.level);
  const expForPrev = character.level > 1 ? experienceForLevel(character.level - 1) : 0;

  // Check for level up
  if (character.experience >= expForNext) {
    const hpGain = Math.floor(random() * character.stats.constitution + 1);
    const newLevel = character.level + 1;

    const newCharacter: Character = {
      ...character,
      level: newLevel,
      currentHp: character.currentHp + hpGain,
      maxHp: character.maxHp + hpGain,
      spellUnits: character.spellUnits + newLevel,
      maxSpellUnits: character.maxSpellUnits + newLevel,
    };

    // Clamp experience if it went too high
    if (newCharacter.experience >= experienceForLevel(newLevel)) {
      newCharacter.experience = experienceForLevel(newLevel) - 1;
    }

    return {
      character: newCharacter,
      levelChanged: true,
      hpChange: hpGain,
      message: `You went up a level! You gain ${hpGain} hit points!`
    };
  }

  // Check for level down
  if (character.level > 1 && character.experience < expForPrev) {
    const hpLoss = Math.floor(random() * character.stats.constitution + 1);
    const newLevel = character.level - 1;

    const newCharacter: Character = {
      ...character,
      level: newLevel,
      currentHp: Math.max(1, character.currentHp - hpLoss),
      maxHp: Math.max(1, character.maxHp - hpLoss),
      spellUnits: Math.max(0, character.spellUnits - character.level),
      maxSpellUnits: Math.max(1, character.maxSpellUnits - character.level),
    };

    return {
      character: newCharacter,
      levelChanged: true,
      hpChange: -hpLoss,
      message: `You go down a level! You lose ${hpLoss} hit points!`
    };
  }

  return { character, levelChanged: false, hpChange: 0, message: '' };
}

/**
 * Apply regeneration from Ring of Regeneration
 * Original: IF I(6) > 0 AND CH < HP THEN CH = CH + I(6)
 */
export function applyRegeneration(character: Character): Character {
  if (character.inventory.ringOfRegeneration > 0 && character.currentHp < character.maxHp) {
    return {
      ...character,
      currentHp: Math.min(
        character.maxHp,
        character.currentHp + character.inventory.ringOfRegeneration
      ),
    };
  }
  return character;
}

/**
 * Calculate player's attack roll
 * Original from line 3200:
 * I = INT(RND(1)*20) + LV + I(1) + ST(0)/2
 * Where I(1) = sword bonus, ST(0) = strength
 */
export function calculatePlayerAttack(
  character: Character,
  random: () => number
): { hit: boolean; damage: number } {
  const strengthBonus = character.spellEffects.strength > 0 ? 4 : 0;
  const roll = Math.floor(random() * 20) +
               character.level +
               character.inventory.sword +
               Math.floor(character.stats.strength / 2) +
               strengthBonus;

  const hit = roll > 13;

  if (!hit) {
    return { hit: false, damage: 0 };
  }

  // Damage: INT(RND(1)*8 + RND(1)*LV*2 + I(1) + 1)
  let damage = Math.floor(
    random() * 8 +
    random() * character.level * 2 +
    character.inventory.sword +
    1
  );

  // Strength spell bonus
  if (character.spellEffects.strength > 0) {
    damage += 5;
  }

  return { hit: true, damage };
}

/**
 * Calculate player's defense (armor class equivalent)
 */
export function getPlayerDefense(character: Character): number {
  return character.inventory.armor +
         character.inventory.shield +
         (character.inventory.ringOfProtection > 0 ? character.inventory.ringOfProtection : 0);
}

/**
 * Check if player evades successfully
 * Original from line 3700:
 * Q = INT(RND(1)*18+1)
 * IF Q < ST(4) + I(5) THEN evade (ST(4) = DEX, I(5) = elven boots)
 */
export function attemptEvade(character: Character, random: () => number): boolean {
  const roll = Math.floor(random() * 18 + 1);
  return roll < character.stats.dexterity + character.inventory.elvenBoots;
}

/**
 * Apply damage to character
 */
export function applyDamage(character: Character, damage: number): Character {
  return {
    ...character,
    currentHp: character.currentHp - damage,
  };
}

/**
 * Apply healing to character
 */
export function applyHealing(character: Character, healing: number): Character {
  return {
    ...character,
    currentHp: Math.min(character.maxHp, character.currentHp + healing),
  };
}

/**
 * Check if character is dead
 */
export function isDead(character: Character): boolean {
  return character.currentHp < 1;
}

/**
 * Use a scroll of rescue - teleport to surface
 */
export function useScrollOfRescue(character: Character): Character | null {
  if (character.inventory.scrollOfRescue < 1) {
    return null;
  }

  return {
    ...character,
    inventory: {
      ...character.inventory,
      scrollOfRescue: character.inventory.scrollOfRescue - 1,
    },
    position: { x: 25, y: 13, z: 1 },
    gold: 0, // Lose all carried gold
  };
}

/**
 * Use a potion of healing
 */
export function usePotionOfHealing(character: Character, random: () => number): Character | null {
  if (character.inventory.potionOfHealing < 1) {
    return null;
  }

  const healing = Math.floor(random() * 20 + 1);
  return {
    ...character,
    inventory: {
      ...character.inventory,
      potionOfHealing: character.inventory.potionOfHealing - 1,
    },
    currentHp: Math.min(character.maxHp, character.currentHp + healing),
  };
}

/**
 * Use a potion of strength
 */
export function usePotionOfStrength(character: Character, random: () => number): Character | null {
  if (character.inventory.potionOfStrength < 1) {
    return null;
  }

  const duration = 10 + Math.floor(random() * 20);
  return {
    ...character,
    inventory: {
      ...character.inventory,
      potionOfStrength: character.inventory.potionOfStrength - 1,
    },
    spellEffects: {
      ...character.spellEffects,
      strength: character.spellEffects.strength + duration,
    },
  };
}

/**
 * Move character in a direction
 */
export function moveCharacter(
  character: Character,
  direction: 'north' | 'south' | 'east' | 'west'
): Character {
  const newPosition = { ...character.position };

  switch (direction) {
    case 'north':
      newPosition.y = Math.max(1, newPosition.y - 1);
      break;
    case 'south':
      newPosition.y = Math.min(200, newPosition.y + 1);
      break;
    case 'east':
      newPosition.x = Math.min(200, newPosition.x + 1);
      break;
    case 'west':
      newPosition.x = Math.max(1, newPosition.x - 1);
      break;
  }

  return { ...character, position: newPosition };
}

/**
 * Move character up/down stairs
 */
export function changeLevel(character: Character, direction: 'up' | 'down'): Character {
  const newPosition = { ...character.position };

  if (direction === 'up') {
    newPosition.z = Math.max(1, newPosition.z - 1);
  } else {
    newPosition.z = Math.min(50, newPosition.z + 1);
  }

  return { ...character, position: newPosition };
}

/**
 * Inn: deposit gold to bank
 */
export function depositGold(character: Character): Character {
  return {
    ...character,
    experience: character.experience + character.gold, // Gold converts to XP
    bankGold: character.bankGold + character.gold,
    gold: 0,
  };
}

/**
 * Inn: full heal
 */
export function innHeal(character: Character): Character {
  return {
    ...character,
    currentHp: character.maxHp,
    spellEffects: createEmptySpellEffects(), // Clear all spell effects
  };
}

/**
 * Get item name for display
 */
export const ITEM_NAMES: Record<keyof Inventory, string> = {
  sword: 'SWORD',
  armor: 'ARMOR',
  shield: 'SHIELD',
  elvenCloak: 'ELVEN CLOAK',
  elvenBoots: 'ELVEN BOOTS',
  ringOfRegeneration: 'RING OF REGENERATION',
  ringOfProtection: 'RING OF PROTECTION',
  scrollOfRescue: 'SCROLL OF RESCUE',
  potionOfHealing: 'POTION OF HEALING',
  potionOfStrength: 'POTION OF STRENGTH',
};

/**
 * Get abbreviated item name for display
 */
export const ITEM_ABBREVS: Record<keyof Inventory, string> = {
  sword: 'SWORD',
  armor: 'ARMOR',
  shield: 'SHIELD',
  elvenCloak: 'ELVN CLK',
  elvenBoots: 'ELVN BTS',
  ringOfRegeneration: 'RING REG',
  ringOfProtection: 'RING PROT',
  scrollOfRescue: 'SCRL RESC',
  potionOfHealing: 'POT HEAL',
  potionOfStrength: 'POT STRG',
};

/**
 * Get stat name abbreviation
 */
export const STAT_NAMES: Record<keyof Stats, string> = {
  strength: 'STR',
  intelligence: 'INT',
  wisdom: 'WIS',
  constitution: 'CON',
  dexterity: 'DEX',
  charisma: 'CHR',
};
