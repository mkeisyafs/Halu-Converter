/**
 * PNG Writer with embedded Character Card V2 chunk (chara).
 *
 * Implements PNG chunk construction with CRC-32 checksum calculation.
 * Produces standard Character Card PNGs compatible with SillyTavern, TavernAI,
 * and SkizoAI.
 */

// ── CRC-32 Table ─────────────────────────────────────────────────────────────
const crcTable: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Base64 helper supporting UTF-8 strings.
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 / dataUrl to Uint8Array.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const clean = dataUrl.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Create a fallback 400x400 transparent PNG if no avatar is provided.
 */
export function createBlankPng(): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Elegant dark gradient placeholder
    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, '#1c1c28');
    grad.addColorStop(1, '#0c0c12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SkizoAI Character', 200, 205);
  }
  return dataUrlToUint8Array(canvas.toDataURL('image/png'));
}

/**
 * Injects a 'tEXt' chunk with keyword 'chara' containing base64 Character Card V2 JSON.
 */
export function writePngWithChara(pngBytes: Uint8Array, charaPayload: object): Uint8Array {
  // Validate PNG header (89 50 4E 47 0D 0A 1A 0A)
  const isPng =
    pngBytes.length >= 8 &&
    pngBytes[0] === 0x89 &&
    pngBytes[1] === 0x50 &&
    pngBytes[2] === 0x4e &&
    pngBytes[3] === 0x47 &&
    pngBytes[4] === 0x0d &&
    pngBytes[5] === 0x0a &&
    pngBytes[6] === 0x1a &&
    pngBytes[7] === 0x0a;

  if (!isPng) {
    throw new Error('Input is not a valid PNG image');
  }

  // Find IEND chunk
  let iendIndex = -1;
  const len = pngBytes.length;
  for (let i = len - 12; i >= 8; i--) {
    if (
      pngBytes[i + 4] === 0x49 && // I
      pngBytes[i + 5] === 0x45 && // E
      pngBytes[i + 6] === 0x4e && // N
      pngBytes[i + 7] === 0x44 // D
    ) {
      iendIndex = i;
      break;
    }
  }

  if (iendIndex === -1) {
    throw new Error('Malformed PNG: IEND chunk not found');
  }

  // Build tEXt chunk
  const jsonStr = JSON.stringify(charaPayload);
  const b64Val = utf8ToBase64(jsonStr);

  const keyword = 'chara';
  const keywordBytes = new TextEncoder().encode(keyword);
  const valueBytes = new TextEncoder().encode(b64Val);

  const chunkDataLength = keywordBytes.length + 1 + valueBytes.length; // +1 for null separator

  // Buffer for [Length: 4][Type: 4][Data: chunkDataLength][CRC: 4]
  const chunkTotalLength = 4 + 4 + chunkDataLength + 4;
  const chunk = new Uint8Array(chunkTotalLength);
  const view = new DataView(chunk.buffer);

  // 1. Length (big-endian)
  view.setUint32(0, chunkDataLength, false);

  // 2. Type 'tEXt'
  chunk[4] = 0x74; // t
  chunk[5] = 0x45; // E
  chunk[6] = 0x58; // X
  chunk[7] = 0x74; // t

  // 3. Keyword
  chunk.set(keywordBytes, 8);
  // Null separator at index 8 + keywordBytes.length is 0 by default in typed array

  // 4. Value
  chunk.set(valueBytes, 8 + keywordBytes.length + 1);

  // 5. CRC32 calculated over Type + Data (starts at offset 4, length is 4 + chunkDataLength)
  const crcTarget = chunk.subarray(4, 8 + chunkDataLength);
  const computedCrc = crc32(crcTarget);
  view.setUint32(8 + chunkDataLength, computedCrc, false);

  // Combine before IEND
  const result = new Uint8Array(pngBytes.length + chunkTotalLength);
  result.set(pngBytes.subarray(0, iendIndex), 0);
  result.set(chunk, iendIndex);
  result.set(pngBytes.subarray(iendIndex), iendIndex + chunkTotalLength);

  return result;
}
