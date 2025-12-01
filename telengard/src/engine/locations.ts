// Special location handlers - ported from original Applesoft BASIC
// Original code from lines 6000-7185

import type { Character, SafeState } from './types';
import { SpecialLocationType, FountainColor } from './types';
import { generateInnName } from './dungeon';

export interface LocationResult {
  character: Character;
  message: string;
  requiresInput?: boolean;
  inputPrompt?: string;
  options?: string[];
  nextPhase?: 'exploration' | 'combat' | 'inn' | 'dead';
  triggerEncounter?: boolean;
}

/**
 * Handle entering a special location
 */
export function handleSpecialLocation(
  locationType: SpecialLocationType,
  character: Character,
  random: () => number
): LocationResult {
  switch (locationType) {
    case SpecialLocationType.Inn:
      return handleInn(character);
    case SpecialLocationType.Elevator:
      return handleElevator(character);
    case SpecialLocationType.Pit:
      return handlePit(character, random);
    case SpecialLocationType.Teleporter:
      return handleTeleporter(character, random);
    case SpecialLocationType.Stairs:
      return handleStairs(character);
    case SpecialLocationType.Altar:
      return handleAltar(character, random);
    case SpecialLocationType.Fountain:
      return handleFountain(character, random);
    case SpecialLocationType.GrayCube:
      return handleGrayCube(character, random);
    case SpecialLocationType.Throne:
      return handleThrone(character, random);
    case SpecialLocationType.Safe:
      return handleSafe(character, random);
    default:
      return { character, message: '' };
  }
}

/**
 * Inn (lines 6103-6145)
 * - Cash in gold to experience
 * - Full heal
 * - Clear spell effects
 * - Save character
 */
function handleInn(character: Character): LocationResult {
  const innName = generateInnName(character.position.x, character.position.y);

  return {
    character,
    message: `You have found the ${innName}!`,
    nextPhase: 'inn',
  };
}

/**
 * Process staying at inn
 */
export function processInnStay(character: Character): Character {
  return {
    ...character,
    experience: character.experience + character.gold,
    bankGold: character.bankGold + character.gold,
    gold: 0,
    currentHp: character.maxHp,
    spellUnits: character.maxSpellUnits,
    spellEffects: {
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
    },
  };
}

/**
 * Elevator - move down one level (lines 6200)
 */
function handleElevator(character: Character): LocationResult {
  const newCharacter: Character = {
    ...character,
    position: {
      ...character.position,
      z: Math.min(50, character.position.z + 1),
    },
  };

  return {
    character: newCharacter,
    message: 'You feel heavy for a moment...',
  };
}

/**
 * Pit - may fall in or descend voluntarily (lines 6300-6335)
 */
function handlePit(character: Character, random: () => number): LocationResult {
  // Check if levitating
  if (character.spellEffects.levitate > 0) {
    return {
      character,
      message: 'You are hovering over a pit.',
      requiresInput: true,
      inputPrompt: 'Do you want to descend?',
      options: ['Yes', 'No'],
    };
  }

  // Dexterity check to avoid falling
  const roll = Math.floor(random() * 20);
  if (roll < character.stats.dexterity + character.inventory.elvenBoots) {
    return {
      character,
      message: 'You see a pit. Do you want to descend?',
      requiresInput: true,
      inputPrompt: 'Do you want to descend?',
      options: ['Yes', 'No'],
    };
  }

  // Fall in!
  const damage = Math.floor(random() * 3 * character.position.z + 1);
  const newCharacter: Character = {
    ...character,
    currentHp: character.currentHp - damage,
    position: {
      ...character.position,
      z: Math.min(50, character.position.z + 1),
    },
  };

  return {
    character: newCharacter,
    message: `You fall in!! You suffer ${damage} points of damage!`,
    nextPhase: newCharacter.currentHp < 1 ? 'dead' : undefined,
  };
}

/**
 * Teleporter - random teleportation (lines 6400-6440)
 */
function handleTeleporter(character: Character, random: () => number): LocationResult {
  // Random direction changes based on position hash
  let newX = character.position.x + character.position.z * 8 + character.position.y * 13;
  let newY = character.position.y + character.position.z * 6 + character.position.x * 17;
  let newZ = character.position.z;

  // Some chance to change level
  if (random() < 0.3) {
    newZ = character.position.z + (random() < 0.5 ? 1 : -1);
  }

  // Wrap coordinates
  while (newX > 200) newX -= 200;
  while (newY > 200) newY -= 200;
  while (newX < 1) newX += 200;
  while (newY < 1) newY += 200;
  newZ = Math.max(1, Math.min(50, newZ));

  // Continue teleporting with 60% chance
  if (random() < 0.6) {
    newX = Math.floor(random() * 200) + 1;
    newY = Math.floor(random() * 200) + 1;
  }

  const newCharacter: Character = {
    ...character,
    position: { x: newX, y: newY, z: newZ },
  };

  return {
    character: newCharacter,
    message: "ZZAP!! You've been teleported..",
  };
}

/**
 * Stairs - up/down navigation (lines 6500-6550)
 */
function handleStairs(character: Character): LocationResult {
  const canGoUp = character.position.z > 1;
  const canGoDown = character.position.z < 50;

  let message = 'You found a circular stairway.';
  if (canGoUp && character.position.z === 1) {
    message += ' You see LIGHT above!';
  }

  return {
    character,
    message,
    requiresInput: true,
    inputPrompt: 'Do you want to go (U)p, (D)own, or (S)tay?',
    options: canGoUp && canGoDown ? ['Up', 'Down', 'Stay'] :
             canGoUp ? ['Up', 'Stay'] :
             canGoDown ? ['Down', 'Stay'] : ['Stay'],
  };
}

/**
 * Process stairs choice
 */
export function processStairsChoice(character: Character, choice: 'up' | 'down' | 'stay'): Character {
  if (choice === 'stay') return character;

  const newZ = choice === 'up'
    ? Math.max(0, character.position.z - 1) // z=0 means surface/exit
    : Math.min(50, character.position.z + 1);

  return {
    ...character,
    position: { ...character.position, z: newZ },
  };
}

/**
 * Altar - worship for spell effects (lines 6600-6680)
 */
function handleAltar(character: Character, _random: () => number): LocationResult {
  return {
    character,
    message: 'You have found a holy altar.',
    requiresInput: true,
    inputPrompt: 'Press <RET> to worship',
    options: ['Worship', 'Ignore'],
  };
}

/**
 * Process altar worship
 */
export function processAltarWorship(
  character: Character,
  donation: number,
  random: () => number
): LocationResult {
  if (donation < 50 * character.position.z) {
    // Too little donation - might anger the gods
    if (random() < 0.3) {
      return {
        character,
        message: 'DIRTY PAGAN TRASH!',
        triggerEncounter: true, // Monster appears
      };
    }
    return {
      character,
      message: 'Thank you for your donation.',
    };
  }

  // Good donation - chance for blessing
  const newCharacter = { ...character, gold: character.gold - donation };

  if (random() > donation / (character.gold + donation)) {
    return {
      character: newCharacter,
      message: 'Thank you for your donation.',
    };
  }

  // Grant a random spell effect
  const effectIndex = Math.floor(random() * 7) + 1;
  const duration = Math.floor(random() * 100 * donation / (character.gold + donation) + 1);

  const effects = { ...newCharacter.spellEffects };
  const effectNames = ['strength', 'detectTraps', 'light', 'protectionFromEvil', 'levitate', 'invisibility', 'fear'] as const;
  const effectName = effectNames[effectIndex - 1];

  if (effects[effectName] < 0) effects[effectName] = 0;
  effects[effectName] += duration;

  return {
    character: { ...newCharacter, spellEffects: effects },
    message: "You've been heard!",
  };
}

/**
 * Fountain - drink for random effects (lines 6700-6786)
 */
function handleFountain(character: Character, random: () => number): LocationResult {
  const colorIndex = Math.floor(random() * 5);
  const colors = ['WHITE', 'GREEN', 'CLEAR', 'RED', 'BLACK'];
  const color = colors[colorIndex];

  return {
    character,
    message: `You have found a fountain with running ${color} water.`,
    requiresInput: true,
    inputPrompt: '<RET> to drink some',
    options: ['Drink', 'Ignore'],
  };
}

/**
 * Process fountain drink
 */
export function processFountainDrink(
  character: Character,
  color: FountainColor,
  random: () => number
): LocationResult {
  // 60% chance of nothing
  if (random() > 0.6) {
    return { character, message: 'You feel refreshed!' };
  }

  // Various effects based on color and random chance
  const effect = random();

  if (effect < 0.15 * (color + 1)) {
    // Healing
    const healing = Math.floor(random() * 3 * character.position.z + 1);
    return {
      character: {
        ...character,
        currentHp: Math.min(character.maxHp, character.currentHp + healing),
      },
      message: `You feel better! You heal ${healing} points.`,
    };
  }

  if (effect < 0.15 * color) {
    // Poison
    const damage = Math.floor(random() * 3 * character.position.z + 1);
    const newCharacter = {
      ...character,
      currentHp: character.currentHp - damage,
    };
    return {
      character: newCharacter,
      message: `It's poison!!! You lose ${damage} hit points!`,
      nextPhase: newCharacter.currentHp < 1 ? 'dead' : undefined,
    };
  }

  if (random() < 0.5) {
    // Gain/lose experience
    const xpChange = Math.floor(random() * 500 * character.position.z + 1);
    if (random() < 0.5) {
      return {
        character: { ...character, experience: character.experience + xpChange },
        message: `You just gained ${xpChange} experience points!`,
      };
    }
    return {
      character: { ...character, experience: Math.max(0, character.experience - xpChange) },
      message: `You just lost ${xpChange} experience points!`,
    };
  }

  if (random() < 0.4) {
    // Spell units
    const suGain = Math.floor(random() * 4 * character.position.z + 1);
    return {
      character: { ...character, spellUnits: character.spellUnits + suGain },
      message: `Magical power surges through your body! You now have ${character.spellUnits + suGain} spells.`,
    };
  }

  if (random() < 0.5) {
    // Get drunk!
    const drunkDuration = Math.floor(random() * 16 + 1);
    return {
      character: {
        ...character,
        spellEffects: { ...character.spellEffects, drunk: drunkDuration },
      },
      message: "You feel refreshed! Actually you're drunk!!",
    };
  }

  // Lose all items
  return {
    character: {
      ...character,
      inventory: {
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
      },
    },
    message: 'You have been dispossessed!!',
  };
}

/**
 * Gray Cube - warp to any level (lines 6800-6820)
 */
function handleGrayCube(character: Character, _random: () => number): LocationResult {
  return {
    character,
    message: 'You see a large gray misty cube.',
    requiresInput: true,
    inputPrompt: '<RET> to walk in',
    options: ['Enter', 'Ignore'],
  };
}

/**
 * Process gray cube entry
 */
export function processGrayCubeEntry(
  character: Character,
  targetLevel: number | null,
  random: () => number
): LocationResult {
  const newZ = targetLevel !== null
    ? Math.max(1, Math.min(50, targetLevel))
    : Math.floor(random() * 50) + 1;

  return {
    character: {
      ...character,
      position: { ...character.position, z: newZ },
    },
    message: 'You float in space....',
  };
}

/**
 * Throne - pry jewels, sit, or read runes (lines 6900-7035)
 */
function handleThrone(character: Character, _random: () => number): LocationResult {
  return {
    character,
    message: 'You see a jewel encrusted throne.',
    requiresInput: true,
    inputPrompt: 'Do you want to (P)ry some jewels, (S)it down, (R)ead the runes, or (I)gnore?',
    options: ['Pry', 'Sit', 'Read', 'Ignore'],
  };
}

/**
 * Process throne action
 */
export function processThroneAction(
  character: Character,
  action: 'pry' | 'sit' | 'read' | 'ignore',
  random: () => number
): LocationResult {
  if (action === 'ignore') {
    return { character, message: '' };
  }

  // 30% chance monster king appears for any action
  if (random() < 0.3) {
    return {
      character,
      message: 'The MONSTER KING returns!!',
      triggerEncounter: true,
    };
  }

  if (action === 'pry') {
    if (random() < 0.4) {
      return { character, message: 'Nothing happens...' };
    }
    const goldGain = Math.floor(random() * 1000 * character.position.z + 1);
    return {
      character: { ...character, gold: character.gold + goldGain },
      message: `They pop into your greedy hands!! They are worth ${goldGain} gold!`,
    };
  }

  if (action === 'sit') {
    if (random() < 0.6) {
      return { character, message: 'Nothing happens...' };
    }
    if (random() < 0.4) {
      // Teleport
      return handleTeleporter(character, random);
    }
    // Gong sounds - XP change
    if (random() < 0.6) {
      const xpLoss = Math.floor(character.experience / 2);
      return {
        character: { ...character, experience: Math.max(0, character.experience - xpLoss) },
        message: 'A loud gong sounds!',
      };
    }
    const xpGain = 1000 * Math.pow(2, character.level);
    return {
      character: { ...character, experience: character.experience + xpGain },
      message: 'A loud gong sounds!',
    };
  }

  if (action === 'read') {
    // Intelligence check
    if (random() > character.stats.intelligence * 0.05) {
      return { character, message: "You don't understand them..." };
    }
    // Random stat change
    const statNames = ['strength', 'intelligence', 'wisdom', 'constitution', 'dexterity', 'charisma'] as const;
    const statIndex = Math.floor(random() * 6);
    const statName = statNames[statIndex];
    const stats = { ...character.stats };

    if (random() < 0.5) {
      if (stats[statName] < 18) {
        stats[statName]++;
        return {
          character: { ...character, stats },
          message: `A mysterious magic grips you.. Your ${statName.toUpperCase()} goes up by 1!`,
        };
      }
    } else {
      if (stats[statName] > 3) {
        stats[statName]--;
        return {
          character: { ...character, stats },
          message: `A mysterious magic grips you.. Your ${statName.toUpperCase()} goes down by 1!`,
        };
      }
    }
    return { character, message: "You don't understand them..." };
  }

  return { character, message: '' };
}

/**
 * Safe - 4-button color puzzle (lines 7100-7185)
 */
function handleSafe(character: Character, _random: () => number): LocationResult {
  return {
    character,
    message: 'You see a small box with four lights.',
    requiresInput: true,
    inputPrompt: '(P)ush buttons or (I)gnore?',
    options: ['Push', 'Ignore'],
  };
}

/**
 * Generate safe combination
 */
export function generateSafeCombination(random: () => number): SafeState {
  return {
    combination: [
      Math.floor(random() * 4) + 1,
      Math.floor(random() * 4) + 1,
      Math.floor(random() * 4) + 1,
      Math.floor(random() * 4) + 1,
    ],
    currentPosition: 1,
  };
}

/**
 * Process safe button press
 * Colors: 1=Red, 2=Green, 3=Yellow, 4=Blue
 */
export function processSafeButton(
  character: Character,
  safeState: SafeState,
  buttonPressed: number, // 1-4
  random: () => number
): { result: LocationResult; safeState: SafeState; opened: boolean } {
  const correctButton = safeState.combination[safeState.currentPosition - 1];

  if (buttonPressed !== correctButton) {
    // Wrong button - electric shock
    const damage = Math.floor(random() * 2 * character.position.z + 1);
    const newCharacter = {
      ...character,
      currentHp: character.currentHp - damage,
    };
    return {
      result: {
        character: newCharacter,
        message: `An electric bolt shoots through you!! You suffer ${damage} points damage!`,
        nextPhase: newCharacter.currentHp < 1 ? 'dead' : undefined,
      },
      safeState,
      opened: false,
    };
  }

  // Correct button
  const newPosition = safeState.currentPosition + 1;

  if (newPosition > 4) {
    // Safe opened!
    const goldGain = Math.floor(random() * 20000 * Math.pow(character.position.z, 2) + 1);
    return {
      result: {
        character: { ...character, gold: character.gold + goldGain },
        message: `It opens!!!! Inside you find jewels worth ${goldGain} in gold!!`,
      },
      safeState: { ...safeState, currentPosition: newPosition },
      opened: true,
    };
  }

  return {
    result: {
      character,
      message: `${['RED', 'GREEN', 'YELLOW', 'BLUE'][buttonPressed - 1]} - correct!`,
    },
    safeState: { ...safeState, currentPosition: newPosition },
    opened: false,
  };
}

/**
 * Handle treasure found on ground
 */
export function handleTreasure(
  character: Character,
  trapped: boolean,
  random: () => number
): LocationResult {
  const treasureTypes = ['SILVER', 'GOLD', 'GEMS', 'JEWELS', 'REFUSE'];
  const typeIndex = Math.floor(random() * 5);

  if (typeIndex === 4) {
    return { character, message: 'You see some REFUSE.' };
  }

  const treasureType = treasureTypes[typeIndex];
  let message = `You see some ${treasureType}.`;

  if (trapped && character.spellEffects.detectTraps > 0 && random() < 0.1) {
    message += ' You detect traps!';
  }

  return {
    character,
    message,
    requiresInput: true,
    inputPrompt: '<RET> to pick it up',
    options: ['Pick up', 'Leave it'],
  };
}

/**
 * Process picking up treasure
 */
export function processTreasurePickup(
  character: Character,
  trapped: boolean,
  random: () => number
): LocationResult {
  let newCharacter = { ...character };

  if (trapped) {
    const damage = Math.floor(random() * 3 * character.position.z + 1);
    newCharacter = {
      ...newCharacter,
      currentHp: character.currentHp - damage,
    };

    if (newCharacter.currentHp < 1) {
      return {
        character: newCharacter,
        message: `It's trapped! You suffer ${damage} points of damage!`,
        nextPhase: 'dead',
      };
    }
  }

  const goldValue = Math.floor(random() * 5 * character.position.z * 200 + 1);
  newCharacter = { ...newCharacter, gold: newCharacter.gold + goldValue };
  let message = `It's worth ${goldValue} gold!`;

  // Chance for equipment drop (15% chance, scaled by dungeon level)
  if (random() < 0.15) {
    const equipResult = generateEquipmentDrop(newCharacter, random);
    newCharacter = equipResult.character;
    if (equipResult.message) {
      message += ` ${equipResult.message}`;
    }
  }

  return {
    character: newCharacter,
    message,
  };
}

/**
 * Handle treasure chest
 */
export function processTreasureChest(
  character: Character,
  trapped: boolean,
  random: () => number
): LocationResult {
  if (trapped) {
    const damage = Math.floor(random() * 10 * character.position.z + 1);
    const newCharacter = {
      ...character,
      currentHp: character.currentHp - damage,
    };
    return {
      character: newCharacter,
      message: `CHEST EXPLODES!!!!! You suffer ${damage} points of damage!`,
      nextPhase: newCharacter.currentHp < 1 ? 'dead' : undefined,
    };
  }

  if (random() > 0.9) {
    return { character, message: 'Inside, there is only cobwebs...' };
  }

  const goldValue = Math.floor(random() * 1000 * character.position.z ** 2 + 1);
  let newCharacter = { ...character, gold: character.gold + goldValue };
  let message = `Inside is ${goldValue} gold pieces!`;

  // Higher chance for equipment in chests (25%)
  if (random() < 0.25) {
    const equipResult = generateEquipmentDrop(newCharacter, random);
    newCharacter = equipResult.character;
    if (equipResult.message) {
      message += ` ${equipResult.message}`;
    }
  }

  return {
    character: newCharacter,
    message,
  };
}

/**
 * Generate random equipment drop based on dungeon level
 */
export function generateEquipmentDrop(
  character: Character,
  random: () => number
): { character: Character; message: string } {
  const z = character.position.z;
  const inventory = { ...character.inventory };
  let message = '';

  // Equipment types and their chance weights
  const equipTypes = [
    { type: 'sword', weight: 20 },
    { type: 'armor', weight: 15 },
    { type: 'shield', weight: 15 },
    { type: 'elvenCloak', weight: 5 },
    { type: 'elvenBoots', weight: 5 },
    { type: 'ringOfRegeneration', weight: 8 },
    { type: 'ringOfProtection', weight: 8 },
    { type: 'scrollOfRescue', weight: 10 },
    { type: 'potionOfHealing', weight: 10 },
    { type: 'potionOfStrength', weight: 4 },
  ];

  const totalWeight = equipTypes.reduce((sum, e) => sum + e.weight, 0);
  let roll = random() * totalWeight;

  let selectedType = equipTypes[0].type;
  for (const equip of equipTypes) {
    roll -= equip.weight;
    if (roll <= 0) {
      selectedType = equip.type;
      break;
    }
  }

  // Generate bonus based on dungeon level (deeper = better)
  const maxBonus = Math.min(5, Math.floor(z / 10) + 1);
  const bonus = Math.floor(random() * maxBonus) + 1;

  switch (selectedType) {
    case 'sword':
      if (bonus > inventory.sword) {
        inventory.sword = bonus;
        message = `You found a SWORD +${bonus}!`;
      } else {
        message = `You found a sword, but yours is better.`;
      }
      break;
    case 'armor':
      if (bonus > inventory.armor) {
        inventory.armor = bonus;
        message = `You found ARMOR +${bonus}!`;
      } else {
        message = `You found armor, but yours is better.`;
      }
      break;
    case 'shield':
      if (bonus > inventory.shield) {
        inventory.shield = bonus;
        message = `You found a SHIELD +${bonus}!`;
      } else {
        message = `You found a shield, but yours is better.`;
      }
      break;
    case 'elvenCloak':
      if (inventory.elvenCloak === 0) {
        inventory.elvenCloak = 1;
        message = `You found an ELVEN CLOAK!`;
      } else {
        message = `You found a cloak, but you already have one.`;
      }
      break;
    case 'elvenBoots':
      if (inventory.elvenBoots === 0) {
        inventory.elvenBoots = 1;
        message = `You found ELVEN BOOTS!`;
      } else {
        message = `You found boots, but you already have some.`;
      }
      break;
    case 'ringOfRegeneration':
      if (bonus > inventory.ringOfRegeneration) {
        inventory.ringOfRegeneration = bonus;
        message = `You found a RING OF REGENERATION +${bonus}!`;
      } else {
        message = `You found a ring, but yours is better.`;
      }
      break;
    case 'ringOfProtection':
      if (bonus > inventory.ringOfProtection) {
        inventory.ringOfProtection = bonus;
        message = `You found a RING OF PROTECTION +${bonus}!`;
      } else {
        message = `You found a ring, but yours is better.`;
      }
      break;
    case 'scrollOfRescue':
      inventory.scrollOfRescue += 1;
      message = `You found a SCROLL OF RESCUE!`;
      break;
    case 'potionOfHealing':
      inventory.potionOfHealing += 1;
      message = `You found a POTION OF HEALING!`;
      break;
    case 'potionOfStrength':
      inventory.potionOfStrength += 1;
      message = `You found a POTION OF STRENGTH!`;
      break;
  }

  return {
    character: { ...character, inventory },
    message,
  };
}
