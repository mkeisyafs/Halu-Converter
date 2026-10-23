/**
 * JanitorAI Data & Avatar Fetcher
 */

import type { JanitorRawData } from './janitorSplitter';

export function extractJanitorId(input: string): string | null {
  const trimmed = input.trim();
  // UUID regex
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
      // Try with proxy if direct fails
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
      const proxyImg = new Image();
      proxyImg.crossOrigin = 'anonymous';
      proxyImg.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = proxyImg.naturalWidth || 600;
          canvas.height = proxyImg.naturalHeight || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context not available');
          ctx.drawImage(proxyImg, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      proxyImg.onerror = () => reject(new Error('Failed to load avatar image'));
      proxyImg.src = proxyUrl;
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
    throw new Error('Invalid JanitorAI URL or Character ID. Example: https://janitorai.com/characters/933ae162-bfe0-4fb9-a2ca-510791612fa1_character-name');
  }

  // Endpoints to attempt
  const targetUrl = `https://janitorai.com/hampter/characters/${charId}`;
  const candidates: string[] = [
    `/api/janitor/characters/${charId}`, // Vite local dev proxy
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, // CORS Proxy fallback
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
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
        rawJson = await resp.json();
        if (rawJson && (rawJson.name || rawJson.id)) {
          break;
        }
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!rawJson || !rawJson.name) {
    throw new Error(
      lastError?.message ||
        'Failed to fetch character from JanitorAI. The bot might be private, deleted, or blocked by Cloudflare. You can still drop the downloaded .card.png file directly!'
    );
  }

  // Avatar fetching
  let pngDataUrl = '';
  if (rawJson.avatar) {
    const avatarUrl = `https://ella.janitorai.com/bot-avatars/${rawJson.avatar}?width=800`;
    try {
      pngDataUrl = await fetchImageAsPngDataUrl(avatarUrl);
    } catch {
      // Fallback without width param
      try {
        pngDataUrl = await fetchImageAsPngDataUrl(`https://ella.janitorai.com/bot-avatars/${rawJson.avatar}`);
      } catch {
        // Continue without image if avatar fails
      }
    }
  }

  return {
    ...rawJson,
    character_image_base64: pngDataUrl || undefined,
  };
}
