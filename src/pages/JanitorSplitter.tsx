import { useState, useRef, useCallback } from 'react';
import {
  Link as LinkIcon,
  Sparkles,
  Download,
  Loader2,
  AlertCircle,
  BookOpen,
  Code2,
  Layers,
  Trash2,
  Edit2,
  Check,
  Upload,
  ShieldCheck,
} from 'lucide-react';
import { fetchJanitorBot } from '../utils/janitorFetcher';
import {
  splitJanitorCard,
  buildCharaCardV2,
  type SplitOptions,
  type JanitorRawData,
} from '../utils/janitorSplitter';
import { parseCharacterFile } from '../utils/charxParser';
import { writePngWithChara, dataUrlToUint8Array, createBlankPng } from '../utils/pngWriter';
import { buildZipFile } from '../utils/zipWriter';
import type { CharacterData, LoreEntry } from '../utils/types';

export default function JanitorSplitter() {
  const [urlInput, setUrlInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenField, setShowTokenField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [groupMode, setGroupMode] = useState<'individual' | 'grouped'>('individual');
  const [stripHtml, setStripHtml] = useState(true);
  const [addRegex, setAddRegex] = useState(true);

  // State
  const [rawBot, setRawBot] = useState<JanitorRawData | null>(null);
  const [splitData, setSplitData] = useState<CharacterData | null>(null);
  const [activeTab, setActiveTab] = useState<'lore' | 'regex' | 'prompt'>('lore');

  // Editing LoreEntry state
  const [editingLoreId, setEditingLoreId] = useState<string | null>(null);
  const [editKeysText, setEditKeysText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-run split whenever options or raw data change
  const recomputeSplit = useCallback(
    (raw: JanitorRawData, mode: 'individual' | 'grouped', html: boolean, regex: boolean) => {
      const options: SplitOptions = {
        groupMode: mode,
        stripHtml: html,
        addCleaningRegex: regex,
        cleanMainPrompt: true,
      };
      const result = splitJanitorCard(raw, options);
      setSplitData(result);
    },
    []
  );

  // Handle URL fetch
  const handleFetchUrl = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a JanitorAI character URL or ID');
      return;
    }
    setError(null);
    setIsLoading(true);
    setStatusText('Fetching character metadata from JanitorAI...');

    try {
      const data = await fetchJanitorBot(urlInput, tokenInput);
      setRawBot(data);
      recomputeSplit(data, groupMode, stripHtml, addRegex);
      setStatusText('');
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch from JanitorAI');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Card File Upload (PNG or JSON)
  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsLoading(true);
    setStatusText('Parsing character card file...');

    try {
      const parsed = await parseCharacterFile(file);
      if (!parsed) {
        throw new Error('Could not read character card from file.');
      }

      // Map parsed character to JanitorRawData
      const raw: JanitorRawData = {
        name: parsed.name,
        description: parsed.personality || '',
        personality: parsed.bio_character || '',
        scenario: parsed.scenario || '',
        first_message: parsed.initial_message || '',
        example_dialogs: parsed.message_example || '',
        character_image_base64: parsed.character_image_base64,
        creator: parsed.creator,
      };

      setRawBot(raw);
      recomputeSplit(raw, groupMode, stripHtml, addRegex);
      setStatusText('');
    } catch (err: any) {
      setError(err?.message || 'Failed to parse card file');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle mode & recompute
  const handleModeChange = (mode: 'individual' | 'grouped') => {
    setGroupMode(mode);
    if (rawBot) recomputeSplit(rawBot, mode, stripHtml, addRegex);
  };

  const handleStripHtmlChange = (val: boolean) => {
    setStripHtml(val);
    if (rawBot) recomputeSplit(rawBot, groupMode, val, addRegex);
  };

  const handleAddRegexChange = (val: boolean) => {
    setAddRegex(val);
    if (rawBot) recomputeSplit(rawBot, groupMode, stripHtml, val);
  };

  // Lore Entry key editing
  const startEditLore = (entry: LoreEntry) => {
    setEditingLoreId(entry.id);
    setEditKeysText(entry.activation_keys);
  };

  const saveEditLore = (id: string) => {
    if (!splitData) return;
    const updated = {
      ...splitData,
      lore_entries: (splitData.lore_entries || []).map((le) =>
        le.id === id ? { ...le, activation_keys: editKeysText } : le
      ),
    };
    setSplitData(updated);
    setEditingLoreId(null);
  };

  const deleteLoreEntry = (id: string) => {
    if (!splitData) return;
    const updated = {
      ...splitData,
      lore_entries: (splitData.lore_entries || []).filter((le) => le.id !== id),
    };
    setSplitData(updated);
  };

  // ── Download Helpers ────────────────────────────────────────────────────────

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Download Character Card PNG (with embedded Tavern V2 chara chunk)
  const handleDownloadPng = async () => {
    if (!splitData) return;
    try {
      const v2Payload = buildCharaCardV2(splitData);

      let imageBytes: Uint8Array;
      if (splitData.character_image_base64) {
        imageBytes = dataUrlToUint8Array(splitData.character_image_base64);
      } else {
        imageBytes = createBlankPng();
      }

      const finalPngBytes = writePngWithChara(imageBytes, v2Payload);
      const blob = new Blob([finalPngBytes as unknown as BlobPart], { type: 'image/png' });
      const safeName = (splitData.name || 'character').replace(/[/\\?%*:|"<>]/g, '_');
      downloadFile(blob, `${safeName}.card.png`);
    } catch (err: any) {
      setError(`Failed to create PNG card: ${err.message}`);
    }
  };

  // 2. Download ZIP (card.json + card.png for SkizoAI)
  const handleDownloadZip = async () => {
    if (!splitData) return;
    try {
      const zipBytes = await buildZipFile(splitData);
      const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });
      const safeName = (splitData.name || 'character').replace(/[/\\?%*:|"<>]/g, '_');
      downloadFile(blob, `${safeName}.zip`);
    } catch (err: any) {
      setError(`Failed to create ZIP: ${err.message}`);
    }
  };

  // 3. Download JSON
  const handleDownloadJson = () => {
    if (!splitData) return;
    const v2Payload = buildCharaCardV2(splitData);
    const blob = new Blob([JSON.stringify(v2Payload, null, 2)], {
      type: 'application/json',
    });
    const safeName = (splitData.name || 'character').replace(/[/\\?%*:|"<>]/g, '_');
    downloadFile(blob, `${safeName}.json`);
  };

  return (
    <div className="relative mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
          <Sparkles className="h-3.5 w-3.5" />
          Janitor to SkizoAI Splitter
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Split Janitor Card into Lorebook & Regex
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Paste a Janitor link or drop a card to automatically separate characters & world info into Lorebooks for SkizoAI.
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5 backdrop-blur-xl sm:p-6">
        {/* Link Input Section */}
        <div className="space-y-4">
          <label className="block text-xs font-medium text-white/70">
            Paste JanitorAI Character URL or Drop Card:
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-white/40">
                <LinkIcon className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="https://janitorai.com/characters/933ae162-bfe0-4fb9-a2ca-510791612fa1_..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                className="w-full rounded-xl border border-white/10 bg-ink-950/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 transition focus:border-purple-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <button
              onClick={handleFetchUrl}
              disabled={isLoading || !urlInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Fetch & Split
                </>
              )}
            </button>
          </div>

          {/* Optional Token & Drop File options */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/40 pt-1">
            <button
              type="button"
              onClick={() => setShowTokenField(!showTokenField)}
              className="text-purple-400 hover:text-purple-300 transition underline underline-offset-4"
            >
              {showTokenField ? 'Hide Janitor Token' : 'Add Janitor Token (Optional for NSFW/Private)'}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition"
            >
              <Upload className="h-3.5 w-3.5" />
              Or upload downloaded card file (.png / .json)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.json,.card.png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
          </div>

          {showTokenField && (
            <div className="rounded-xl border border-white/5 bg-ink-950/40 p-3 fade-up">
              <label className="block text-[11px] font-medium text-white/60 mb-1">
                JanitorAI Bearer Token (found in DevTools Network tab Authorization header):
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ink-950/80 px-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-purple-500/50 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 fade-up">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-6 flex flex-col items-center justify-center p-8 text-center fade-up">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <p className="mt-3 text-sm font-medium text-white/70">{statusText || 'Working…'}</p>
          </div>
        )}

        {/* Split Results Section */}
        {splitData && !isLoading && (
          <div className="mt-8 space-y-6 fade-up">
            {/* Split Settings Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/70">Split Strategy:</span>
                <div className="flex rounded-lg border border-white/10 bg-ink-950/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleModeChange('individual')}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      groupMode === 'individual'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Individual Entries
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('grouped')}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      groupMode === 'grouped'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Grouped (BEHAVIORAL / TECH)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-white/70">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stripHtml}
                    onChange={(e) => handleStripHtmlChange(e.target.checked)}
                    className="rounded border-white/20 bg-ink-950 text-purple-600 focus:ring-0"
                  />
                  <span>Strip HTML</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addRegex}
                    onChange={(e) => handleAddRegexChange(e.target.checked)}
                    className="rounded border-white/20 bg-ink-950 text-purple-600 focus:ring-0"
                  />
                  <span>Add Regex Scripts</span>
                </label>
              </div>
            </div>

            {/* Character Header Preview */}
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-ink-950/40 p-4 sm:flex-row sm:items-center">
              {splitData.character_image_base64 ? (
                <img
                  src={splitData.character_image_base64}
                  alt={splitData.name}
                  className="h-20 w-20 rounded-xl object-cover border border-white/10 shadow-md"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  <BookOpen className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white truncate">{splitData.name}</h3>
                  {splitData.creator && (
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                      by @{splitData.creator}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-white/50">
                  {splitData.bio_character || splitData.personality}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/40">
                  <span className="rounded bg-purple-500/10 px-2 py-0.5 text-purple-300">
                    {splitData.lore_entries?.length || 0} Lorebook Entries
                  </span>
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-indigo-300">
                    {splitData.regex_scripts?.length || 0} Regex Scripts
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs for Lore / Regex / Main Prompt */}
            <div>
              <div className="flex border-b border-white/10 text-xs font-medium text-white/50">
                <button
                  type="button"
                  onClick={() => setActiveTab('lore')}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 transition ${
                    activeTab === 'lore'
                      ? 'border-purple-500 text-purple-300'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Lorebook Entries ({splitData.lore_entries?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('regex')}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 transition ${
                    activeTab === 'regex'
                      ? 'border-purple-500 text-purple-300'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Regex Scripts ({splitData.regex_scripts?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('prompt')}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 transition ${
                    activeTab === 'prompt'
                      ? 'border-purple-500 text-purple-300'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Cleaned Main Prompt
                </button>
              </div>

              {/* Tab Contents */}
              <div className="mt-4">
                {activeTab === 'lore' && (
                  <div className="space-y-3">
                    {splitData.lore_entries && splitData.lore_entries.length > 0 ? (
                      splitData.lore_entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-white/10 bg-ink-950/40 p-3.5 transition hover:border-white/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-white">
                                  {entry.name}
                                </span>
                                <span className="text-[10px] text-white/40">
                                  ~{entry.token_count} tokens
                                </span>
                              </div>

                              {/* Activation Keys */}
                              <div className="mt-2 text-xs">
                                <span className="text-white/40">Keys: </span>
                                {editingLoreId === entry.id ? (
                                  <div className="mt-1 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editKeysText}
                                      onChange={(e) => setEditKeysText(e.target.value)}
                                      className="flex-1 rounded-md border border-purple-500/50 bg-ink-900 px-2 py-1 text-xs text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => saveEditLore(entry.id)}
                                      className="rounded bg-purple-600 p-1 text-white hover:bg-purple-500"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-mono text-purple-300">
                                    {entry.activation_keys || '(None)'}
                                  </span>
                                )}
                              </div>

                              {/* Content preview */}
                              <p className="mt-2 text-xs text-white/60 line-clamp-3 font-mono bg-black/20 p-2 rounded-lg border border-white/5">
                                {entry.prompt}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditLore(entry)}
                                className="rounded p-1 text-white/40 hover:text-white transition"
                                title="Edit Activation Keys"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteLoreEntry(entry.id)}
                                className="rounded p-1 text-white/40 hover:text-red-400 transition"
                                title="Remove Entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-center text-xs text-white/40">
                        No distinct Lorebook entries detected. You can switch to "Grouped" mode to package the prompt.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'regex' && (
                  <div className="space-y-3">
                    {splitData.regex_scripts && splitData.regex_scripts.length > 0 ? (
                      splitData.regex_scripts.map((script) => (
                        <div
                          key={script.id}
                          className="rounded-xl border border-white/10 bg-ink-950/40 p-3.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">{script.name}</span>
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/50 font-mono">
                              {script.modificationType}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                            <div className="rounded bg-black/30 p-2 border border-white/5">
                              <span className="text-white/40 text-[10px] block">Pattern (In):</span>
                              <span className="text-red-300 break-all">{script.inPattern}</span>
                            </div>
                            <div className="rounded bg-black/30 p-2 border border-white/5">
                              <span className="text-white/40 text-[10px] block">Replacement (Out):</span>
                              <span className="text-green-300 break-all">
                                {script.outPattern || '(empty)'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-center text-xs text-white/40">
                        No regex scripts attached.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'prompt' && (
                  <div className="rounded-xl border border-white/10 bg-ink-950/40 p-4 font-mono text-xs text-white/70 whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {splitData.personality || '(No remaining main prompt text)'}
                  </div>
                )}
              </div>
            </div>

            {/* Export & Download Buttons */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Export Split Card (Ready for SkizoAI):
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 hover:from-purple-500 hover:to-pink-500 transition"
                >
                  <Download className="h-4 w-4" />
                  Download .card.png
                </button>

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="flex items-center justify-center gap-2 rounded-xl bg-ink-900 border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-ink-800 hover:border-white/30 transition"
                >
                  <Download className="h-4 w-4" />
                  Download .zip (Skizo)
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="flex items-center justify-center gap-2 rounded-xl bg-ink-900 border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-ink-800 hover:border-white/30 transition"
                >
                  <Download className="h-4 w-4" />
                  Download .json (V2)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
