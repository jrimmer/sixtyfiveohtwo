// Save/Load system for Telengard
// Supports localStorage and cloud saves

import type { Character } from '../engine/types';

const STORAGE_KEY = 'telengard_saves';
const CLOUD_API_URL = '/api/saves'; // Placeholder for cloud save endpoint

export interface SaveData {
  character: Character;
  savedAt: number;
  version: string;
}

export interface SaveMetadata {
  name: string;
  level: number;
  savedAt: number;
  isCloud: boolean;
}

// ==================== Local Storage ====================

/**
 * Save character to localStorage
 */
export function saveToLocal(character: Character): boolean {
  try {
    const saves = getLocalSaves();
    saves[character.name] = {
      character,
      savedAt: Date.now(),
      version: '1.0',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
    return true;
  } catch (error) {
    console.error('Failed to save locally:', error);
    return false;
  }
}

/**
 * Load character from localStorage
 */
export function loadFromLocal(name: string): Character | null {
  try {
    const saves = getLocalSaves();
    const saveData = saves[name];
    return saveData?.character || null;
  } catch (error) {
    console.error('Failed to load from local:', error);
    return null;
  }
}

/**
 * Delete a local save
 */
export function deleteLocalSave(name: string): boolean {
  try {
    const saves = getLocalSaves();
    if (saves[name]) {
      delete saves[name];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete local save:', error);
    return false;
  }
}

/**
 * Get all local saves
 */
function getLocalSaves(): Record<string, SaveData> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * List all local save metadata
 */
export function listLocalSaves(): SaveMetadata[] {
  const saves = getLocalSaves();
  return Object.entries(saves).map(([name, data]) => ({
    name,
    level: data.character.level,
    savedAt: data.savedAt,
    isCloud: false,
  }));
}

// ==================== Cloud Storage ====================

/**
 * Save character to cloud
 * Returns save ID on success, null on failure
 */
export async function saveToCloud(character: Character, userId: string): Promise<string | null> {
  try {
    const response = await fetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        character,
        savedAt: Date.now(),
        version: '1.0',
      }),
    });

    if (!response.ok) {
      throw new Error('Cloud save failed');
    }

    const result = await response.json();
    return result.saveId;
  } catch (error) {
    console.error('Failed to save to cloud:', error);
    return null;
  }
}

/**
 * Load character from cloud
 */
export async function loadFromCloud(saveId: string, userId: string): Promise<Character | null> {
  try {
    const response = await fetch(`${CLOUD_API_URL}/${saveId}?userId=${userId}`);

    if (!response.ok) {
      throw new Error('Cloud load failed');
    }

    const result = await response.json();
    return result.character;
  } catch (error) {
    console.error('Failed to load from cloud:', error);
    return null;
  }
}

/**
 * List cloud saves for a user
 */
export async function listCloudSaves(userId: string): Promise<SaveMetadata[]> {
  try {
    const response = await fetch(`${CLOUD_API_URL}?userId=${userId}`);

    if (!response.ok) {
      throw new Error('Failed to list cloud saves');
    }

    const result = await response.json();
    return result.saves.map((save: any) => ({
      name: save.character.name,
      level: save.character.level,
      savedAt: save.savedAt,
      isCloud: true,
    }));
  } catch (error) {
    console.error('Failed to list cloud saves:', error);
    return [];
  }
}

/**
 * Delete a cloud save
 */
export async function deleteCloudSave(saveId: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLOUD_API_URL}/${saveId}?userId=${userId}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to delete cloud save:', error);
    return false;
  }
}

// ==================== Combined Operations ====================

/**
 * Get all saves (local and cloud combined)
 */
export async function getAllSaves(userId?: string): Promise<SaveMetadata[]> {
  const localSaves = listLocalSaves();

  if (!userId) {
    return localSaves;
  }

  try {
    const cloudSaves = await listCloudSaves(userId);
    return [...localSaves, ...cloudSaves];
  } catch {
    return localSaves;
  }
}

/**
 * Export save data as JSON string (for manual backup)
 */
export function exportSave(character: Character): string {
  const saveData: SaveData = {
    character,
    savedAt: Date.now(),
    version: '1.0',
  };
  return JSON.stringify(saveData, null, 2);
}

/**
 * Import save data from JSON string
 */
export function importSave(jsonString: string): Character | null {
  try {
    const saveData: SaveData = JSON.parse(jsonString);

    // Validate the imported data has required fields
    if (!saveData.character || !saveData.character.name) {
      throw new Error('Invalid save data');
    }

    return saveData.character;
  } catch (error) {
    console.error('Failed to import save:', error);
    return null;
  }
}

/**
 * Check if character name is already used
 */
export function isNameTaken(name: string): boolean {
  const saves = getLocalSaves();
  return name.toUpperCase() in saves;
}
