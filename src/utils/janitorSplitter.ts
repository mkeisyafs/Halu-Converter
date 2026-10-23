/**
 * JanitorAI Card & Lorebook Auto-Splitter
 *
 * Automatically inspects bloated JanitorAI prompts, splits multi-character
 * definitions and world info into clean Lorebook entries, and attaches
 * essential regex scripts for seamless import into SkizoAI.
 */

import type { CharacterData, LoreEntry, RegexScript } from './types';

export interface SplitOptions {
  groupMode?: 'individual' | 'grouped'; // 'individual' entries or 'grouped' (BEHAVIORAL / TECHNICAL)
  stripHtml?: boolean;
  addCleaningRegex?: boolean;
  cleanMainPrompt?: boolean;
}

export interface JanitorRawData {
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_message?: string;
  first_mes?: string;
  mes_example?: string;
  example_dialogs?: string;
  avatar?: string;
  character_image_base64?: string;
  creator?: string;
  creator_name?: string;
  [key: string]: unknown;
}

/**
 * Remove HTML tags from text
 */
export function cleanHtmlText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Rough token estimation (4 chars ~ 1 token)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Extract names / aliases from a character block
 */
function extractAliasesFromBlock(tag: string, content: string): string[] {
  const keys = new Set<string>();

  // Tag itself
  keys.add(tag);
  keys.add(tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());

  // {{char}}: Name
  const charMatch = content.match(/\{\{char\}\}\s*:\s*([^\r\n,]+)/i);
  if (charMatch && charMatch[1]) {
    const name = charMatch[1].trim();
    keys.add(name);
    // Add individual words if long
    for (const part of name.split(/\s+/)) {
      if (part.length > 2) keys.add(part);
    }
  }

  // Nickname: Name
  const nickMatch = content.match(/Nickname\s*:\s*([^\r\n(]+)/i);
  if (nickMatch && nickMatch[1]) {
    const nick = nickMatch[1].trim();
    keys.add(nick);
  }

  // Common title match: Joshua "Josh" Voss
  const quoteMatch = content.match(/([A-Z][a-z]+)\s*[“"']([^”"']+)["”']\s*([A-Z][a-z]+)/);
  if (quoteMatch) {
    keys.add(quoteMatch[1]);
    keys.add(quoteMatch[2]);
    keys.add(quoteMatch[3]);
    keys.add(`${quoteMatch[1]} ${quoteMatch[3]}`);
  }

  return Array.from(keys).filter(Boolean);
}

/**
 * Auto-split JanitorAI bot into CharacterData with LoreEntries and RegexScripts.
 */
export function splitJanitorCard(
  raw: JanitorRawData,
  options: SplitOptions = {}
): CharacterData {
  const {
    groupMode = 'individual',
    stripHtml = true,
    addCleaningRegex = true,
    cleanMainPrompt = true,
  } = options;

  const botName = (raw.name || 'Untitled Character').trim();
  const rawDesc = raw.description || '';
  const rawPersonality = raw.personality || '';
  const firstMes = raw.first_message || raw.first_mes || '';
  const mesExample = raw.example_dialogs || raw.mes_example || '';
  const scenario = raw.scenario || '';
  const creator = raw.creator || raw.creator_name || '';

  const loreEntries: LoreEntry[] = [];
  const regexScripts: RegexScript[] = [];

  let workingDesc = rawDesc;
  let workingPersonality = rawPersonality;

  // ── 1. Detect Character Tag Blocks (<name> ... </name>) ────────────────────
  const characterBlocks: Array<{
    tag: string;
    name: string;
    content: string;
    keys: string[];
  }> = [];

  const tagRegex = /<([a-zA-Z0-9_-]{2,20})>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(rawDesc)) !== null) {
    const tag = match[1];
    const blockContent = match[2].trim();
    const keys = extractAliasesFromBlock(tag, blockContent);

    // Determine readable name
    const charNameMatch = blockContent.match(/\{\{char\}\}\s*:\s*([^\r\n,]+)/i);
    const displayName = charNameMatch ? charNameMatch[1].trim() : `${tag.toUpperCase()}`;

    characterBlocks.push({
      tag,
      name: displayName,
      content: blockContent,
      keys,
    });
  }

  // Remove tag blocks from main description if requested
  if (cleanMainPrompt && characterBlocks.length > 0) {
    workingDesc = workingDesc.replace(tagRegex, '').replace(/____+/g, '').trim();
  }

  // ── 2. Detect World / Location / Section Blocks ─────────────────────────────
  const worldBlocks: Array<{
    title: string;
    content: string;
    keys: string[];
  }> = [];

  // Match patterns like "ABOUT CORAL SPRINGS:", "ABOUT EVERAFTER PARK", "LOCATION: Everafter park"
  const cleanPText = stripHtml ? cleanHtmlText(workingPersonality) : workingPersonality;

  const sectionRegex = /(?:ABOUT|LOCATION:?)\s+([A-Z0-9\s_-]{3,40})(?:\s*[:\n])([\s\S]*?)(?=(?:ABOUT|LOCATION|SCENE\s+[A-Z0-9]+|CW\/TW|╭|$))/gi;
  let secMatch: RegExpExecArray | null;

  while ((secMatch = sectionRegex.exec(cleanPText)) !== null) {
    const rawTitle = secMatch[1].trim();
    const content = secMatch[2].trim();
    if (content.length > 20) {
      const keys = [rawTitle, ...rawTitle.split(/\s+/)].filter((k) => k.length > 3);

      worldBlocks.push({
        title: rawTitle,
        content: `### ABOUT ${rawTitle}\n${content}`,
        keys: Array.from(new Set(keys)),
      });
    }
  }

  // ── 3. Build Lorebook Entries Based on Mode ─────────────────────────────────
  let insertionOrder = 100;

  if (groupMode === 'grouped' && characterBlocks.length > 0) {
    // Mode A: Grouped into BEHAVIORAL and TECHNICAL
    const initials = characterBlocks
      .map((b) => b.tag.charAt(0).toUpperCase())
      .join(', ');
    const behavioralName = `BEHAVIORAL - ${initials}`;
    const allCharKeys = Array.from(
      new Set(characterBlocks.flatMap((b) => b.keys).concat(['friends', 'group', 'boys', 'crew']))
    );
    const combinedCharContent = characterBlocks
      .map((b) => `<${b.tag}>\n${b.content}\n</${b.tag}>`)
      .join('\n\n____\n\n');

    loreEntries.push({
      id: crypto.randomUUID(),
      name: behavioralName,
      activation_keys: allCharKeys.join(', '),
      insertion_order: insertionOrder++,
      prompt: combinedCharContent,
      always_active: false,
      selective: false,
      use_regex: false,
      token_count: estimateTokens(combinedCharContent),
    });

    if (worldBlocks.length > 0) {
      const technicalName = `TECHNICAL - ${worldBlocks.map((w) => w.title.slice(0, 3)).join('/')}`;
      const allWorldKeys = Array.from(new Set(worldBlocks.flatMap((w) => w.keys)));
      const combinedWorldContent = worldBlocks.map((w) => w.content).join('\n\n');

      loreEntries.push({
        id: crypto.randomUUID(),
        name: technicalName,
        activation_keys: allWorldKeys.join(', '),
        insertion_order: insertionOrder++,
        prompt: combinedWorldContent,
        always_active: false,
        selective: false,
        use_regex: false,
        token_count: estimateTokens(combinedWorldContent),
      });
    }
  } else {
    // Mode B: Individual Entries for Maximum Flexibility
    for (const b of characterBlocks) {
      loreEntries.push({
        id: crypto.randomUUID(),
        name: `Character: ${b.name}`,
        activation_keys: b.keys.join(', '),
        insertion_order: insertionOrder++,
        prompt: `<${b.tag}>\n${b.content}\n</${b.tag}>`,
        always_active: false,
        selective: false,
        use_regex: false,
        token_count: estimateTokens(b.content),
      });
    }

    for (const w of worldBlocks) {
      loreEntries.push({
        id: crypto.randomUUID(),
        name: `World: ${w.title}`,
        activation_keys: w.keys.join(', '),
        insertion_order: insertionOrder++,
        prompt: w.content,
        always_active: false,
        selective: false,
        use_regex: false,
        token_count: estimateTokens(w.content),
      });
    }
  }

  // ── 4. Standard Cleaning Regex Scripts ──────────────────────────────────────
  if (addCleaningRegex) {
    // 1. Strip residual HTML tags from model outputs
    regexScripts.push({
      id: crypto.randomUUID(),
      name: 'Strip HTML Tags',
      modificationType: 'modify_output',
      inPattern: '</?(?:p|span|div|mark|h[1-6]|blockquote|a|img|hr)[^>]*>',
      outPattern: '',
      flags: 'gi',
      customFlag: false,
    });

    // 2. Normalize 3+ newlines into standard double newlines
    regexScripts.push({
      id: crypto.randomUUID(),
      name: 'Clean Excessive Newlines',
      modificationType: 'modify_output',
      inPattern: '\\n{3,}',
      outPattern: '\\n\\n',
      flags: 'g',
      customFlag: false,
    });
  }

  // ── 5. Prepare Cleaned Summary & Scenario ───────────────────────────────────
  let finalBio = stripHtml ? cleanHtmlText(workingPersonality) : workingPersonality;
  // If personality was filled with web links/credits, keep only short intro
  if (finalBio.length > 500) {
    const lines = finalBio.split('\n').filter((l) => l.trim().length > 0);
    finalBio = lines.slice(0, 5).join('\n');
  }

  const finalCharacter: CharacterData = {
    name: botName,
    bio_character: finalBio || botName,
    personality: workingDesc.trim() || 'Roleplay multi-character scenario.',
    scenario: scenario.trim(),
    initial_message: firstMes.trim(),
    message_example: mesExample.trim(),
    creator: creator,
    character_version: '1.0.0',
    character_image_base64: raw.character_image_base64,
    lore_entries: loreEntries,
    regex_scripts: regexScripts,
  };

  return finalCharacter;
}

/**
 * Generate standard Tavern / SillyTavern Character Card V2 JSON from CharacterData.
 */
export function buildCharaCardV2(char: CharacterData): object {
  const bookEntries = (char.lore_entries || []).map((le, idx) => ({
    id: idx,
    keys: le.activation_keys.split(',').map((k) => k.trim()).filter(Boolean),
    content: le.prompt,
    comment: le.name,
    enabled: true,
    insertion_order: le.insertion_order || 100,
    case_sensitive: false,
    constant: le.always_active || false,
    selective: le.selective || false,
  }));

  const regexScripts = (char.regex_scripts || []).map((rs) => ({
    id: rs.id,
    name: rs.name,
    modification_type: rs.modificationType || 'modify_output',
    in_pattern: rs.inPattern,
    out_pattern: rs.outPattern,
    flags: rs.flags || '',
    is_enabled: true,
  }));

  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: char.name,
      description: char.personality,
      personality: char.bio_character,
      scenario: char.scenario,
      first_mes: char.initial_message,
      mes_example: char.message_example,
      creator: char.creator || 'Halu-Converter',
      character_version: char.character_version || '1.0.0',
      character_book: bookEntries.length > 0 ? {
        name: `${char.name} Lorebook`,
        description: `Auto-extracted lorebook for ${char.name}`,
        scan_depth: 100,
        token_budget: 2048,
        recursive_scanning: false,
        entries: bookEntries,
      } : undefined,
      extensions: {
        regex_scripts: regexScripts.length > 0 ? regexScripts : undefined,
      },
    },
  };
}
