// Monster definitions - ported from original Applesoft BASIC
// Original monster names from line 1020

import type { Monster } from './types';

// Monster data from MO$ (line 1020)
// Format: name (8 chars), isUndead
export const MONSTER_DATA: Array<{ name: string; isUndead: boolean }> = [
  { name: 'GNOLL', isUndead: false },      // 1
  { name: 'KOBOLD', isUndead: false },     // 2
  { name: 'SKELETON', isUndead: true },    // 3
  { name: 'HOBBIT', isUndead: false },     // 4
  { name: 'ZOMBIE', isUndead: true },      // 5
  { name: 'ORC', isUndead: false },        // 6
  { name: 'FIGHTER', isUndead: false },    // 7
  { name: 'MUMMY', isUndead: true },       // 8
  { name: 'ELF', isUndead: false },        // 9
  { name: 'GHOUL', isUndead: true },       // 10
  { name: 'DWARF', isUndead: false },      // 11
  { name: 'TROLL', isUndead: false },      // 12
  { name: 'WRAITH', isUndead: true },      // 13
  { name: 'OGRE', isUndead: false },       // 14
  { name: 'MINOTAUR', isUndead: false },   // 15
  { name: 'GIANT', isUndead: false },      // 16
  { name: 'SPECTER', isUndead: true },     // 17
  { name: 'VAMPIRE', isUndead: true },     // 18
  { name: 'DEMON', isUndead: false },      // 19
  { name: 'DRAGON', isUndead: false },     // 20
];

/**
 * Check if a monster type is undead
 * Original from line 20700
 * Undead: SKELETON(3), ZOMBIE(5), MUMMY(8), GHOUL(10), WRAITH(13), SPECTER(17), VAMPIRE(18)
 */
export function isUndead(monsterId: number): boolean {
  if (monsterId < 1 || monsterId > 20) return false;
  return MONSTER_DATA[monsterId - 1].isUndead;
}

/**
 * Get monster name by ID
 */
export function getMonsterName(monsterId: number): string {
  if (monsterId < 1 || monsterId > 20) return 'UNKNOWN';
  return MONSTER_DATA[monsterId - 1].name;
}

/**
 * Generate a random monster encounter
 * Original from lines 3005-3007
 *
 * Monster type: INT(RND(1)*20+1)
 * Skip if invisible (SF(6)>0) and RND<0.2
 * Monster level: INT((RND(1)*1.5)*(CZ*2+2)+1)
 */
export function generateMonster(dungeonLevel: number, random: () => number): Monster | null {
  // Random monster type 1-20
  let monsterId = Math.floor(random() * 20) + 1;

  // Some monsters only appear at certain depths
  // Higher numbered monsters are generally stronger
  // Adjust based on dungeon level
  if (dungeonLevel < 5 && monsterId > 10) {
    monsterId = Math.floor(random() * 10) + 1;
  }

  // Monster level based on dungeon level
  // Original: ML = INT((RND(1)*1.5)*(CZ*2+2)+1)
  const monsterLevel = Math.floor((random() * 1.5) * (dungeonLevel * 2 + 2) + 1);

  // Monster HP based on level and type
  // Original: MH = INT((RND(1)*0.5)*ML*M+1) where M is monster type
  const monsterHp = Math.floor((random() * 0.5 + 0.5) * monsterLevel * monsterId + 1);

  return {
    id: monsterId,
    name: getMonsterName(monsterId),
    level: monsterLevel,
    currentHp: monsterHp,
    isUndead: isUndead(monsterId),
  };
}

/**
 * Monster special abilities
 * Based on original combat code (lines 3330-3375)
 */
export interface MonsterAbilities {
  canDrainLevel: boolean;
  drainChance: number;
  canParalyze: boolean;
  paralyzeChance: number;
  hasSword: boolean;      // Demon
  hasWhip: boolean;       // Demon
  breathesFire: boolean;  // Dragon
}

export function getMonsterAbilities(monsterId: number): MonsterAbilities {
  const abilities: MonsterAbilities = {
    canDrainLevel: false,
    drainChance: 0,
    canParalyze: false,
    paralyzeChance: 0,
    hasSword: false,
    hasWhip: false,
    breathesFire: false,
  };

  switch (monsterId) {
    case 10: // GHOUL
      abilities.canParalyze = true;
      abilities.paralyzeChance = 0.5;
      break;
    case 13: // WRAITH
      abilities.canDrainLevel = true;
      abilities.drainChance = 0.1;
      break;
    case 17: // SPECTER
      abilities.canDrainLevel = true;
      abilities.drainChance = 0.2;
      break;
    case 18: // VAMPIRE
      abilities.canDrainLevel = true;
      abilities.drainChance = 0.3;
      abilities.canParalyze = true;
      abilities.paralyzeChance = 0.3;
      break;
    case 19: // DEMON
      abilities.hasSword = true;
      abilities.hasWhip = true;
      break;
    case 20: // DRAGON
      abilities.breathesFire = true;
      break;
  }

  return abilities;
}

/**
 * Calculate monster's attack roll
 * Original from line 3305:
 * I = INT(RND(1)*20) + ML - I(2) - I(3) + MB
 * Where I(2)=armor, I(3)=shield, MB=monster bonus
 */
export function calculateMonsterAttack(
  monsterLevel: number,
  playerArmor: number,
  playerShield: number,
  monsterBonus: number,
  random: () => number
): { hit: boolean; damage: number; damageMultiplier: number } {
  const roll = Math.floor(random() * 20) + monsterLevel - playerArmor - playerShield + monsterBonus;
  const hit = roll > 13;

  if (!hit) {
    return { hit: false, damage: 0, damageMultiplier: 1 };
  }

  // Damage: INT((RND(1)*8 + RND(1)*ML*2 + 1) * DB)
  // Where DB is damage bonus from special attacks
  const baseDamage = Math.floor(random() * 8 + random() * monsterLevel * 2 + 1);

  return { hit: true, damage: baseDamage, damageMultiplier: 1 };
}

/**
 * Get monster encounter description based on their behavior
 * Some monsters may be friendly, steal items, or give gifts
 * Original from lines 3020-3080
 */
export type MonsterBehavior = 'hostile' | 'friendly_heal' | 'thief' | 'gift_giver';

export function determineMonsterBehavior(
  monsterId: number,
  playerCharisma: number,
  random: () => number
): MonsterBehavior {
  // Base 5% chance influenced by charisma for special behaviors
  const charismaBonus = playerCharisma * 0.04;

  // Certain monster types (9 and below) can be friendly
  if (monsterId <= 9) {
    if (random() < 0.04 + charismaBonus) {
      return 'friendly_heal';
    }
  }

  // Any monster might try to steal
  if (monsterId <= 4 && random() < 0.05 + charismaBonus) {
    return 'thief';
  }

  // Some monsters give gifts if they really like you
  if (monsterId <= 20 && random() < playerCharisma * 0.02) {
    if (random() < 0.5 + playerCharisma * 0.02) {
      return 'gift_giver';
    }
  }

  return 'hostile';
}

/**
 * Calculate experience points for defeating a monster
 * Original: E = ML * M * 10
 */
export function calculateExperience(monsterLevel: number, monsterId: number): number {
  return monsterLevel * monsterId * 10;
}
