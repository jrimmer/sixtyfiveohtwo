// Spell definitions - ported from original Applesoft BASIC
// Original spell names from DATA statements (lines 1162-1172)

import type { Spell, SpellEffects, Monster, Character } from './types';

// All 36 spells organized by level (6 spells per level)
export const SPELLS: Spell[] = [
  // Level 1 Spells (lines 1162)
  { id: 1, name: 'MAGIC MISSILE', level: 1, slot: 1, inCombatOnly: true, outOfCombatOnly: false },
  { id: 2, name: 'SLEEP', level: 1, slot: 2, inCombatOnly: true, outOfCombatOnly: false },
  { id: 3, name: 'CURE LIGHT WOUNDS', level: 1, slot: 3, inCombatOnly: false, outOfCombatOnly: false },
  { id: 4, name: 'LIGHT', level: 1, slot: 4, inCombatOnly: false, outOfCombatOnly: false },
  { id: 5, name: 'TURN UNDEAD', level: 1, slot: 5, inCombatOnly: true, outOfCombatOnly: false },
  { id: 6, name: 'PROTECTION FROM EVIL', level: 1, slot: 6, inCombatOnly: false, outOfCombatOnly: false },

  // Level 2 Spells (lines 1164)
  { id: 7, name: 'WEB', level: 2, slot: 1, inCombatOnly: true, outOfCombatOnly: false },
  { id: 8, name: 'LEVITATE', level: 2, slot: 2, inCombatOnly: false, outOfCombatOnly: false },
  { id: 9, name: 'CAUSE LIGHT WOUNDS', level: 2, slot: 3, inCombatOnly: true, outOfCombatOnly: false },
  { id: 10, name: 'DETECT TRAPS', level: 2, slot: 4, inCombatOnly: false, outOfCombatOnly: false },
  { id: 11, name: 'CHARM', level: 2, slot: 5, inCombatOnly: true, outOfCombatOnly: false },
  { id: 12, name: 'STRENGTH', level: 2, slot: 6, inCombatOnly: false, outOfCombatOnly: false },

  // Level 3 Spells (lines 1166)
  { id: 13, name: 'LIGHTNING BOLT', level: 3, slot: 1, inCombatOnly: true, outOfCombatOnly: false },
  { id: 14, name: 'CURE SERIOUS WOUNDS', level: 3, slot: 2, inCombatOnly: false, outOfCombatOnly: false },
  { id: 15, name: 'CONTINUAL LIGHT', level: 3, slot: 3, inCombatOnly: false, outOfCombatOnly: false },
  { id: 16, name: 'INVISIBILITY', level: 3, slot: 4, inCombatOnly: false, outOfCombatOnly: false },
  { id: 17, name: 'HOLD MONSTER', level: 3, slot: 5, inCombatOnly: true, outOfCombatOnly: false },
  { id: 18, name: 'PHANTASMAL FORCE', level: 3, slot: 6, inCombatOnly: true, outOfCombatOnly: false },

  // Level 4 Spells (lines 1168)
  { id: 19, name: 'PASS WALL', level: 4, slot: 1, inCombatOnly: false, outOfCombatOnly: true },
  { id: 20, name: 'FIREBALL', level: 4, slot: 2, inCombatOnly: true, outOfCombatOnly: false },
  { id: 21, name: 'CAUSE SERIOUS WOUNDS', level: 4, slot: 3, inCombatOnly: true, outOfCombatOnly: false },
  { id: 22, name: 'FLESH TO STONE', level: 4, slot: 4, inCombatOnly: true, outOfCombatOnly: false },
  { id: 23, name: 'FEAR', level: 4, slot: 5, inCombatOnly: false, outOfCombatOnly: false },
  { id: 24, name: 'FINGER OF DEATH', level: 4, slot: 6, inCombatOnly: true, outOfCombatOnly: false },

  // Level 5 Spells (lines 1170)
  { id: 25, name: 'TELEPORT', level: 5, slot: 1, inCombatOnly: false, outOfCombatOnly: true },
  { id: 26, name: 'ASTRAL WALK', level: 5, slot: 2, inCombatOnly: false, outOfCombatOnly: false },
  { id: 27, name: 'POWER WORD KILL', level: 5, slot: 3, inCombatOnly: true, outOfCombatOnly: false },
  { id: 28, name: 'ICE STORM', level: 5, slot: 4, inCombatOnly: true, outOfCombatOnly: false },
  { id: 29, name: 'WALL OF FIRE', level: 5, slot: 5, inCombatOnly: true, outOfCombatOnly: false },
  { id: 30, name: 'PLAGUE', level: 5, slot: 6, inCombatOnly: true, outOfCombatOnly: false },

  // Level 6 Spells (lines 1172)
  { id: 31, name: 'TIME STOP', level: 6, slot: 1, inCombatOnly: false, outOfCombatOnly: false },
  { id: 32, name: 'RAISE DEAD', level: 6, slot: 2, inCombatOnly: false, outOfCombatOnly: false },
  { id: 33, name: 'HOLY SYMBOL', level: 6, slot: 3, inCombatOnly: true, outOfCombatOnly: false },
  { id: 34, name: 'WORD OF RECALL', level: 6, slot: 4, inCombatOnly: false, outOfCombatOnly: true },
  { id: 35, name: 'RESTORATION', level: 6, slot: 5, inCombatOnly: false, outOfCombatOnly: false },
  { id: 36, name: 'PRISMATIC WALL', level: 6, slot: 6, inCombatOnly: true, outOfCombatOnly: false },
];

/**
 * Get spell by level and slot number
 */
export function getSpell(level: number, slot: number): Spell | null {
  return SPELLS.find(s => s.level === level && s.slot === slot) || null;
}

/**
 * Get spell by ID
 */
export function getSpellById(id: number): Spell | null {
  return SPELLS.find(s => s.id === id) || null;
}

/**
 * Get all spells for a given level
 */
export function getSpellsForLevel(level: number): Spell[] {
  return SPELLS.filter(s => s.level === level);
}

/**
 * Check if character can cast spells of a given level
 * Original: C <= INT(LV/3)+1 AND C <= 7
 */
export function canCastLevel(characterLevel: number, spellLevel: number): boolean {
  const maxLevel = Math.floor(characterLevel / 3) + 1;
  return spellLevel <= maxLevel && spellLevel <= 6;
}

/**
 * Get maximum spell level available to character
 */
export function getMaxSpellLevel(characterLevel: number): number {
  return Math.min(Math.floor(characterLevel / 3) + 1, 6);
}

export interface SpellResult {
  success: boolean;
  damage?: number;
  healing?: number;
  message: string;
  effectApplied?: keyof SpellEffects;
  effectDuration?: number;
  monsterKilled?: boolean;
  monsterFled?: boolean;
  teleportTo?: { x: number; y: number; z: number };
}

/**
 * Cast a spell - main spell resolution logic
 * Ported from original lines 21000-27615
 */
export function castSpell(
  spell: Spell,
  caster: Character,
  target: Monster | null,
  inCombat: boolean,
  random: () => number
): SpellResult {
  // Check combat restrictions
  if (spell.inCombatOnly && !inCombat) {
    return { success: false, message: 'You just wasted a combat spell!' };
  }

  if (spell.outOfCombatOnly && inCombat) {
    return { success: false, message: 'Not in melee!' };
  }

  // Dispatch to specific spell handler
  switch (spell.id) {
    // Level 1
    case 1: return castMagicMissile(caster, target, random);
    case 2: return castSleep(caster, target, random);
    case 3: return castCureLightWounds(caster, random);
    case 4: return castLight(random);
    case 5: return castTurnUndead(caster, target, random);
    case 6: return castProtectionFromEvil(random);

    // Level 2
    case 7: return castWeb(caster, target, random);
    case 8: return castLevitate(random);
    case 9: return castCauseLightWounds(target, random);
    case 10: return castDetectTraps(random);
    case 11: return castCharm(caster, target, random);
    case 12: return castStrength(random);

    // Level 3
    case 13: return castLightningBolt(caster, target, random);
    case 14: return castCureSeriousWounds(caster, random);
    case 15: return castContinualLight(random);
    case 16: return castInvisibility(random);
    case 17: return castHoldMonster(caster, target, random);
    case 18: return castPhantasmalForce(caster, target, random);

    // Level 4
    case 19: return castPassWall();
    case 20: return castFireball(caster, target, random);
    case 21: return castCauseSeriousWounds(target, random);
    case 22: return castFleshToStone(target, random);
    case 23: return castFear(random);
    case 24: return castFingerOfDeath(caster, target, random);

    // Level 5
    case 25: return castTeleport();
    case 26: return castAstralWalk(random);
    case 27: return castPowerWordKill(caster, target, random);
    case 28: return castIceStorm(target, random);
    case 29: return castWallOfFire(target, random);
    case 30: return castPlague(caster, target, random);

    // Level 6
    case 31: return castTimeStop(random);
    case 32: return castRaiseDead(caster, random);
    case 33: return castHolySymbol(target, random);
    case 34: return castWordOfRecall(caster);
    case 35: return castRestoration(caster);
    case 36: return castPrismaticWall(target, random);

    default:
      return { success: false, message: 'Unknown spell!' };
  }
}

// Individual spell implementations

function castMagicMissile(_caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  const damage = Math.floor(random() * 8 + 5);
  return { success: true, damage, message: `MAGIC MISSILE hits for ${damage} damage!` };
}

function castSleep(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  if (target.isUndead) return { success: false, message: "Undead don't sleep!" };

  const roll = Math.floor(random() * 20 + 1);
  if (roll > caster.stats.intelligence) {
    return { success: false, message: `The ${target.name} isn't sleepy!` };
  }

  return {
    success: true,
    message: `The ${target.name} is sleeping! Press <RET> to kill...`,
    monsterKilled: random() > 0.2
  };
}

function castCureLightWounds(_caster: Character, random: () => number): SpellResult {
  const healing = Math.floor(random() * 8 + 1);
  return {
    success: true,
    healing,
    message: `You feel better! Healed ${healing} HP.`
  };
}

function castLight(random: () => number): SpellResult {
  const duration = Math.floor(random() * 11 + 5);
  return {
    success: true,
    effectApplied: 'light',
    effectDuration: duration,
    message: 'LIGHT spell cast!'
  };
}

function castTurnUndead(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  if (!target.isUndead) {
    return { success: false, message: `The ${target.name} is insulted at being called undead!` };
  }

  const roll = random();
  const chance = 0.05 * caster.stats.wisdom + 0.05 * caster.level - 0.05 * target.level;
  if (roll > chance) {
    return { success: false, message: `The ${target.name} listens with deaf ears.` };
  }

  return {
    success: true,
    message: 'It runs in fear!',
    monsterFled: true
  };
}

function castProtectionFromEvil(random: () => number): SpellResult {
  const duration = Math.floor(random() * 11 + 5);
  return {
    success: true,
    effectApplied: 'protectionFromEvil',
    effectDuration: duration,
    message: 'PROTECTION FROM EVIL cast!'
  };
}

function castWeb(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };

  const roll = (random() ** 2) * 20 + target.level;
  if (roll > caster.stats.intelligence) {
    return { success: false, message: `The ${target.name} dodges aside!` };
  }

  return {
    success: true,
    message: `The ${target.name} is webbed! Press <RET> to kill...`,
    monsterKilled: random() - target.level / 20 > 0.2
  };
}

function castLevitate(random: () => number): SpellResult {
  const duration = Math.floor(random() * 21 + 5);
  return {
    success: true,
    effectApplied: 'levitate',
    effectDuration: duration,
    message: 'LEVITATE spell cast!'
  };
}

function castCauseLightWounds(target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  const damage = Math.floor(random() * 12 + 3);
  return { success: true, damage, message: `CAUSE LIGHT WOUNDS does ${damage} damage!` };
}

function castDetectTraps(random: () => number): SpellResult {
  const duration = Math.floor(random() * 21 + 5);
  return {
    success: true,
    effectApplied: 'detectTraps',
    effectDuration: duration,
    message: 'DETECT TRAPS spell cast!'
  };
}

function castCharm(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  if (target.isUndead) {
    return { success: false, message: 'The undead ignore your wiles!' };
  }

  const roll = (random() ** 2) * 20 + 1;
  if (roll > caster.stats.charisma) {
    return { success: false, message: `The ${target.name} resists you!` };
  }

  return {
    success: true,
    message: `The ${target.name} is charmed! Press <RET> to kill...`,
    monsterKilled: random() > 0.2
  };
}

function castStrength(random: () => number): SpellResult {
  const duration = Math.floor(random() * 21 + 5);
  return {
    success: true,
    effectApplied: 'strength',
    effectDuration: duration,
    message: 'STRENGTH spell cast!'
  };
}

function castLightningBolt(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  const damage = Math.floor(random() * 6 * caster.level + 15);
  return {
    success: true,
    damage,
    message: `ZZZZAAAAPP!!! Lightning bolt does ${damage} damage!`
  };
}

function castCureSeriousWounds(_caster: Character, random: () => number): SpellResult {
  const healing = Math.floor(random() * 24 + 1);
  return {
    success: true,
    healing,
    message: `You feel better! Healed ${healing} HP.`
  };
}

function castContinualLight(random: () => number): SpellResult {
  const duration = Math.floor(random() * 31 + 10);
  return {
    success: true,
    effectApplied: 'light',
    effectDuration: duration,
    message: 'CONTINUAL LIGHT spell cast!'
  };
}

function castInvisibility(random: () => number): SpellResult {
  const duration = Math.floor(random() * 21 + 5);
  return {
    success: true,
    effectApplied: 'invisibility',
    effectDuration: duration,
    message: 'INVISIBILITY spell cast!'
  };
}

function castHoldMonster(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };

  const roll = random() * 20 + target.level;
  if (roll > caster.stats.intelligence) {
    return { success: false, message: `The ${target.name} ignores you!` };
  }

  return {
    success: true,
    message: `The ${target.name} is held! Press <RET> to kill...`,
    monsterKilled: random() > 0.2 + target.level * 0.03
  };
}

function castPhantasmalForce(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };

  const roll = random() * 22 + target.level;
  if (roll < caster.stats.intelligence) {
    return { success: false, message: `The ${target.name} doesn't believe!` };
  }

  return { success: true, message: "It believes!....ARRGH!...", monsterKilled: true };
}

function castPassWall(): SpellResult {
  return {
    success: true,
    message: 'PASS WALL - Choose direction: (W)North, (X)South, (A)West, (D)East'
  };
}

function castFireball(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  const damage = Math.floor(random() * 12 * caster.level + 15);
  return {
    success: true,
    damage,
    message: `WHOOOOOSHH!!! The ${target.name} is burning! ${damage} damage!`
  };
}

function castCauseSeriousWounds(target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  const damage = Math.floor(random() * 32 + 10);
  return { success: true, damage, message: `CAUSE SERIOUS WOUNDS does ${damage} damage!` };
}

function castFleshToStone(target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };

  if (random() > 0.6) {
    return { success: false, message: `The ${target.name} isn't affected!` };
  }

  return { success: true, message: 'One stone statue....', monsterKilled: true };
}

function castFear(random: () => number): SpellResult {
  const duration = Math.floor(random() * 30 + 5);
  return {
    success: true,
    effectApplied: 'fear',
    effectDuration: duration,
    message: 'FEAR spell cast!'
  };
}

function castFingerOfDeath(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  if (target.isUndead) {
    return { success: false, message: 'Undead are already dead!' };
  }

  const chance = 0.3 + target.level * 0.04 - caster.level * 0.03;
  if (random() > chance) {
    return { success: false, message: `The ${target.name} laughs!` };
  }

  return { success: true, message: 'DIE!!!!!!', monsterKilled: true };
}

function castTeleport(): SpellResult {
  return {
    success: true,
    message: 'TELEPORT - Enter coordinates: +North/-South, +East/-West, +Up/-Down'
  };
}

function castAstralWalk(random: () => number): SpellResult {
  const duration = Math.floor(random() * 16 + 5);
  return {
    success: true,
    effectApplied: 'astralWalk',
    effectDuration: duration,
    message: 'ASTRAL WALK spell cast!'
  };
}

function castPowerWordKill(_caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  if (target.isUndead) {
    return { success: false, message: 'Undead are already dead!' };
  }

  if (random() > 0.8) {
    return { success: false, message: `The ${target.name} doesn't hear...` };
  }

  return { success: true, message: 'QWERTY!!!!', monsterKilled: true };
}

function castIceStorm(target: Monster | null, _random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  const damage = 60;
  return {
    success: true,
    damage,
    message: `BRRRR!!!! ICE STORM does ${damage} damage!`
  };
}

function castWallOfFire(target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };

  if (random() > 0.4) {
    const damage = Math.floor(random() * 12 + 8);
    return {
      success: true,
      damage,
      message: `The ${target.name} walks through!!! Takes ${damage} damage.`
    };
  }

  return { success: true, message: `WWHHOOOOSSHH!!! The ${target.name} is gone!`, monsterKilled: true };
}

function castPlague(caster: Character, target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };
  if (target.isUndead) {
    return { success: false, message: 'Undead are already dead!' };
  }

  if (random() > caster.stats.wisdom * 0.05) {
    return { success: false, message: 'It is immune!' };
  }

  // Chance of backfire
  if (random() * 2 < caster.stats.constitution * 0.03 + 1) {
    return {
      success: true,
      message: `Black death for the ${target.name}!`,
      monsterKilled: true
    };
  }

  return { success: false, message: 'The spell backfires!' };
}

function castTimeStop(random: () => number): SpellResult {
  const duration = Math.floor(random() * 20 + 5);
  return {
    success: true,
    effectApplied: 'timeStop',
    effectDuration: duration,
    message: 'TIME STOP spell cast!'
  };
}

function castRaiseDead(_caster: Character, random: () => number): SpellResult {
  // This spell is used when player dies - gives a chance to resurrect
  // Outside of death, it sets up the SF(10) flag
  const duration = Math.floor(random() * 40 + 10);
  return {
    success: true,
    effectApplied: 'raiseDead',
    effectDuration: duration,
    message: 'RAISE DEAD spell prepared!'
  };
}

function castHolySymbol(target: Monster | null, random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };

  // Visual effect: .O0*#&+
  if (random() > 0.9) {
    return { success: true, message: '.O0*#&+ ', monsterKilled: true };
  }

  return { success: false, message: `The ${target.name} doesn't see...` };
}

function castWordOfRecall(_caster: Character): SpellResult {
  return {
    success: true,
    message: '***ZAP!!***',
    teleportTo: { x: 25, y: 13, z: 1 } // Back to starting position
  };
}

function castRestoration(caster: Character): SpellResult {
  return {
    success: true,
    healing: caster.maxHp - caster.currentHp, // Full heal
    message: 'You feel better! Full restoration!'
  };
}

function castPrismaticWall(target: Monster | null, _random: () => number): SpellResult {
  if (!target) return { success: false, message: 'No target!' };

  return {
    success: true,
    message: `A shifting multi-colored wall appears! The ${target.name} is gone!`,
    monsterKilled: true
  };
}

/**
 * Decrement all active spell effects by 1
 * Called at the start of each turn
 */
export function tickSpellEffects(effects: SpellEffects): SpellEffects {
  return {
    strength: Math.max(0, effects.strength - 1),
    detectTraps: Math.max(0, effects.detectTraps - 1),
    light: Math.max(0, effects.light - 1),
    protectionFromEvil: Math.max(0, effects.protectionFromEvil - 1),
    levitate: Math.max(0, effects.levitate - 1),
    invisibility: Math.max(0, effects.invisibility - 1),
    fear: Math.max(0, effects.fear - 1),
    astralWalk: Math.max(0, effects.astralWalk - 1),
    timeStop: Math.max(0, effects.timeStop - 1),
    raiseDead: Math.max(0, effects.raiseDead - 1),
    drunk: Math.max(0, effects.drunk - 1),
  };
}

/**
 * Get active spell effect abbreviations for display
 * Original from line 15008
 */
export function getActiveEffectAbbreviations(effects: SpellEffects): string[] {
  const abbrevs: string[] = [];

  if (effects.strength > 0) abbrevs.push('STRG');
  if (effects.detectTraps > 0) abbrevs.push('DTRP');
  if (effects.light > 0) abbrevs.push('LGHT');
  if (effects.protectionFromEvil > 0) abbrevs.push('PROT');
  if (effects.levitate > 0) abbrevs.push('LEVT');
  if (effects.invisibility > 0) abbrevs.push('INVS');
  if (effects.fear > 0) abbrevs.push('FEAR');
  if (effects.astralWalk > 0) abbrevs.push('ASTW');
  if (effects.timeStop > 0) abbrevs.push('TMST');
  if (effects.raiseDead > 0) abbrevs.push('RSED');
  if (effects.drunk > 0) abbrevs.push('DRNK');

  return abbrevs;
}
