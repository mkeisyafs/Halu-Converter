import hpackMapUrl from './hpack_map.bin?url';

let ENCODE_MAP: Uint8Array | null = null;
let DECODE_MAP: Uint8Array | null = null;
let _initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<void> {
    if (ENCODE_MAP) return;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        const res = await fetch(hpackMapUrl);
        if (!res.ok) throw new Error(`Failed to load hpack_map.bin: ${res.status}`);
        const buf = await res.arrayBuffer();
        if (buf.byteLength !== 256) throw new Error(`Invalid hpack_map.bin size: ${buf.byteLength}`);
        ENCODE_MAP = new Uint8Array(buf);
        DECODE_MAP = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            DECODE_MAP[ENCODE_MAP[i]] = i;
        }
    })();

    return _initPromise;
}

export async function encodeHPack(data: Uint8Array): Promise<Uint8Array> {
    await ensureInit();
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = ENCODE_MAP![data[i]];
    }
    return result;
}

export async function decodeHPack(data: Uint8Array): Promise<Uint8Array> {
    await ensureInit();
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = DECODE_MAP![data[i]];
    }
    return result;
}
