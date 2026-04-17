import { buildZipFile } from '../utils/zipWriter';
import type { CharacterData } from '../utils/types';
import { marketplaceApi } from './api';

const SKIZOAI_URL = import.meta.env.VITE_SKIZOAI_URL || 'http://localhost:5173';

export interface InstallOptions {
  characterId: string;
  characterData: CharacterData;
  method: 'download' | 'direct';
}

export interface InstallResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Download character as a standard .zip file
 * Contains: card.json + card.png (+ any additional assets)
 */
export async function downloadZipFile(
  characterData: CharacterData
): Promise<InstallResult> {
  try {
    const zipData = await buildZipFile(characterData);
    const blob = new Blob([zipData.buffer as ArrayBuffer], {
      type: 'application/zip',
    });

    const name = (characterData.name || 'character').replace(/[^a-zA-Z0-9_-]/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    return { success: true, message: 'Character downloaded as .zip' };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to download character',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import character directly to SkizoAI via postMessage
 */
export async function importToSkizoAI(
  characterData: CharacterData
): Promise<InstallResult> {
  try {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'rtoh-import', payload: characterData },
        SKIZOAI_URL
      );
      return { success: true, message: 'Character sent to SkizoAI' };
    }

    const skizoWindow = window.open(SKIZOAI_URL, 'skizoai');
    if (skizoWindow) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      skizoWindow.postMessage(
        { type: 'rtoh-import', payload: characterData },
        SKIZOAI_URL
      );
      return { success: true, message: 'Character sent to SkizoAI' };
    }

    // Fallback: download as .zip if can't open window
    return await downloadZipFile(characterData);
  } catch (error) {
    return {
      success: false,
      message: 'Failed to import to SkizoAI',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Install character with download tracking
 */
export async function installCharacter(
  options: InstallOptions
): Promise<InstallResult> {
  try {
    await marketplaceApi.trackDownload(options.characterId);

    if (options.method === 'download') {
      return await downloadZipFile(options.characterData);
    } else {
      return await importToSkizoAI(options.characterData);
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to install character',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
