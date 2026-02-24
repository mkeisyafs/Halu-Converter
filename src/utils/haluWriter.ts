import { encodeHPack } from './hpack';
import type { CharacterData } from './types';

function base64ToUint8Array(base64: string): Uint8Array {
    const clean = base64.replace(/^data:[^;]+;base64,/, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function uint8ArrayToBase64(data: Uint8Array): string {
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.subarray(i, Math.min(i + CHUNK, data.length));
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
}

export async function buildHaluFile(data: CharacterData): Promise<Uint8Array> {
    const character: any = {
        name: data.name || '',
        bio_character: data.bio_character || '',
        personality: data.personality || '',
        scenario: data.scenario || '',
        initial_message: data.initial_message || '',
        message_example: data.message_example || '',
    };

    if (data.alternate_greetings?.length) character.alternate_greetings = data.alternate_greetings;
    if (data.background_embedding) character.background_embedding = data.background_embedding;
    if (data.global_note_replacement) character.global_note_replacement = data.global_note_replacement;
    if (data.regex_scripts?.length) character.regex_scripts = data.regex_scripts;
    if (data.lore_entries?.length) character.lore_entries = data.lore_entries;
    if (data.default_variables) character.default_variables = data.default_variables;
    if (data.trigger_scripts?.length) character.trigger_scripts = data.trigger_scripts;
    if (data.creator) character.creator = data.creator;
    if (data.character_version) character.character_version = data.character_version;
    if (data.nickname) character.nickname = data.nickname;
    if (data.depth_prompt_depth !== undefined) character.depth_prompt_depth = data.depth_prompt_depth;
    if (data.depth_prompt_text) character.depth_prompt_text = data.depth_prompt_text;
    if (data.translator_note) character.translator_note = data.translator_note;
    if (data.system_prompt) character.system_prompt = data.system_prompt;
    if (data.additional_text) character.additional_text = data.additional_text;
    if (data.low_level_access !== undefined) character.low_level_access = data.low_level_access;
    if (data.hide_chat_icon !== undefined) character.hide_chat_icon = data.hide_chat_icon;
    if (data.utility_bot !== undefined) character.utility_bot = data.utility_bot;
    if (data.escape_output !== undefined) character.escape_output = data.escape_output;

    const encodedAssets: { name: string; mimeType: string; data: string }[] = [];

    if (data.character_image_base64) {
        try {
            const rawBytes = base64ToUint8Array(data.character_image_base64);
            const encoded = await encodeHPack(rawBytes);
            encodedAssets.push({
                name: '__character_image__',
                mimeType: 'image/png',
                data: uint8ArrayToBase64(encoded),
            });
        } catch (_) { /* skip corrupted image */ }
    }

    if (data.additional_assets?.length) {
        for (const asset of data.additional_assets) {
            try {
                const rawBytes = base64ToUint8Array(asset.base64);
                const encoded = await encodeHPack(rawBytes);
                const haluName = asset.value.replace(/\.risum$/i, '.hai');
                encodedAssets.push({
                    name: haluName,
                    mimeType: asset.mimeType,
                    data: uint8ArrayToBase64(encoded),
                });
            } catch (_) { /* skip corrupted asset */ }
        }
    }

    return new TextEncoder().encode(JSON.stringify({
        version: 1,
        format: 'halu',
        character,
        assets: encodedAssets,
    }));
}
