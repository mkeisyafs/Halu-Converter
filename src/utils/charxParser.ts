/**
 * Character Data Parser for RtoH Converter
 * 
 * Ported from FE's parser.ts — handles .charx, .png, .json imports.
 * Differences from FE:
 *   - No IndexedDB — assets kept in memory as base64
 *   - No @/ path aliases — all local imports
 *   - Synchronous RPack decode (not async)
 *   - Includes CBS → Template conversion
 *   - Full risu- → halu- conversion
 */
import { Unzip, UnzipInflate } from 'fflate';
import type { CharacterData, ExtractedAsset, RegexScript, LoreEntry, TriggerScript, TriggerCondition, TriggerEffect } from './types';
import { readModule } from './modules';
import { convertCBStoTemplate, convertCBSInLuaCode } from './cbsConverter';

// ─── Helpers ───

/**
 * Convert RisuAI identifiers to HaluAI equivalents
 */
function risuToHalu(text: string): string {
    if (!text || !text.includes('risu-')) return text;
    return text
        .replace(/\brisu-trigger\b/g, 'halu-trigger')
        .replace(/\brisu-btn\b/g, 'halu-btn')
        .replace(/\brisu-ctrl\b/g, 'halu-ctrl')
        .replace(/\brisu-mark\b/g, 'halu-mark')
        .replace(/\brisu-id\b/g, 'halu-id')
        .replace(/\brisu-inlay-image\b/g, 'halu-inlay-image')
        .replace(/\brisu-style\b/g, 'halu-style')
        .replace(/\brisu-file\b/g, 'halu-file');
}

function getValueCaseInsensitive(obj: any, candidates: string[] | string): any {
    if (!obj) return undefined;
    const searchKeys = Array.isArray(candidates) ? candidates : [candidates];
    const objKeys = Object.keys(obj);
    for (const sKey of searchKeys) {
        if (obj[sKey] !== undefined) return obj[sKey];
        const found = objKeys.find((k) => k.toLowerCase() === sKey.toLowerCase());
        if (found) return obj[found];
    }
    return undefined;
}

function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
        mp4: 'video/mp4', webm: 'video/webm',
        ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
        css: 'text/css',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

function bufToBase64(buf: Uint8Array): string {
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < buf.length; i += CHUNK) {
        const chunk = buf.subarray(i, Math.min(i + CHUNK, buf.length));
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
}

function arrayBufferToBase64DataUrl(buffer: ArrayBufferLike, mimeType: string): string {
    const bytes = new Uint8Array(buffer);
    return `data:${mimeType};base64,${bufToBase64(bytes)}`;
}

// ─── Mappers ───

function mapLoreEntry(entry: any, index: number): LoreEntry {
    return {
        id: entry.uid?.toString() || crypto.randomUUID(),
        name: entry.comment || entry.name || `Lore ${index + 1}`,
        activation_keys: Array.isArray(entry.keys)
            ? entry.keys.join(', ')
            : entry.key || '',
        insertion_order: entry.insertion_order ?? entry.order ?? 100,
        prompt: convertCBStoTemplate(entry.content || entry.entry || ''),
        always_active: entry.constant ?? entry.always_active ?? false,
        selective: entry.selective ?? false,
        use_regex: entry.use_regex ?? false,
        token_count: entry.tokens ?? 0,
    };
}

function mapTriggerScript(script: any): TriggerScript {
    const conditions: TriggerCondition[] = (script.conditions || []).map((c: any) => ({
        ...c,
        type: c.type || 'var',
    }));

    // Spread all fields to preserve type-specific properties
    // (e.g. source1/source2 for v2ConcatString, index/indexType for array ops,
    //  display/displayType for v2GetAlertInput, start/end for v2SliceArrayVar, etc.)
    const effects: TriggerEffect[] = (script.effect || []).map((e: any) => ({
        ...e,
        type: e.type || 'v2SetVar',
        indent: e.indent || 0,
    }));

    return {
        comment: script.comment || '',
        type: script.type || 'manual',
        conditions,
        effect: effects,
        lowLevelAccess: script.lowLevelAccess ?? false,
    };
}

function mapRegexScript(script: any): RegexScript | RegexScript[] {
    const type = getValueCaseInsensitive(script, 'type');
    const data = getValueCaseInsensitive(script, 'data');

    if ((type === 'regex' || type?.toLowerCase?.() === 'regex') && Array.isArray(data)) {
        return data.map((r: any) => {
            const inPat = getValueCaseInsensitive(r, ['in', 'findRegex', 'regex', 'pattern', 'key', 'inPattern']) || '';
            const flagValue = getValueCaseInsensitive(r, ['flags', 'flag']) || undefined;
            return {
                id: crypto.randomUUID(),
                name: getValueCaseInsensitive(r, ['comment', 'name', 'label', 'scriptName']) || 'Unnamed Script',
                modificationType: (mapRegexType(getValueCaseInsensitive(r, ['type', 'modificationType'])) || 'modify_output') as any,
                inPattern: inPat,
                outPattern: getValueCaseInsensitive(r, ['out', 'replaceString', 'replacement', 'replace', 'outPattern']) || '',
                flags: flagValue,
                customFlag: getValueCaseInsensitive(r, ['ableFlag', 'customFlag']) || !!flagValue,
            };
        });
    }

    // SillyTavern/Standard format
    const placement = getValueCaseInsensitive(script, 'placement');
    const sType = getValueCaseInsensitive(script, 'type');
    const modType = getValueCaseInsensitive(script, 'modificationType');
    const inPatStandard = getValueCaseInsensitive(script, ['findRegex', 'in', 'inPattern', 'regex', 'pattern', 'key']) || '';
    const flagValueStd = getValueCaseInsensitive(script, ['flags', 'flag']) || undefined;

    return {
        id: script.id || crypto.randomUUID(),
        name: getValueCaseInsensitive(script, ['name', 'scriptName', 'comment', 'label']) || 'Unnamed Script',
        modificationType: ((placement ? mapRegexType(placement) : undefined) ||
            (sType ? mapRegexType(sType) : undefined) ||
            modType || 'modify_output') as any,
        inPattern: inPatStandard,
        outPattern: getValueCaseInsensitive(script, ['replaceString', 'out', 'outPattern', 'replacement', 'replace']) || '',
        flags: flagValueStd,
        customFlag: getValueCaseInsensitive(script, ['ableFlag', 'customFlag']) || !!flagValueStd,
    };
}

function mapRegexType(type: string | undefined): string {
    if (!type) return 'modify_output';
    const normalized = type.toLowerCase().replace(/ /g, '_');
    const typeMap: Record<string, string> = {
        editdisplay: 'modify_display', modify_display: 'modify_display',
        editprocess: 'modify_request', modify_request: 'modify_request',
        editoutput: 'modify_output', editinput: 'modify_input',
        modify_output: 'modify_output', modify_input: 'modify_input',
        edittrans: 'edit_translation', edit_translation: 'edit_translation',
        disabled: 'disabled',
    };
    return typeMap[normalized] || typeMap[type.toLowerCase()] || type;
}

// ─── Normalizer (ported from FE's normalizeCharacterData) ───

function normalizeCharacterData(raw: any): CharacterData {
    if (raw.spec?.toLowerCase().includes('chara_card') || raw.data) {
        const base = raw.data || raw;

        // Extract lorebook entries
        let loreEntries: LoreEntry[] | undefined;
        const lorebook = base.character_book || raw.character_book;
        if (lorebook?.entries) {
            const entries = Array.isArray(lorebook.entries)
                ? lorebook.entries : Object.values(lorebook.entries);
            loreEntries = (entries as any[]).map((e: any, i: number) => mapLoreEntry(e, i));
        }

        // Merge extensions
        const extensions = {
            ...(base.extensions || {}),
            ...(raw.extensions || {}),
            risuai: {
                ...(base.extensions?.risuai || {}),
                ...(raw.extensions?.risuai || {}),
            },
        };

        const flattenRegex = (results: (RegexScript | RegexScript[])[]) =>
            results.flatMap((r) => (Array.isArray(r) ? r : [r]));

        // Regex scripts — multiple priority sources
        let regexScripts: RegexScript[] | undefined;
        const customScriptsSource = getValueCaseInsensitive(extensions?.risuai, ['customScripts', 'custom_scripts', 'CustomScripts']);
        const customScriptsArray = Array.isArray(customScriptsSource)
            ? customScriptsSource
            : typeof customScriptsSource === 'object' && customScriptsSource !== null
                ? Object.values(customScriptsSource) : [];

        if (customScriptsArray.length > 0) {
            regexScripts = flattenRegex(customScriptsArray.map(mapRegexScript));
        }

        if (!regexScripts) {
            const sillyScriptsSource = getValueCaseInsensitive(extensions, ['regex_scripts', 'regexScripts']);
            const sillyScriptsArray = Array.isArray(sillyScriptsSource)
                ? sillyScriptsSource
                : typeof sillyScriptsSource === 'object' && sillyScriptsSource !== null
                    ? Object.values(sillyScriptsSource) : [];
            if (sillyScriptsArray.length > 0) {
                regexScripts = flattenRegex(sillyScriptsArray.map(mapRegexScript));
            }
        }

        if (!regexScripts && extensions?.risuai?.additionalAssets) {
            const risuRegex = extensions.risuai.additionalAssets.filter((a: any) => a.type === 'regex');
            if (risuRegex.length > 0) {
                regexScripts = flattenRegex(risuRegex.map((r: any) => mapRegexScript(r)));
            }
        }

        if (!regexScripts && base.assets && Array.isArray(base.assets)) {
            const assetRegex = base.assets.filter((a: any) => a.type === 'regex');
            if (assetRegex.length > 0) {
                regexScripts = flattenRegex(assetRegex.map((r: any) => mapRegexScript(r)));
            }
        }

        // Alternate greetings
        const alternateGreetings = base.alternate_greetings || raw.alternate_greetings;

        // Background embedding — priority sources
        let backgroundEmbedding: string | undefined;
        let globalNoteReplacement: string | undefined;

        const bgSearchKeys = ['backgroundHTML', 'background_embedding', 'customBackground', 'background embedding', 'Background Embedding'];
        for (const src of [raw.data?.extensions?.risuai, raw.extensions?.risuai, base.extensions?.risuai, extensions?.risuai]) {
            if (!backgroundEmbedding && src) {
                backgroundEmbedding = getValueCaseInsensitive(src, bgSearchKeys);
            }
        }

        if (!backgroundEmbedding) {
            if (raw.extensions?.depth_prompt?.prompt) backgroundEmbedding = raw.extensions.depth_prompt.prompt;
            else if (base.extensions?.depth_prompt?.prompt) backgroundEmbedding = base.extensions.depth_prompt.prompt;
            else if (base.character_note && typeof base.character_note === 'string' && base.character_note.includes('<')) backgroundEmbedding = base.character_note;
            else if (base.system_prompt && typeof base.system_prompt === 'string' && base.system_prompt.includes('<')) backgroundEmbedding = base.system_prompt;
        }

        if (base.post_history_instructions) globalNoteReplacement = base.post_history_instructions;

        // Additional assets (RisuAI format: [[name, value, ext], ...])
        let additionalAssets: ExtractedAsset[] | undefined;
        const risuAdditionalAssets = extensions?.risuai?.additionalAssets || raw.extensions?.risuai?.additionalAssets;
        if (risuAdditionalAssets && Array.isArray(risuAdditionalAssets)) {
            additionalAssets = [];
            for (const asset of risuAdditionalAssets) {
                if (Array.isArray(asset)) {
                    const [name, value, ext] = asset;
                    if (value && typeof value === 'string') {
                        let base64 = value;
                        let mimeType = 'application/octet-stream';
                        if (value.startsWith('data:')) {
                            base64 = value;
                            const match = value.match(/data:([^;]+)/);
                            if (match) mimeType = match[1];
                        } else if (value.startsWith('__asset:') || value.startsWith('embeded://')) {
                            continue;
                        } else {
                            mimeType = getMimeType(ext || name || '');
                            base64 = `data:${mimeType};base64,${value}`;
                        }
                        additionalAssets.push({
                            id: crypto.randomUUID(),
                            value: name || `asset_${additionalAssets.length}`,
                            base64, mimeType,
                        });
                    }
                }
            }
            if (additionalAssets.length === 0) additionalAssets = undefined;
        }

        // Default variables
        let defaultVariables: string | undefined;
        if (extensions?.risuai?.defaultVariables) defaultVariables = extensions.risuai.defaultVariables;

        // Trigger scripts
        let triggerScripts: TriggerScript[] | undefined;
        const triggerscriptSource = getValueCaseInsensitive(extensions?.risuai, ['triggerscript', 'triggerScript', 'trigger_scripts']);
        if (triggerscriptSource && Array.isArray(triggerscriptSource)) {
            triggerScripts = triggerscriptSource.map(mapTriggerScript);
            for (const ts of triggerScripts) {
                if (ts.effect) {
                    for (const eff of ts.effect) {
                        if (eff.type === 'triggerlua' && eff.code) {
                            // Convert CBS patterns ({{button::}}, {{getvar::}}, etc.) inside Lua code
                            eff.code = convertCBSInLuaCode(eff.code);
                            eff.code = risuToHalu(eff.code);
                        }
                    }
                }
            }
        }

        // Advanced settings
        const risuExt = extensions?.risuai || {};
        const advCreator = getValueCaseInsensitive(base, ['creator']) || getValueCaseInsensitive(risuExt, ['creator']) || undefined;
        const advCharacterVersion = getValueCaseInsensitive(base, ['character_version', 'characterVersion']) || getValueCaseInsensitive(risuExt, ['characterVersion', 'character_version']) || undefined;
        const advNickname = getValueCaseInsensitive(base, ['nickname']) || getValueCaseInsensitive(risuExt, ['nickname']) || undefined;

        const risuDepthPrompt = getValueCaseInsensitive(risuExt, ['depthPrompt', 'depth_prompt']);
        const stDepthPrompt = getValueCaseInsensitive(extensions, ['depth_prompt']);
        const depthPromptObj = risuDepthPrompt || stDepthPrompt;
        const advDepthPromptDepth: number | undefined = depthPromptObj?.depth ?? undefined;
        const advDepthPromptText: string | undefined = depthPromptObj?.prompt || depthPromptObj?.text || undefined;

        const advTranslatorNote = getValueCaseInsensitive(risuExt, ['translatorNote', 'translator_note']) || getValueCaseInsensitive(base, ['translator_note', 'translatorNote']) || undefined;
        const advSystemPrompt = getValueCaseInsensitive(risuExt, ['systemPrompt', 'system_prompt']) || undefined;
        const advAdditionalText = getValueCaseInsensitive(risuExt, ['additionalText', 'additional_text']) || getValueCaseInsensitive(base, ['post_history_instructions_position']) || undefined;
        const advLowLevelAccess = getValueCaseInsensitive(risuExt, ['lowLevelAccess', 'low_level_access']) ?? undefined;
        const advHideChatIcon = getValueCaseInsensitive(risuExt, ['hideChatIcon', 'hide_chat_icon']) ?? undefined;
        const advUtilityBot = getValueCaseInsensitive(risuExt, ['utilityBot', 'utility_bot']) ?? undefined;
        const advEscapeOutput = getValueCaseInsensitive(risuExt, ['escapeOutput', 'escape_output']) ?? undefined;

        // Convert CBS → Template → risu→halu
        const convertedInitialMsg = risuToHalu(convertCBStoTemplate(base.first_mes || ''));
        const convertedPersonality = risuToHalu(convertCBStoTemplate(base.description || base.personality || ''));
        const convertedScenario = risuToHalu(convertCBStoTemplate(base.scenario || ''));
        const convertedMsgExample = risuToHalu(convertCBStoTemplate(base.mes_example || ''));
        const convertedBgEmbed = backgroundEmbedding ? risuToHalu(convertCBStoTemplate(backgroundEmbedding)) : undefined;
        const convertedGlobalNote = globalNoteReplacement ? risuToHalu(convertCBStoTemplate(globalNoteReplacement)) : undefined;
        const convertedAltGreetings = Array.isArray(alternateGreetings)
            ? alternateGreetings.map((g: string) => risuToHalu(convertCBStoTemplate(g)))
            : undefined;

        // Convert CBS in regex scripts
        if (regexScripts) {
            for (const script of regexScripts) {
                if (script.outPattern) script.outPattern = risuToHalu(convertCBStoTemplate(script.outPattern));
                if (script.inPattern) script.inPattern = risuToHalu(convertCBStoTemplate(script.inPattern));
            }
        }

        return {
            name: base.name || raw.name || '',
            bio_character: '',
            personality: convertedPersonality,
            scenario: convertedScenario,
            initial_message: convertedInitialMsg,
            message_example: convertedMsgExample,
            alternate_greetings: convertedAltGreetings,
            background_embedding: convertedBgEmbed,
            global_note_replacement: convertedGlobalNote,
            lore_entries: loreEntries,
            regex_scripts: regexScripts,
            additional_assets: additionalAssets,
            default_variables: defaultVariables,
            trigger_scripts: triggerScripts,
            creator: advCreator,
            character_version: advCharacterVersion,
            nickname: advNickname,
            depth_prompt_depth: advDepthPromptDepth,
            depth_prompt_text: advDepthPromptText ? risuToHalu(convertCBStoTemplate(advDepthPromptText)) : undefined,
            translator_note: advTranslatorNote ? risuToHalu(convertCBStoTemplate(advTranslatorNote)) : undefined,
            system_prompt: advSystemPrompt ? risuToHalu(convertCBStoTemplate(advSystemPrompt)) : undefined,
            additional_text: advAdditionalText ? risuToHalu(convertCBStoTemplate(advAdditionalText)) : undefined,
            low_level_access: advLowLevelAccess,
            hide_chat_icon: advHideChatIcon,
            utility_bot: advUtilityBot,
            escape_output: advEscapeOutput,
        };
    }

    // JannyAI
    if (raw.metadata?.tool?.name === 'Janitor-S') {
        return {
            name: raw.name || '',
            bio_character: raw.personality || '',
            personality: raw.description || '',
            scenario: raw.scenario || '',
            initial_message: raw.first_mes || '',
            message_example: raw.mes_example || '',
        };
    }

    // Default flat
    const base = raw.data ? raw.data : raw;
    return {
        name: base.name || '',
        bio_character: base.bio_character || '',
        personality: base.personality || base.description || '',
        scenario: base.scenario || '',
        initial_message: base.initial_message || base.first_mes || '',
        message_example: base.message_example || base.mes_example || '',
    };
}

// ─── CHARX Parser ───

const SUPPORTED_ASSET_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.mp3', '.wav', '.ogg',
    '.mp4', '.webm',
    '.ttf', '.otf', '.woff', '.woff2',
    '.css', '.svg',
]);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

function getFileExtension(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.substring(dot).toLowerCase() : '';
}

/**
 * Streaming ZIP parser for CHARX archives.
 * Uses fflate's Unzip + UnzipInflate which supports more compression methods
 * than unzipSync. Assets are kept in memory as base64 (no IndexedDB).
 */
async function streamParseCharX(file: File): Promise<{
    cardJsonText: string | null;
    moduleData: Uint8Array | null;
    assets: ExtractedAsset[];
    lastImageAssetId: string | null;
}> {
    let cardJsonText: string | null = null;
    let moduleData: Uint8Array | null = null;
    const assets: ExtractedAsset[] = [];
    let lastImageAssetId: string | null = null;

    return new Promise((resolve, reject) => {
        const fileChunks: Map<string, Uint8Array[]> = new Map();

        const unzip = new Unzip();
        unzip.register(UnzipInflate);

        unzip.onfile = (stream) => {
            const fileName = stream.name;

            // Skip directories
            if (fileName.endsWith('/')) {
                stream.start();
                return;
            }

            fileChunks.set(fileName, []);

            stream.ondata = (_err, data, final) => {
                if (data && data.length > 0) {
                    fileChunks.get(fileName)!.push(data);
                }

                if (final) {
                    // Combine chunks into single buffer
                    const chunks = fileChunks.get(fileName)!;
                    const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
                    const combined = new Uint8Array(totalSize);
                    let offset = 0;
                    for (const chunk of chunks) {
                        combined.set(chunk, offset);
                        offset += chunk.length;
                    }
                    fileChunks.delete(fileName);

                    // Route based on filename
                    const lower = fileName.toLowerCase();
                    if (lower === 'card.json' || lower.endsWith('/card.json')) {
                        cardJsonText = new TextDecoder().decode(combined);
                    } else if (lower === 'module.risum' || lower.endsWith('/module.risum')) {
                        moduleData = combined;
                    } else if (!lower.endsWith('.json')) {
                        const ext = getFileExtension(fileName);
                        if (SUPPORTED_ASSET_EXTS.has(ext)) {
                            const shortName = fileName.split('/').pop() || fileName;
                            const mimeType = getMimeType(shortName);
                            const id = crypto.randomUUID();
                            const base64 = arrayBufferToBase64DataUrl(combined.buffer, mimeType);
                            assets.push({ id, value: shortName, base64, mimeType });

                            if (IMAGE_EXTS.has(ext)) lastImageAssetId = id;
                        }
                    }
                }
            };

            stream.start();
        };

        // Read file as ArrayBuffer and feed chunks to the Unzip stream
        file.arrayBuffer().then((buffer) => {
            const data = new Uint8Array(buffer);
            // Feed in chunks (64KB each) for streaming
            const CHUNK_SIZE = 65536;
            for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                const end = Math.min(i + CHUNK_SIZE, data.length);
                const isLast = end === data.length;
                unzip.push(data.subarray(i, end), isLast);
            }

            // After all data is pushed, resolve
            // (fflate processes synchronously within push())
            resolve({ cardJsonText, moduleData, assets, lastImageAssetId });
        }).catch(reject);
    });
}

export async function parseCharacterCHARX(file: File): Promise<CharacterData | null> {
    try {
        // Use streaming fflate.Unzip for better compression method support
        const { cardJsonText, moduleData, assets, lastImageAssetId } =
            await streamParseCharX(file);


        if (!cardJsonText) return null;

        const cardData = JSON.parse(cardJsonText);

        // Process module.risum if present
        if (moduleData) {
            try {
                const module = readModule(moduleData);
                if (module) {
                    cardData.data = cardData.data || {};
                    cardData.data.extensions = cardData.data.extensions || {};
                    cardData.data.extensions.risuai = cardData.data.extensions.risuai || {};

                    if (module.regex && module.regex.length > 0) {
                        cardData.data.extensions.risuai.customScripts = [
                            ...(cardData.data.extensions.risuai.customScripts || []),
                            ...module.regex,
                        ];
                    }
                    if (module.trigger && module.trigger.length > 0) {
                        cardData.data.extensions.risuai.triggerscript = [
                            ...(cardData.data.extensions.risuai.triggerscript || []),
                            ...module.trigger,
                        ];
                    }
                    if (module.backgroundEmbedding) {
                        cardData.data.extensions.risuai.backgroundHTML = module.backgroundEmbedding;
                    }

                    // Module assets
                    if (module.assets && module.assets.length > 0) {
                        for (const asset of module.assets) {
                            const [assetId, base64Data, filename] = asset;
                            if (base64Data) {
                                const mimeType = getMimeType(filename);
                                const cleanB64 = base64Data.replace(/^data:[^;]+;base64,/, '');
                                assets.push({
                                    id: assetId || crypto.randomUUID(),
                                    value: filename || assetId,
                                    base64: `data:${mimeType};base64,${cleanB64}`,
                                    mimeType,
                                });
                            }
                        }
                    }
                }
            } catch (e) {

            }
        }

        // Resolve asset references
        const lookupByValue = new Map<string, ExtractedAsset>();
        const lookupByKey = new Map<string, ExtractedAsset>();
        for (const a of assets) {
            lookupByValue.set(a.value, a);
            const keyFromValue = a.value.replace(/\.[^.]+$/, '');
            lookupByKey.set(keyFromValue, a);
        }
        console.log(`[RtoH CHARX] Built lookup maps: byValue=${lookupByValue.size}, byKey=${lookupByKey.size}`);
        console.log(`[RtoH CHARX] Sample keys:`, [...lookupByKey.keys()].slice(0, 10));
        console.log(`[RtoH CHARX] Sample values:`, [...lookupByValue.keys()].slice(0, 10));

        function findAsset(ref: string): ExtractedAsset | null {
            let stripped = ref;
            if (stripped.startsWith('__asset:')) stripped = stripped.replace('__asset:', '');
            if (stripped.startsWith('embeded://')) stripped = stripped.replace('embeded://', '');
            let meta = lookupByValue.get(stripped) || lookupByKey.get(stripped);
            if (meta) return meta;
            const basename = stripped.split('/').pop() || stripped;
            meta = lookupByValue.get(basename) || lookupByKey.get(basename);
            if (meta) return meta;
            const noExt = basename.replace(/\.[^.]+$/, '');
            return lookupByKey.get(noExt) || null;
        }

        // Update asset names from card.json references
        const risuExt = cardData?.data?.extensions?.risuai;
        let mapped = 0, failed = 0;
        if (risuExt?.additionalAssets && Array.isArray(risuExt.additionalAssets)) {
            console.log(`[RtoH CHARX] additionalAssets count: ${risuExt.additionalAssets.length}`);
            for (const asset of risuExt.additionalAssets) {
                if (!Array.isArray(asset) || asset.length < 2) continue;
                const descriptiveName = asset[0];
                const ref = asset[1];
                if (typeof ref !== 'string' || !descriptiveName) continue;
                if (ref.startsWith('data:')) continue;
                const foundAsset = findAsset(ref);
                if (foundAsset && descriptiveName !== foundAsset.value) {
                    foundAsset.value = descriptiveName;
                    mapped++;
                } else if (!foundAsset) {
                    failed++;
                    if (failed <= 10) {
                        console.warn(`[RtoH CHARX] v2 FAILED to find asset for ref: "${ref.substring(0, 60)}" → "${descriptiveName}"`);
                    }
                }
            }
            console.log(`[RtoH CHARX] v2 Asset name mapping: ${mapped} mapped, ${failed} failed`);
        }

        // Also resolve v3 assets: data.assets = [{type, uri, name, ext}, ...]
        if (cardData?.data?.assets && Array.isArray(cardData.data.assets)) {
            let v3Mapped = 0, v3Failed = 0;
            console.log(`[RtoH CHARX] v3 data.assets count: ${cardData.data.assets.length}`);
            for (const asset of cardData.data.assets) {
                if (!asset?.uri || typeof asset.uri !== 'string') continue;
                if (asset.uri.startsWith('data:') || asset.uri === 'ccdefault:') continue;
                const descriptiveName = asset.name;
                if (!descriptiveName) continue;
                const foundAsset = findAsset(asset.uri);
                if (foundAsset && descriptiveName !== foundAsset.value) {
                    foundAsset.value = descriptiveName;
                    v3Mapped++;
                } else if (!foundAsset) {
                    v3Failed++;
                    if (v3Failed <= 10) {
                        console.warn(`[RtoH CHARX] v3 FAILED to find asset for uri: "${asset.uri.substring(0, 60)}" → "${descriptiveName}"`);
                    }
                }
            }
            console.log(`[RtoH CHARX] v3 Asset name mapping: ${v3Mapped} mapped, ${v3Failed} failed`);
        }

        // Normalize
        const characterData = normalizeCharacterData(cardData);

        // Get character image
        if (lastImageAssetId) {
            const imgAsset = assets.find(a => a.id === lastImageAssetId);
            if (imgAsset) characterData.character_image_base64 = imgAsset.base64;
        }

        // Merge ZIP assets + normalizer assets
        const existingIds = new Set((characterData.additional_assets || []).map(a => a.id));
        const mergedAssets = [...(characterData.additional_assets || [])];
        for (const a of assets) {
            if (!existingIds.has(a.id)) mergedAssets.push(a);
        }
        characterData.additional_assets = mergedAssets.length > 0 ? mergedAssets : undefined;

        return characterData;
    } catch (error) {

        return null;
    }
}

// ─── PNG Parser ───

export async function parseCharacterPNG(file: File): Promise<CharacterData | null> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const assetBase64ByIndex = new Map<string, string>();

    let readedChara = '';
    let readedCCv3 = '';

    let pos = 8;
    while (pos < data.length) {
        const length = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
        const typeBytes = data.slice(pos + 4, pos + 8);
        const type = new TextDecoder().decode(typeBytes);
        const chunkData = data.slice(pos + 8, pos + 8 + length);

        if (type === 'IEND') break;

        if (type === 'tEXt') {
            let key = '';
            let value = '';
            for (let i = 0; i < Math.min(70, chunkData.length); i++) {
                if (chunkData[i] === 0) {
                    key = new TextDecoder().decode(chunkData.slice(0, i));
                    value = new TextDecoder().decode(chunkData.slice(i + 1));
                    break;
                }
            }
            if (key.startsWith('chara-ext-asset_')) {
                const index = key.replace('chara-ext-asset_:', '').replace('chara-ext-asset_', '');
                if (index) assetBase64ByIndex.set(index, value);
            }
            if (key === 'chara' && value.length < 5 * 1024 * 1024) readedChara = value;
            else if (key === 'ccv3' && value.length < 5 * 1024 * 1024) readedCCv3 = value;
        }

        pos += length + 12;
    }

    if (!readedChara && !readedCCv3) return null;

    const decodeChunkToJson = (base64Data: string): any => {
        try {
            if (base64Data.startsWith('{')) return JSON.parse(base64Data);
            let cleanBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
            if (cleanBase64.length % 4 !== 0) cleanBase64 += '='.repeat(4 - (cleanBase64.length % 4));
            const decodedBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
            let decodedText = new TextDecoder('utf-8', { fatal: false }).decode(decodedBytes);
            decodedText = decodedText.replace(/\0/g, '');
            const jsonText = decodedText.slice(decodedText.indexOf('{'), decodedText.lastIndexOf('}') + 1);
            return JSON.parse(jsonText);
        } catch { return null; }
    };

    const deepMerge = (target: any, source: any): any => {
        if (!source) return target;
        if (!target) return source;
        const result = { ...target };
        for (const key of Object.keys(source)) {
            const sv = source[key], tv = target[key];
            if (sv === null || sv === undefined || sv === '') continue;
            if (Array.isArray(sv) && sv.length === 0) continue;
            if (tv === null || tv === undefined || tv === '') { result[key] = sv; continue; }
            if (typeof sv === 'object' && typeof tv === 'object' && !Array.isArray(sv) && !Array.isArray(tv)) {
                result[key] = deepMerge(tv, sv);
            }
        }
        return result;
    };

    function resolveAssetUri(uri: string, assetDict: Map<string, string>): string | undefined {
        if (!uri) return undefined;
        if (uri.startsWith('__asset:')) return assetDict.get(uri.replace('__asset:', '').trim());
        if (uri.startsWith('embeded://')) return undefined;
        if (uri.startsWith('data:')) return uri;
        return uri;
    }

    function resolveRisuPngAssetsInCard(mergedJson: any, assetDict: Map<string, string>) {
        if (mergedJson?.spec === 'chara_card_v3' && Array.isArray(mergedJson?.data?.assets)) {
            for (const a of mergedJson.data.assets) {
                if (!a?.uri || a.uri === 'ccdefault:') continue;
                const resolved = resolveAssetUri(a.uri, assetDict);
                if (resolved) a.uri = resolved;
            }
        }
        const risuai = mergedJson?.data?.extensions?.risuai;
        if (mergedJson?.spec === 'chara_card_v2' && risuai) {
            if (Array.isArray(risuai.emotions)) {
                for (const e of risuai.emotions) {
                    if (!Array.isArray(e) || !e[1]) continue;
                    const resolved = resolveAssetUri(e[1], assetDict);
                    if (resolved) e[1] = resolved;
                }
            }
            if (Array.isArray(risuai.additionalAssets)) {
                for (const a of risuai.additionalAssets) {
                    if (!Array.isArray(a) || !a[1]) continue;
                    const resolved = resolveAssetUri(a[1], assetDict);
                    if (resolved) a[1] = resolved;
                }
            }
        }
    }

    try {
        const ccv3Json = readedCCv3 ? decodeChunkToJson(readedCCv3) : null;
        const charaJson = readedChara ? decodeChunkToJson(readedChara) : null;
        if (!ccv3Json && !charaJson) return null;

        let mergedJson: any;
        if (ccv3Json && charaJson) {
            mergedJson = deepMerge(ccv3Json, charaJson);
            if (ccv3Json.data?.extensions || charaJson.data?.extensions) {
                mergedJson.data = mergedJson.data || {};
                mergedJson.data.extensions = deepMerge(ccv3Json.data?.extensions || {}, charaJson.data?.extensions || {});
                if (ccv3Json.data?.extensions?.risuai || charaJson.data?.extensions?.risuai) {
                    mergedJson.data.extensions.risuai = deepMerge(ccv3Json.data?.extensions?.risuai || {}, charaJson.data?.extensions?.risuai || {});
                }
            }
            if (ccv3Json.extensions || charaJson.extensions) {
                mergedJson.extensions = deepMerge(ccv3Json.extensions || {}, charaJson.extensions || {});
            }

            const assetDict = new Map<string, string>();
            for (const [idx, b64] of assetBase64ByIndex.entries()) {
                assetDict.set(idx, `data:image/png;base64,${b64}`);
            }
            resolveRisuPngAssetsInCard(mergedJson, assetDict);
        } else {
            mergedJson = ccv3Json || charaJson;
        }

        const result = normalizeCharacterData(mergedJson);
        // Use the PNG itself as character image
        result.character_image_base64 = arrayBufferToBase64DataUrl(arrayBuffer, 'image/png');
        return result;
    } catch (e) {

        return null;
    }
}

// ─── JSON Parser ───

export async function parseCharacterJSON(file: File): Promise<CharacterData | null> {
    try {
        const text = await file.text();
        const json = JSON.parse(text);
        let cardData = json;
        if (json.files && Array.isArray(json.files) && json.files.length > 0) {
            for (const fileItem of json.files) {
                if (fileItem.contentParsed) {
                    const parsed = fileItem.contentParsed;
                    if (parsed.spec?.toLowerCase?.().includes('chara_card') || parsed.data?.name || parsed.name) {
                        cardData = parsed;
                        break;
                    }
                }
            }
        }
        return normalizeCharacterData(cardData);
    } catch (e) {

        return null;
    }
}

// ─── Main Entry ───

export async function parseCharacterFile(file: File): Promise<CharacterData | null> {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.charx')) return parseCharacterCHARX(file);
    if (file.type === 'application/json' || fileName.endsWith('.json')) return parseCharacterJSON(file);
    return parseCharacterPNG(file);
}
