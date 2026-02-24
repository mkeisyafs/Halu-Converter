import { decodeRPack } from './rpack';

export interface RisuModule {
  name: string;
  description: string;
  lorebook?: any[];
  regex?: any[];
  cjs?: string;
  trigger?: any[];
  id: string;
  lowLevelAccess?: boolean;
  hideIcon?: boolean;
  backgroundEmbedding?: string;
  assets?: [string, string, string][];
  namespace?: string;
  customModuleToggle?: string;
  mcp?: { url: string };
}

export function readModule(data: Uint8Array): RisuModule | null {
  try {
    let pos = 0;
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

    const readLength = () => {
      if (pos + 4 > data.byteLength) throw new Error('EOF');
      const len = dv.getUint32(pos, true);
      pos += 4;
      return len;
    };

    const readByte = () => {
      if (pos + 1 > data.byteLength) throw new Error('EOF');
      const byte = dv.getUint8(pos);
      pos += 1;
      return byte;
    };

    const readData = (len: number) => {
      if (pos + len > data.byteLength) throw new Error('EOF');
      const sub = data.subarray(pos, pos + len);
      pos += len;
      return sub;
    };

    if (readByte() !== 111) return null;
    if (readByte() !== 0) return null;

    const mainLen = readLength();
    const mainDataCompressed = readData(mainLen);
    const mainDataDecoded = decodeRPack(mainDataCompressed);
    const mainJsonStr = new TextDecoder().decode(mainDataDecoded);
    const main: { type: string; module: RisuModule } = JSON.parse(mainJsonStr);

    if (main.type !== 'risuModule' || !main.module) return null;

    const module = main.module;
    module.assets = module.assets || [];

    let i = 0;
    while (pos < data.byteLength) {
      const mark = readByte();
      if (mark === 0) break;
      if (mark !== 1) break;

      const len = readLength();
      const assetDataCompressed = readData(len);
      const assetDataDecoded = decodeRPack(assetDataCompressed);

      if (module.assets[i]) {
        const CHUNK_SIZE = 8192;
        let binary = '';
        for (let j = 0; j < assetDataDecoded.byteLength; j += CHUNK_SIZE) {
          const chunk = assetDataDecoded.subarray(
            j,
            Math.min(j + CHUNK_SIZE, assetDataDecoded.byteLength)
          );
          binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
        }
        module.assets[i][1] = btoa(binary);
      }

      i++;
    }

    return module;
  } catch (_) {
    return null;
  }
}
