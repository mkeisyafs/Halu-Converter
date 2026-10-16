
// ─── RisuAI CBS name tables ─────────────────────────────────
//
// RisuAI's CBS layer (src/ts/cbs.ts) exposes ~174 functions, many with
// aliases. SkizoAI supports a smaller set under its own names. Converting a
// card therefore needs three tables:
//
//   1. RISU_ALIASES  — Risu alias → canonical Risu function name
//   2. RISU_TO_SKIZO — canonical Risu name → SkizoAI name (only when different)
//   3. RISU_LITERAL  — canonical Risu name → literal text (macros SkizoAI has
//                      no function for, but that are just static output)

/** Risu alias → canonical Risu function name. */
const RISU_ALIASES: Record<string, string> = {
    // character / persona / prompt
    'bot': 'char',
    'char_name': 'char', 'charname': 'char',
    'user_name': 'user', 'username': 'user',
    'char_persona': 'personality', 'charpersona': 'personality',
    'char_desc': 'description', 'chardesc': 'description',
    'example_message': 'exampledialogue', 'example_dialogue': 'exampledialogue', 'examplemessage': 'exampledialogue',
    'user_persona': 'persona', 'userpersona': 'persona',
    'systemprompt': 'mainprompt', 'main_prompt': 'mainprompt',
    'globalnote': 'globalnote', 'systemnote': 'globalnote', 'ujb': 'globalnote',
    'jailbreak': 'jb',
    'author_note': 'authornote',
    'worldinfo': 'lorebook',
    'previous_char_chat': 'previouscharchat', 'lastcharmessage': 'previouscharchat',
    'previous_user_chat': 'previoususerchat', 'lastusermessage': 'previoususerchat',
    'usermessages': 'userhistory', 'user_history': 'userhistory',
    'charmessages': 'charhistory', 'char_history': 'charhistory',
    'messages': 'history',
    // chat meta
    'chat_index': 'chatindex',
    'lastmessageindex': 'lastmessageid',
    'firstmessageindex': 'firstmsgindex', 'first_msg_index': 'firstmsgindex',
    'isfirstmessage': 'isfirstmsg', 'is_first_msg': 'isfirstmsg',
    'triggerid': 'trigger_id',
    // time
    'message_time': 'messagetime',
    'message_date': 'messagedate',
    'message_unixtime_array': 'messageunixtimearray',
    'message_idle_duration': 'messageidleduration',
    'idle_duration': 'idleduration',
    'datetimeformat': 'date',
    // vars
    'gettempvar': 'tempvar',
    // comparison
    'not_equal': 'notequal',
    'greater_equal': 'greaterequal',
    'less_equal': 'lessequal',
    // strings
    'prefill_supported': 'prefillsupported', 'prefill': 'prefillsupported',
    'previous_chat_log': 'previouschatlog',
    // arrays / dicts
    'array': 'makearray', 'a': 'makearray', 'make_array': 'makearray',
    'array_length': 'arraylength',
    'array_element': 'arrayelement',
    'array_push': 'arraypush', 'array_pop': 'arraypop',
    'array_shift': 'arrayshift', 'array_splice': 'arraysplice',
    'dict': 'makedict', 'd': 'makedict', 'makeobject': 'makedict',
    'object': 'makedict', 'o': 'makedict', 'make_dict': 'makedict', 'make_object': 'makedict',
    'ele': 'element',
    'objectelement': 'dictelement', 'dict_element': 'dictelement', 'object_element': 'dictelement',
    'dictassert': 'objectassert', 'object_assert': 'objectassert',
    // screen
    'screen_width': 'screenwidth', 'screen_height': 'screenheight',
    // math / misc
    'fixnumber': 'fixnum', 'fix_num': 'fixnum', 'fix_number': 'fixnum',
    'mod': 'remaind', 'remainder': 'remaind',
    'latex': 'tex', 'katex': 'tex', 'furigana': 'ruby',
    // encoding / crypto
    'unicode_encode': 'unicodeencode', 'unicode_decode': 'unicodedecode',
    'unicodeencodefromhex': 'ue', 'unicodedecodefromhex': 'u',
    'xorencrypt': 'xor', 'xorencode': 'xor', 'xore': 'xor',
    'xordecode': 'xordecrypt', 'xord': 'xordecrypt',
    'crypto': 'crypt', 'caesar': 'crypt', 'encrypt': 'crypt', 'decrypt': 'crypt',
    // module
    'module_enabled': 'moduleenabled', 'module_assetlist': 'moduleassetlist',
    // newline / no-op
    'newline': 'br', 'none': 'blank',
    // display-escaping (literal braces / brackets that must survive parsing)
    'displayescapedcurlybracketopen': 'decbo', 'displayescapedcurlybracketclose': 'decbc',
    'ddecbo': 'bo', 'doubledisplayescapedcurlybracketopen': 'bo',
    'ddecbc': 'bc', 'doubledisplayescapedcurlybracketclose': 'bc',
    'debo': 'displayescapedbracketopen', '(': 'displayescapedbracketopen',
    'debc': 'displayescapedbracketclose', ')': 'displayescapedbracketclose',
    'deabo': 'displayescapedanglebracketopen', '<': 'displayescapedanglebracketopen',
    'deabc': 'displayescapedanglebracketclose', '>': 'displayescapedanglebracketclose',
    'dec': 'displayescapedcolon', ':': 'displayescapedcolon',
    ';': 'displayescapedsemicolon',
    'cnl': 'cbr', 'cnewline': 'cbr',
    // conversion-time only
    ':each': '#each',
};

/**
 * Canonical Risu name → SkizoAI function name.
 * Only entries where the two names differ. Everything else keeps its name.
 */
const RISU_TO_SKIZO: Record<string, string> = {
    'previouscharchat': 'lastcharmsg',
    'previoususerchat': 'lastusermsg',
    'greater': 'gt',
    'getglobalvar': 'getvar',
    'setglobalvar': 'setvar',
    'rollpick': 'rollp',
    'addvar': 'addvar',
};

/**
 * Canonical Risu name → literal text. Used for macros SkizoAI has no runtime
 * function for but which are just static output. Braces are emitted as HTML
 * entities so SkizoAI's parser leaves them alone while still rendering them.
 */
const RISU_LITERAL: Record<string, string> = {
    'blank': '',
    'decbo': '&#123;',
    'decbc': '&#125;',
    'bo': '&#123;&#123;',
    'bc': '&#125;&#125;',
    'displayescapedbracketopen': '&#40;',
    'displayescapedbracketclose': '&#41;',
    'displayescapedanglebracketopen': '&lt;',
    'displayescapedanglebracketclose': '&gt;',
    'displayescapedcolon': '&#58;',
    'displayescapedsemicolon': '&#59;',
    'cbr': '\\n',
};

/** Normalize a raw keyword to its canonical Risu function name. */
function canonicalRisu(keyword: string): string {
    const key = keyword.trim().toLowerCase();
    return RISU_ALIASES[key] ?? key;
}

/** Map a raw Risu keyword to the SkizoAI name that should be emitted. */
function toSkizoName(keyword: string): string {
    const canonical = canonicalRisu(keyword);
    return RISU_TO_SKIZO[canonical] ?? canonical;
}

// ─── Helpers ───────────────────────────────────────────────

/**
 * Find position of the matching `}}` for a `{{` at `start`.
 * Handles nested `{{ }}` pairs. Returns index of the first `}` of `}}`, or -1.
 */
function findMatchingClose(text: string, start: number): number {
    let depth = 1;
    let i = start + 2;
    while (i < text.length - 1) {
        if (text[i] === '{' && text[i + 1] === '{') {
            depth++;
            i += 2;
        } else if (text[i] === '}' && text[i + 1] === '}') {
            depth--;
            if (depth === 0) return i;
            i += 2;
        } else {
            i++;
        }
    }
    return -1;
}

/**
 * Split a string on `::` but respect nested `${ }` expressions.
 */
function splitArgs(text: string, delimiter: string = '::'): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    let i = 0;
    while (i < text.length) {
        if (text[i] === '$' && text[i + 1] === '{') { depth++; current += '${'; i += 2; continue; }
        if (text[i] === '{') depth++;
        if (text[i] === '}' && depth > 0) depth--;
        if (depth === 0 && text.substring(i, i + delimiter.length) === delimiter) {
            parts.push(current);
            current = '';
            i += delimiter.length;
            continue;
        }
        current += text[i];
        i++;
    }
    parts.push(current);
    return parts;
}

/**
 * Strip all `${ }` wrappers from a string, leaving bare function calls.
 * Used for conditions so `${screen_width()}` → `screen_width()`.
 * Iterates from innermost outward.
 */
function stripTemplateWrappers(text: string): string {
    let result = text;
    let prev = '';
    while (result !== prev) {
        prev = result;
        result = result.replace(/\$\{([^{}]*)\}/g, '$1');
    }
    return result;
}

// ─── Expression Converter ──────────────────────────────────

/**
 * Convert a simple CBS inner expression to SkizoAI template.
 * Called after nested `{{ }}` are already resolved.
 */
function convertSimpleExpression(inner: string): string {
    const trimmed = inner.trim();
    if (!trimmed) return '';

    // Inline condition: {{? expr}} → ${?(expr)}
    if (trimmed.startsWith('? ') || trimmed === '?') {
        const expr = trimmed.substring(1).trim();
        return `\${?(${expr})}`;
    }

    // Standard keyword::arg::arg pattern
    const parts = splitArgs(trimmed, '::');
    let keyword = canonicalRisu(parts[0]);
    const args = parts.slice(1).map(a => a.trim());

    // Macros SkizoAI has no runtime for, but that are static output
    if (keyword in RISU_LITERAL) {
        const literal = RISU_LITERAL[keyword] ?? '';
        const repeat = parseInt(args[0] ?? '', 10);
        return Number.isFinite(repeat) && repeat > 1 ? literal.repeat(repeat) : literal;
    }

    // Map canonical Risu names onto their SkizoAI counterparts
    keyword = RISU_TO_SKIZO[keyword] ?? keyword;

    if (args.length === 0) {
        return `\${${keyword}()}`;
    }

    const formatted = args.map(a => {
        if (/^-?\d+(\.\d+)?$/.test(a)) return a;
        if (a.trim().startsWith('${') && a.trim().endsWith('}')) {
            return stripTemplateWrappers(a);
        }
        if (a.includes('${')) return a;
        if (a === '') return "''";
        return `'${a.replace(/'/g, "\\'")}'`;
    });

    return `\${${keyword}(${formatted.join(', ')})}`;
}

// ─── Block Handler ─────────────────────────────────────────

/**
 * Process a `{{#if CONDITION}} BODY {{/if}}` block.
 * Returns the converted output and the position after `{{/if}}`.
 */
function handleIfBlock(
    text: string,
    openStart: number,
    openClose: number,
): { output: string; endPos: number } | null {
    // Extract raw condition: everything after "#if " inside the opening tag
    const openingContent = text.substring(openStart + 2, openClose).trim();
    const condRaw = openingContent.substring(3).trim(); // strip "#if "

    const bodyStart = openClose + 2;

    // Scan for matching {{/if}}, tracking depth and {{else}} at depth 1
    let depth = 1;
    let scanPos = bodyStart;
    let elseStart = -1;
    let elseTagEnd = -1;

    while (scanPos < text.length - 1 && depth > 0) {
        if (text[scanPos] === '{' && text[scanPos + 1] === '{') {
            const close = findMatchingClose(text, scanPos);
            if (close < 0) return null;

            const tag = text.substring(scanPos + 2, close).trim();

            if (tag.startsWith('#if') || tag.startsWith('#each') || tag.startsWith('#when') || tag.startsWith('#func') || tag.startsWith('#escape') || tag.startsWith('#pure')) {
                depth++;
            } else if (tag === '/if') {
                depth--;
                if (depth === 0) {
                    // Found matching /if
                    const bodyEnd = scanPos;
                    const endPos = close + 2;

                    // Process condition: convert CBS, strip ? wrapper, strip ${}
                    const condition = processCondition(condRaw);

                    // Extract body (and else body)
                    let bodyText: string;
                    let elseText: string | null = null;

                    if (elseStart >= 0) {
                        bodyText = text.substring(bodyStart, elseStart);
                        elseText = text.substring(elseTagEnd, bodyEnd);
                    } else {
                        bodyText = text.substring(bodyStart, bodyEnd);
                    }

                    // Recursively convert body contents
                    const convertedBody = convertCBStoTemplate(bodyText);

                    if (elseText !== null) {
                        const convertedElse = convertCBStoTemplate(elseText);
                        return {
                            output: `\${if(${condition}){${convertedBody}}}\${if(not(${condition})){${convertedElse}}}`,
                            endPos,
                        };
                    }

                    return {
                        output: `\${if(${condition}){${convertedBody}}}`,
                        endPos,
                    };
                }
            } else if (tag === '/each' || tag === '/when' || tag === '/func' || tag === '/escape' || tag === '/pure' || tag === '/puredisplay' || tag === '/') {
                depth--;
            } else if ((tag === 'else' || tag === ':else') && depth === 1) {
                elseStart = scanPos;
                elseTagEnd = close + 2;
            }

            scanPos = close + 2;
        } else {
            scanPos++;
        }
    }

    return null; // no matching /if found
}

/**
 * Process a `{{#each LIST}} BODY {{/each}}` block.
 */
function handleEachBlock(
    text: string,
    openStart: number,
    openClose: number,
): { output: string; endPos: number } | null {
    const openingContent = text.substring(openStart + 2, openClose).trim();
    const rawAfterEach = openingContent.substring(5).trim(); // strip "#each "
    const bodyStart = openClose + 2;

    // Parse loop variable: "LIST as VAR" or "LIST VAR" (compatibility)
    let listRaw = rawAfterEach;
    let loopVar = 'item';
    const asMatch = rawAfterEach.match(/^([\s\S]+?)\s+as\s+(\w+)$/i);
    if (asMatch) {
        listRaw = asMatch[1].trim();
        loopVar = asMatch[2];
    } else {
        const lastSpace = rawAfterEach.lastIndexOf(' ');
        if (lastSpace > 0) {
            const potentialVar = rawAfterEach.substring(lastSpace + 1).trim();
            const prefix = rawAfterEach.substring(0, lastSpace).trim();
            // Only treat as variable if it's a simple identifier (no braces/quotes/parens) and prefix is non-empty
            if (/^[a-zA-Z_]\w*$/.test(potentialVar) && !prefix.endsWith(',') && !prefix.endsWith('(') && !potentialVar.includes('{')) {
                listRaw = prefix;
                loopVar = potentialVar;
            }
        }
    }

    let depth = 1;
    let scanPos = bodyStart;

    while (scanPos < text.length - 1 && depth > 0) {
        if (text[scanPos] === '{' && text[scanPos + 1] === '{') {
            const close = findMatchingClose(text, scanPos);
            if (close < 0) return null;

            const tag = text.substring(scanPos + 2, close).trim();

            if (tag.startsWith('#if') || tag.startsWith('#each') || tag.startsWith('#when') || tag.startsWith('#func') || tag.startsWith('#escape') || tag.startsWith('#pure')) {
                depth++;
            } else if (tag === '/each') {
                depth--;
                if (depth === 0) {
                    const bodyText = text.substring(bodyStart, scanPos);
                    const endPos = close + 2;

                    const list = processCondition(listRaw);
                    const convertedBody = convertCBStoTemplate(bodyText);

                    return {
                        output: `\${each(${list}, '${loopVar}'){${convertedBody}}}`,
                        endPos,
                    };
                }
            } else if (tag === '/if' || tag === '/when' || tag === '/func' || tag === '/escape' || tag === '/pure' || tag === '/puredisplay' || tag === '/') {
                depth--;
            }

            scanPos = close + 2;
        } else {
            scanPos++;
        }
    }

    return null;
}

/**
 * Process a `{{#when ARGS}} BODY {{/when}}` block.
 * Converts to `${when(args){ body }}`
 */
function handleWhenBlock(
    text: string,
    openStart: number,
    openClose: number,
): { output: string; endPos: number } | null {
    const openingContent = text.substring(openStart + 2, openClose).trim();
    const argsRaw = openingContent.substring(5).trim(); // strip "#when "
    const bodyStart = openClose + 2;

    let depth = 1;
    let scanPos = bodyStart;
    let elseStart = -1;
    let elseTagEnd = -1;

    while (scanPos < text.length - 1 && depth > 0) {
        if (text[scanPos] === '{' && text[scanPos + 1] === '{') {
            const close = findMatchingClose(text, scanPos);
            if (close < 0) return null;

            const tag = text.substring(scanPos + 2, close).trim();

            if (tag.startsWith('#if') || tag.startsWith('#each') || tag.startsWith('#when') || tag.startsWith('#func') || tag.startsWith('#escape') || tag.startsWith('#pure')) {
                depth++;
            } else if (tag === '/when') {
                depth--;
                if (depth === 0) {
                    const bodyEnd = scanPos;
                    const endPos = close + 2;
                    // Process when args as function arguments (::‑separated)
                    // 1. Convert nested CBS first
                    const convertedArgs = convertCBStoTemplate(argsRaw);
                    // 2. Split on :: and format each part
                    const parts = splitArgs(convertedArgs, '::');
                    const formattedParts = parts.map(p => {
                        const trimmed = p.trim();
                        if (!trimmed) return '';
                        // Strip ${ } wrappers so function calls are bare
                        const bare = stripTemplateWrappers(trimmed);
                        if (/^-?\d+(\.\d+)?$/.test(bare)) return bare;
                        if (bare.includes('(')) return bare; // already a function call
                        return `'${bare.replace(/'/g, "\\'")}'`;
                    }).filter(p => p !== '');
                    const whenArgs = formattedParts.join(', ');

                    let bodyText: string;
                    let elseText: string | null = null;

                    if (elseStart >= 0) {
                        bodyText = text.substring(bodyStart, elseStart);
                        elseText = text.substring(elseTagEnd, bodyEnd);
                    } else {
                        bodyText = text.substring(bodyStart, bodyEnd);
                    }

                    const convertedBody = convertCBStoTemplate(bodyText);

                    if (elseText !== null) {
                        const convertedElse = convertCBStoTemplate(elseText);
                        return {
                            output: `\${when(${whenArgs}){${convertedBody}} else {${convertedElse}}}`,
                            endPos,
                        };
                    }

                    return {
                        output: `\${when(${whenArgs}){${convertedBody}}}`,
                        endPos,
                    };
                }
            } else if (tag === '/if' || tag === '/each' || tag === '/func' || tag === '/escape' || tag === '/pure' || tag === '/puredisplay' || tag === '/') {
                depth--;
            } else if ((tag === 'else' || tag === ':else') && depth === 1) {
                elseStart = scanPos;
                elseTagEnd = close + 2;
            }

            scanPos = close + 2;
        } else {
            scanPos++;
        }
    }

    return null;
}

/**
 * Convert colon-separated CBS condition strings like `(equal:getvar:a::0)` or `screen_width > 768`
 * to standard JS/Skizo function syntax `equal(getvar('a'), 0)`.
 */
function convertColonCondition(raw: string): string {
    let str = raw.trim();

    // Strip outer parentheses: (equal:a::b) -> equal:a::b
    while (str.startsWith('(') && str.endsWith(')')) {
        let depth = 0;
        let balanced = true;
        for (let i = 0; i < str.length - 1; i++) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') depth--;
            if (depth === 0) { balanced = false; break; }
        }
        if (balanced) {
            str = str.slice(1, -1).trim();
        } else {
            break;
        }
    }

    // Convert getvar:key or getvar::key -> getvar('key')
    str = str.replace(/\b(getvar|getglobalvar|tempvar|gettempvar)::?([a-zA-Z0-9_]+)\b/gi, (_m, fn, key) => {
        const normFn = fn.toLowerCase().includes('temp') ? 'tempvar' : 'getvar';
        return `${normFn}('${key}')`;
    });

    // Convert keyword aliases for zero-arg functions: screen_width -> screenwidth(), etc.
    str = str.replace(/\b(screen_width|screenwidth|screen_height|screenheight|chat_index|chatindex|lastmessageindex|lastmessageid|previous_char_chat|previouscharchat|lastcharmessage|previous_user_chat|previoususerchat|lastusermessage)\b(?!\()/gi, (_m, kw) => {
        return `${toSkizoName(kw)}()`;
    });

    // If it has functional colon pattern: keyword:arg1:arg2 or keyword::arg1::arg2
    // e.g. equal:getvar('bahasa')::0 or not_equal:getvar('bahasa')::7
    const colonMatch = str.match(/^([a-zA-Z_]\w*)(?:::|:)([\s\S]+)$/);
    if (colonMatch) {
        const keyword = toSkizoName(colonMatch[1] ?? '');

        const rawArgs = colonMatch[2];
        // Split by :: or : if :: not found
        const parts = rawArgs.includes('::') ? splitArgs(rawArgs, '::') : rawArgs.split(':');
        const formatted = parts.map(a => {
            const trimmed = a.trim();
            if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
            if (trimmed.startsWith("'") || trimmed.startsWith('"')) return trimmed;
            if (trimmed.includes('(') && trimmed.endsWith(')')) return trimmed; // already a function call like getvar('x')
            if (trimmed === '') return "''";
            // Check if nested colon call
            if (trimmed.includes(':')) return convertColonCondition(trimmed);
            return `'${trimmed.replace(/'/g, "\\'")}'`;
        });
        return `${keyword}(${formatted.join(', ')})`;
    }

    return str;
}

/**
 * Process a condition string:
 * 1. Convert nested CBS → template
 * 2. Strip `{{? }}` / `${?()}` wrappers
 * 3. Strip `${}` wrappers so function calls are bare
 * 4. Convert Risu colon syntax (equal:getvar:a::b) to equal(getvar('a'), 'b')
 *
 * Example: `{{? {{screen_width}} > 768 }}` → `screenwidth() > 768`
 * Example: `(equal:getvar:bahasa::0)` → `equal(getvar('bahasa'), 0)`
 */
function processCondition(condRaw: string): string {
    let cond = condRaw.trim();

    // 1. If it has CBS double-curly syntax, convert first
    if (cond.includes('{{')) {
        cond = convertCBStoTemplate(cond);
    }

    // 2. Strip ${?(...)} wrapper if present
    const qMatch = cond.match(/^\$\{\?\(([\s\S]*)\)\}$/);
    if (qMatch) {
        cond = qMatch[1].trim();
    }

    // 3. Strip all ${ } wrappers → bare function calls
    cond = stripTemplateWrappers(cond);

    // 4. Convert any remaining Risu colon/alias syntax
    cond = convertColonCondition(cond);

    return cond.trim();
}

/**
 * Handle custom `{#if CONDITION} ... #}` blocks (legacy/regex scripts).
 * Detected when encountering `{#if` (without double braces).
 * Extracts condition (either `{{...}}` or single line) and body.
 */
function handleHashIfBlock(
    text: string,
    openStart: number
): { output: string; endPos: number } | null {
    // Scan for matching '#}'
    let depth = 1;
    let scanPos = openStart + 4; // Skip '{#if'
    let endPos = -1;

    while (scanPos < text.length - 1) {
        if (text.substring(scanPos, scanPos + 4) === '{#if') {
            depth++;
            scanPos += 4;
        } else if (text.substring(scanPos, scanPos + 2) === '#}') {
            depth--;
            if (depth === 0) {
                endPos = scanPos;
                break;
            }
            scanPos += 2;
        } else {
            scanPos++;
        }
    }

    if (endPos < 0) return null; // Unmatched

    // Inner content between '{#if' and '#}'
    // e.g. " {{equal::a::b}} \n content "
    const inner = text.substring(openStart + 4, endPos);

    let condRaw = '';
    let bodyRaw = '';

    // Heuristic to separate condition from body
    // 1. If starts with {{, condition is the {{...}} block
    const trimmedInner = inner.trimStart();

    if (trimmedInner.startsWith('{{')) {
        // Find matching }} relative to trimmedInner
        // We use findMatchingClose which expects full text, so we pass trimmedInner
        const close = findMatchingClose(trimmedInner, 0);
        if (close >= 0) {
            condRaw = trimmedInner.substring(0, close + 2);
            bodyRaw = trimmedInner.substring(close + 2);
        } else {
            // Fallback: take entire inner as condition? Likely malformed.
            return null;
        }
    } else {
        // 2. Fallback: take until first newline
        const nl = inner.indexOf('\n'); // Search in original inner (preserves valid newlines)
        if (nl >= 0) {
            condRaw = inner.substring(0, nl);
            bodyRaw = inner.substring(nl + 1);
        } else {
            // Single line, assume space separation or no body
            const sp = trimmedInner.indexOf(' ');
            if (sp > 0) {
                // Adjust for leading space
                condRaw = trimmedInner.substring(0, sp);
                bodyRaw = trimmedInner.substring(sp + 1);
            } else {
                condRaw = trimmedInner;
                bodyRaw = '';
            }
        }
    }

    const condition = processCondition(condRaw);
    const convertedBody = convertCBStoTemplate(bodyRaw);

    return {
        output: `\${if(${condition}){${convertedBody}}}`,
        endPos: endPos + 2 // Skip '#}'
    };
}

// ─── Main Converter ────────────────────────────────────────

/**
 * Handle a transparent wrapper block such as `{{#pure}} ... {{/pure}}` or
 * `{{#puredisplay}} ... {{/puredisplay}}`. These only modify how CBS is
 * evaluated, which SkizoAI already does, so the body is converted normally and
 * the wrapper is dropped.
 */
function handleTransparentBlock(
    text: string,
    openStart: number,
    openClose: number,
): { output: string; endPos: number } | null {
    const openingContent = text.substring(openStart + 2, openClose).trim();
    const tagName = openingContent.split(/\s+/)[0] ?? '';
    if (!tagName.startsWith('#')) return null;
    const closeTag = `/${tagName.slice(1)}`;
    const bodyStart = openClose + 2;

    let depth = 1;
    let scanPos = bodyStart;

    while (scanPos < text.length - 1 && depth > 0) {
        if (text[scanPos] === '{' && text[scanPos + 1] === '{') {
            const close = findMatchingClose(text, scanPos);
            if (close < 0) return null;

            const tag = text.substring(scanPos + 2, close).trim();

            if (tag === tagName) {
                depth++;
            } else if (tag === closeTag) {
                depth--;
                if (depth === 0) {
                    const body = text.substring(bodyStart, scanPos);
                    return { output: convertCBStoTemplate(body), endPos: close + 2 };
                }
            }

            scanPos = close + 2;
        } else {
            scanPos++;
        }
    }

    return null;
}

/**
 * Handle `{{#escape}} ... {{/escape}}`: the body is emitted literally, with
 * brace tokens as HTML entities so SkizoAI's parser does not touch them.
 */
function handleEscapeBlock(
    text: string,
    openClose: number,
): { output: string; endPos: number } | null {
    const bodyStart = openClose + 2;
    let depth = 1;
    let scanPos = bodyStart;

    while (scanPos < text.length - 1 && depth > 0) {
        if (text[scanPos] === '{' && text[scanPos + 1] === '{') {
            const close = findMatchingClose(text, scanPos);
            if (close < 0) return null;

            const tag = text.substring(scanPos + 2, close).trim();

            if (tag.startsWith('#escape')) {
                depth++;
            } else if (tag === '/escape') {
                depth--;
                if (depth === 0) {
                    const body = text.substring(bodyStart, scanPos);
                    const escaped = body
                        .replace(/\{\{/g, '&#123;&#123;')
                        .replace(/\}\}/g, '&#125;&#125;')
                        .replace(/\$\{/g, '&#36;{');
                    return { output: escaped, endPos: close + 2 };
                }
            }

            scanPos = close + 2;
        } else {
            scanPos++;
        }
    }

    return null;
}

/**
 * Convert all RisuAI CBS syntax in text to SkizoAI template syntax.
 *
 * Uses a depth-tracking parser for nested `{{ }}` and converts
 * block structures (`#if`/`/if`/`else`/`#each`/`/each`) into
 * clean inline block syntax.
 */
export function convertCBStoTemplate(text: string): string {
    if (!text || typeof text !== 'string') return text;
    if (!text.includes('{{')) return text;

    let result = '';
    let i = 0;

    while (i < text.length) {
        // ── Custom Block: {#if ...} ... #} (Legacy/Regex Script syntax)
        if (i < text.length - 3 && text.substring(i, i + 4) === '{#if') {
            const block = handleHashIfBlock(text, i);
            if (block) {
                result += block.output;
                i = block.endPos;
                continue;
            }
        }

        // Look for {{ start
        if (i < text.length - 1 && text[i] === '{' && text[i + 1] === '{') {
            const closePos = findMatchingClose(text, i);
            if (closePos < 0) {
                // Unmatched {{ — output as-is
                result += text[i];
                i++;
                continue;
            }

            const inner = text.substring(i + 2, closePos).trim();

            // ── Comment: {{// ...}} — strip entirely
            if (inner.startsWith('//')) {
                i = closePos + 2;
                continue;
            }

            // ── Block: {{#if ...}} ... {{/if}}
            if (inner.startsWith('#if')) {
                const block = handleIfBlock(text, i, closePos);
                if (block) {
                    result += block.output;
                    i = block.endPos;
                    continue;
                }
            }

            // ── Block: {{#each ...}} ... {{/each}}
            if (inner.startsWith('#each')) {
                const block = handleEachBlock(text, i, closePos);
                if (block) {
                    result += block.output;
                    i = block.endPos;
                    continue;
                }
            }

            // ── Block: {{#when ...}} ... {{/when}}
            if (inner.startsWith('#when')) {
                const block = handleWhenBlock(text, i, closePos);
                if (block) {
                    result += block.output;
                    i = block.endPos;
                    continue;
                }
            }

            // ── Block: {{#pure}}/{{#puredisplay}} ... {{/pure}} (transparent)
            if (inner.startsWith('#pure')) {
                const block = handleTransparentBlock(text, i, closePos);
                if (block) {
                    result += block.output;
                    i = block.endPos;
                    continue;
                }
            }

            // ── Block: {{#escape}} ... {{/escape}} (literal body)
            if (inner.startsWith('#escape')) {
                const block = handleEscapeBlock(text, closePos);
                if (block) {
                    result += block.output;
                    i = block.endPos;
                    continue;
                }
            }

            // ── Orphaned {{/if}}, {{/each}}, {{/when}}, {{else}} — strip them
            if (inner === '/if' || inner === '/each' || inner === '/when' || inner === '/' || inner === 'else' || inner === ':else' || inner === '/pure' || inner === '/puredisplay' || inner === '/escape') {
                i = closePos + 2;
                continue;
            }

            // ── Simple expression: convert nested CBS first, then this expression
            const convertedInner = convertCBStoTemplate(text.substring(i + 2, closePos));
            result += convertSimpleExpression(convertedInner.trim());
            i = closePos + 2;
        } else {
            result += text[i];
            i++;
        }
    }

    return result;
}

/**
 * Convert CBS `{{keyword::arg1::arg2}}` patterns inside Lua code to SkizoAI template syntax.
 * 
 * Unlike `convertCBStoTemplate`, this does NOT attempt block-level conversions
 * (#if/#each/#when) — it only converts simple `{{keyword::args}}` expressions.
 * This is safe for Lua code where `{{button::◉::handler}}` appears inside
 * string literals that will be output as HTML and processed by the template parser.
 */
export function convertCBSInLuaCode(code: string): string {
    if (!code || !code.includes('{{')) return code;

    // Match {{...}} patterns globally
    return code.replace(/\{\{((?:[^{}]|\{(?!\{)|\}(?!\}))*)\}\}/g, (_match, inner: string) => {
        const trimmed = inner.trim();
        if (!trimmed) return _match;

        // Skip comments
        if (trimmed.startsWith('//')) return '';

        // Not CBS: a CBS macro is `name`, `name:args`, `name::args` or `? expr`. Anything
        // else, e.g. the Lua nested table `{{date="SUMMARY", note=summary}}`, is real Lua.
        // ponytail: a nested table holding one bare identifier (`{{x}}`) still looks like
        // CBS; scope conversion to string literals if that ever shows up.
        if (!/^(?:\?|[A-Za-z_][\w-]*(?::[\s\S]*)?$)/.test(trimmed)) return _match;

        // Skip block structures — leave them as-is in Lua code
        if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed === 'else' || trimmed === ':else') {
            return _match;
        }

        // Skip well-known RisuAI template variables that should stay as {{char}}, {{user}}
        // These are handled at runtime by both RisuAI and SkizoAI
        const lower = trimmed.toLowerCase();
        if (lower === 'char' || lower === 'user' || lower === 'char_name' || lower === 'user_name') {
            return _match; // Keep as-is — handled by Lua runtime or template parser
        }

        // Convert simple expressions: {{keyword::arg1::arg2}} → ${keyword('arg1', 'arg2')}
        return convertSimpleExpression(trimmed);
    });
}

/**
 * Convert CBS in all string fields of an object (recursive).
 */
export function convertCBSInObject(obj: any): any {
    if (typeof obj === 'string') return convertCBStoTemplate(obj);
    if (Array.isArray(obj)) return obj.map(item => convertCBSInObject(item));
    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = convertCBSInObject(value);
        }
        return result;
    }
    return obj;
}
