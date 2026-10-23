/**
 * JanitorAI Data & Avatar Fetcher
 */

import type { JanitorRawData } from './janitorSplitter';

export function extractJanitorId(input: string): string | null {
  const trimmed = input.trim();
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  const match = trimmed.match(uuidRegex);
  return match ? match[0] : null;
}

/**
 * Fetch image and convert to PNG base64 DataURL using canvas
 */
export async function fetchImageAsPngDataUrl(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not available');

        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      // Direct load might fail due to CORS, try fallback image loader
      reject(new Error('Failed to load avatar image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Fetch character data from JanitorAI by URL or Character ID
 */
export async function fetchJanitorBot(
  input: string,
  userToken?: string
): Promise<JanitorRawData> {
  const charId = extractJanitorId(input);
  if (!charId) {
    throw new Error(
      'Invalid JanitorAI URL or Character ID. Example: https://janitorai.com/characters/933ae162-bfe0-4fb9-a2ca-510791612fa1_character-name'
    );
  }

  const targetUrl = `https://janitorai.com/hampter/characters/${charId}`;

  // Candidate endpoints (Prioritizes local / Vercel serverless proxy first)
  const candidates: string[] = [
    `/api/janitor?id=${charId}`,
    `/api/janitor/characters/${charId}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
  ];

  let rawJson: any = null;
  let lastError: Error | null = null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken.trim()}`;
  }

  for (const url of candidates) {
    try {
      const resp = await fetch(url, { headers });
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          if (parsed && (parsed.name || parsed.id)) {
            rawJson = parsed;
            break;
          }
        }
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!rawJson || !rawJson.name) {
    throw new Error(
      lastError?.message ||
        'Gagal mengambil data dari URL JanitorAI (terhalang Cloudflare/CORS). Silakan gunakan tombol upload file untuk memasukkan file .card.png atau .json kartu yang sudah diunduh!'
    );
  }

  // Avatar fetching
  let pngDataUrl = '';
  if (rawJson.avatar) {
    const avatarUrl = `https://ella.janitorai.com/bot-avatars/${rawJson.avatar}?width=800`;
    try {
      pngDataUrl = await fetchImageAsPngDataUrl(avatarUrl);
    } catch {
      // Proceed without image if avatar fetch is restricted by browser CORS
    }
  }

  return {
    ...rawJson,
    character_image_base64: pngDataUrl || undefined,
  };
}
