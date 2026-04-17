/**
 * Build a standard .zip file containing:
 *   card.json  — the full CharacterData as JSON
 *   card.png   — the character image (if present)
 *
 * Uses fflate (already a dependency) so no extra packages needed.
 */
import { zipSync } from 'fflate';
import type { CharacterData } from './types';

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function buildZipFile(data: CharacterData): Promise<Uint8Array> {
  // ── card.json ────────────────────────────────────────────
  // Strip the raw base64 image from the JSON to avoid doubling it;
  // the image goes into card.png instead so the ZIP stays clean.
  const cardData = {
    ...data,
    character_image_base64: data.character_image_base64
      ? '__see_card_png__'
      : undefined,
  };

  const cardJson = new TextEncoder().encode(
    JSON.stringify(cardData, null, 2)
  );

  // ── card.png ─────────────────────────────────────────────
  const files: Record<string, Uint8Array> = {
    'card.json': cardJson,
  };

  if (data.character_image_base64) {
    try {
      files['card.png'] = base64ToUint8Array(data.character_image_base64);
    } catch {
      // skip corrupted image
    }
  }

  // ── additional assets ────────────────────────────────────
  if (data.additional_assets?.length) {
    for (const asset of data.additional_assets) {
      try {
        const ext = asset.mimeType?.split('/')[1] || 'bin';
        const filename = `assets/${asset.value || `asset_${Date.now()}`}.${ext}`;
        files[filename] = base64ToUint8Array(asset.base64 || asset.value);
      } catch {
        // skip corrupted asset
      }
    }
  }

  return zipSync(files, { level: 6 });
}
