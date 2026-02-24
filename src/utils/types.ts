export interface ExtractedAsset {
    id: string;
    value: string;
    base64: string;
    mimeType: string;
}

export interface LoreEntry {
    id: string;
    name: string;
    activation_keys: string;
    insertion_order: number;
    prompt: string;
    always_active: boolean;
    selective: boolean;
    use_regex: boolean;
    token_count: number;
}

export interface RegexScript {
    id: string;
    name: string;
    modificationType: string;
    inPattern: string;
    outPattern: string;
    flags?: string;
    customFlag?: boolean;
}

export interface TriggerCondition {
    type: string;
    var?: string;
    value?: string;
    operator?: string;
    type2?: string;
    depth?: number;
}

export interface TriggerEffect {
    type: string;
    indent?: number;
    var?: string;
    value?: string;
    valueType?: string;
    operator?: string;
    source?: string;
    sourceType?: string;
    target?: string;
    targetType?: string;
    condition?: string;
    outputVar?: string;
    code?: string;
}

export interface TriggerScript {
    comment: string;
    type: string;
    conditions: TriggerCondition[];
    effect: TriggerEffect[];
    lowLevelAccess: boolean;
}

export interface CharacterData {
    name: string;
    bio_character: string;
    personality: string;
    scenario: string;
    initial_message: string;
    message_example: string;
    alternate_greetings?: string[];
    background_embedding?: string;
    global_note_replacement?: string;
    regex_scripts?: RegexScript[];
    lore_entries?: LoreEntry[];
    additional_assets?: ExtractedAsset[];
    character_image_base64?: string;
    default_variables?: string;
    trigger_scripts?: TriggerScript[];
    creator?: string;
    character_version?: string;
    nickname?: string;
    depth_prompt_depth?: number;
    depth_prompt_text?: string;
    translator_note?: string;
    system_prompt?: string;
    additional_text?: string;
    low_level_access?: boolean;
    hide_chat_icon?: boolean;
    utility_bot?: boolean;
    escape_output?: boolean;
    asset_count?: number;
}
