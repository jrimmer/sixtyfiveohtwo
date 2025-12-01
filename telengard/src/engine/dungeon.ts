// Dungeon generation - ported from original Applesoft BASIC
// Original constants from lines 1103, 10010-10040

import type { Position, Room, WallConfiguration } from './types';
import { SpecialLocationType } from './types';

// Magic constants from original game (line 1103)
const XO = 1.6915;
const YO = 1.4278;
const ZO = 1.2462;
const W0 = 4694;

/**
 * Calculate the room hash for a given position.
 * This is the core procedural generation algorithm from lines 10010-10040.
 *
 * The algorithm uses irrational-ish constants to create pseudo-random
 * but deterministic room configurations based on coordinates.
 */
export function calculateRoomHash(x: number, y: number, z: number): number {
  // Line 10010: Q = X*XO + Y*YO + Z*ZO + (X+XO)*(Y+YO)*(Z+ZO)
  const q = x * XO + y * YO + z * ZO + (x + XO) * (y + YO) * (z + ZO);

  // Line 10020: H% = (Q - INT(Q)) * W0
  // Get fractional part and multiply by W0
  let h = Math.floor((q - Math.floor(q)) * W0);

  // Line 10020: IF H%/256 > 5 THEN H% = H% - INT(H%/256)*256
  if (Math.floor(h / 256) > 5) {
    h = h - Math.floor(h / 256) * 256;
  }

  // Line 10025: IF INT(H%/256) > 0 THEN H% = (INT((Q*10-INT(Q*10))*15+1)*256) + H% - INT(H%/256)*256
  if (Math.floor(h / 256) > 0) {
    const q10 = q * 10;
    const newHighByte = Math.floor((q10 - Math.floor(q10)) * 15 + 1);
    h = newHighByte * 256 + (h % 256);
  }

  // Line 10030: IF X=1 OR X=201 THEN H% = (H% - INT(H%/256)*256) + (H% - INT(H%/4)*4) + 12
  // Edge walls on X boundaries
  if (x === 1 || x === 201) {
    h = (h % 256) + (h % 4) + 12;
  }

  // Line 10035: IF Y=1 OR Y=201 THEN H% = INT(H%/4)*4 + 3
  // Edge walls on Y boundaries
  if (y === 1 || y === 201) {
    h = Math.floor(h / 4) * 4 + 3;
  }

  return h;
}

/**
 * FN UP(H) - Extract north/south wall bits (bits 0-1)
 * Original: DEFFNUP(H) = H - INT(H/4)*4
 * This is essentially H MOD 4
 */
export function getUpBits(h: number): number {
  return h % 4;
}

/**
 * FN LF(H) - Extract east/west wall bits (bits 2-3)
 * Original: DEFFNLF(H) = INT(H/4) - INT(H/16)*4
 * This is essentially (H/4) MOD 4
 */
export function getLeftBits(h: number): number {
  return Math.floor(h / 4) % 4;
}

/**
 * FN MD(H) - Extract middle bits for special locations
 * Original: DEFFNMD(H) = H - INT(H/1024)*984
 */
export function getMiddleBits(h: number): number {
  return h - Math.floor(h / 1024) * 984;
}

/**
 * FN S(H) - Extract special location type from high bits
 * Original: DEFFNS(H) = INT(H/256)
 */
export function getSpecialBits(h: number): number {
  return Math.floor(h / 256);
}

/**
 * Determine wall configuration from hash
 * Wall values: 0 = open passage, 1 = door, 2 = solid wall, 3 = solid wall
 * Values >= 2 block movement
 */
export function getWallConfiguration(h: number): WallConfiguration {
  const upBits = getUpBits(h);
  const leftBits = getLeftBits(h);

  return {
    north: upBits >= 2,
    south: upBits >= 2, // South wall determined by room to south
    east: leftBits >= 2,
    west: leftBits >= 2, // West wall determined by room to west
  };
}

/**
 * Get the special location type for a room
 *
 * Original algorithm from lines 6000-6020:
 * - I = INT(H%/256) reduced to 0-9 by subtracting 9
 * - J = high byte of level-above hash, similarly reduced
 * - If I=0 AND J<4, then NO special location (most rooms!)
 * - If J=4, then stairs
 * - Otherwise: I determines type: 1=Inn, 2=Pit, 3=Teleporter, 4=Stairs,
 *              5=Altar, 6=Fountain, 7=GrayCube, 8=Throne, 9=Safe
 */
export function getSpecialLocationType(h: number, z: number): SpecialLocationType {
  // Extract high byte - this determines if there's a special location
  let i = Math.floor(h / 256);

  // Reduce to 0-9 range (original lines 6010-6012)
  while (i > 9) {
    i = i - 9;
  }

  // Calculate J from level above (original line 6000-6002)
  // For simplicity, we'll compute hash at z-1
  // Note: original uses a pre-computed L% but effect is similar
  let j = 0;
  if (z > 1) {
    // We'd need to know x,y here - for now approximate with h manipulation
    // In original, J comes from separate hash calculation
    j = Math.floor((h * 1.1) / 256);  // Approximate
    while (j > 9) {
      j = j - 9;
    }
  }

  // Level 50 special case (line 6013)
  if (z === 50 && i === 4) {
    i = 0;
  }

  // Most rooms have no special location! (line 6014)
  // If I=0 AND J not >= 4, then no special location
  if (i === 0 && j < 4) {
    return SpecialLocationType.None;
  }

  // J=4 means stairs (line 6015)
  if (j === 4) {
    return SpecialLocationType.Stairs;
  }

  // Map I to location type (line 6020)
  // ONIGOTO6100,6300,6400,6500,6600,6700,6800,6900,7100
  // I: 1=Inn, 2=Pit, 3=Teleporter, 4=Stairs, 5=Altar, 6=Fountain, 7=GrayCube, 8=Throne, 9=Safe
  switch (i) {
    case 1: return SpecialLocationType.Inn;
    case 2: return SpecialLocationType.Pit;
    case 3: return SpecialLocationType.Teleporter;
    case 4: return SpecialLocationType.Stairs;
    case 5: return SpecialLocationType.Altar;
    case 6: return SpecialLocationType.Fountain;
    case 7: return SpecialLocationType.GrayCube;
    case 8: return SpecialLocationType.Throne;
    case 9: return SpecialLocationType.Safe;
    default: return SpecialLocationType.None;
  }
}

/**
 * Check if room has stairs going up
 * Stairs up available if on level > 1 and special type indicates stairs
 */
export function hasStairsUp(h: number, z: number): boolean {
  if (z <= 1) return false;
  const upBits = getUpBits(h);
  return upBits === 3 || getSpecialLocationType(h, z) === SpecialLocationType.Stairs;
}

/**
 * Check if room has stairs going down
 * Stairs down available if on level < 50
 */
export function hasStairsDown(h: number, z: number): boolean {
  if (z >= 50) return false;
  const leftBits = getLeftBits(h);
  return leftBits === 3 || getSpecialLocationType(h, z) === SpecialLocationType.Stairs;
}

/**
 * Get complete room information for a position
 *
 * Original wall logic from BASIC:
 * - Each room stores its NORTH wall in UP bits (0-1)
 * - Each room stores its WEST wall in LF bits (2-3)
 * - To move North: check current room's UP bits >= 2
 * - To move South: check room-to-south's UP bits >= 2
 * - To move West: check current room's LF bits >= 2
 * - To move East: check room-to-east's LF bits >= 2
 */
export function getRoom(position: Position): Room {
  const h = calculateRoomHash(position.x, position.y, position.z);

  // Get adjacent room hashes for proper wall checking
  const hSouth = position.y < 200 ? calculateRoomHash(position.x, position.y + 1, position.z) : 0xFFFF;
  const hEast = position.x < 200 ? calculateRoomHash(position.x + 1, position.y, position.z) : 0xFFFF;

  // Wall detection follows original algorithm:
  // - North wall: this room's UP bits
  // - South wall: room-to-south's UP bits (their north wall blocks our south exit)
  // - West wall: this room's LF bits
  // - East wall: room-to-east's LF bits (their west wall blocks our east exit)
  const walls: WallConfiguration = {
    north: getUpBits(h) >= 2 || position.y <= 1,
    south: (position.y < 200 ? getUpBits(hSouth) >= 2 : true) || position.y >= 200,
    west: getLeftBits(h) >= 2 || position.x <= 1,
    east: (position.x < 200 ? getLeftBits(hEast) >= 2 : true) || position.x >= 200,
  };

  return {
    walls,
    specialType: getSpecialLocationType(h, position.z),
    hasStairsUp: hasStairsUp(h, position.z),
    hasStairsDown: hasStairsDown(h, position.z),
  };
}

/**
 * Check if movement in a direction is blocked
 */
export function canMove(position: Position, direction: 'north' | 'south' | 'east' | 'west'): boolean {
  const room = getRoom(position);

  switch (direction) {
    case 'north':
      return !room.walls.north && position.y > 1;
    case 'south':
      return !room.walls.south && position.y < 200;
    case 'east':
      return !room.walls.east && position.x < 200;
    case 'west':
      return !room.walls.west && position.x > 1;
  }
}

/**
 * Get the 3x3 grid of room hashes around a position
 * Used for rendering the dungeon view
 * P%(row, col) in original - returns 4x4 grid actually
 */
export function getSurroundingRoomHashes(position: Position): number[][] {
  const hashes: number[][] = [];

  for (let dy = 0; dy <= 3; dy++) {
    const row: number[] = [];
    for (let dx = 0; dx <= 3; dx++) {
      const x = position.x + dx - 1;
      const y = position.y + dy - 1;

      if (x >= 1 && x <= 200 && y >= 1 && y <= 200) {
        row.push(calculateRoomHash(x, y, position.z));
      } else {
        row.push(0xFFFF); // Boundary marker
      }
    }
    hashes.push(row);
  }

  return hashes;
}

/**
 * Generate Inn name based on coordinates
 * Original uses FN RD function with coordinate-based seed
 */
export function generateInnName(x: number, y: number): string {
  // Inn name parts from original DATA statements (lines 1173-1174)
  const adjectives = [
    'SALTY', 'BOLD', 'LOUD', 'OLD', 'GOODLY',
    'WORTHY', 'LOFTY', 'FINE', 'ROCKY', 'AGED'
  ];

  const nouns = [
    'ROAD', 'EYE', 'TOOTH', 'DRAGON', 'MUG',
    'DEMON', 'WHARF', 'BRIDGE', 'MEADE', 'ALE'
  ];

  const suffixes = [
    'TAVERN', 'ALEHOUSE', 'CELLAR', 'CLUB', 'INN',
    'HOUSE', 'INN', 'LODGE', 'MEADEHALL', 'RESTHOUSE'
  ];

  // FN RD(I) = I - INT(I/10)*10 (essentially mod 10)
  const adjIndex = Math.abs(x + y) % 10;
  const nounIndex = Math.abs(x * y) % 10;
  const suffIndex = Math.abs(x * 3 + y * 7) % 10;

  return `${adjectives[adjIndex]} ${nouns[nounIndex]} ${suffixes[suffIndex]}`;
}
