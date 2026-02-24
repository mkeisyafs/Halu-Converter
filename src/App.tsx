import { useState, useRef, useCallback } from 'react';
import {
  Upload, Download, FileJson, Loader2,
  CheckCircle, AlertCircle, Package, Image, Send,
} from 'lucide-react';
import { parseCharacterFile } from './utils/charxParser';
import { buildHaluFile } from './utils/haluWriter';
import type { CharacterData } from './utils/types';

const HALUAI_URL = "http://localhost:5173";

type Stage = 'idle' | 'parsing' | 'parsed' | 'converting' | 'ready' | 'sent';

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<CharacterData | null>(null);
  const [haluBlob, setHaluBlob] = useState<Blob | null>(null);

  const isCharx = (f: File) => f.name.toLowerCase().endsWith('.charx');
  const isPng = (f: File) => f.type.startsWith('image/');
  const isJson = (f: File) => f.name.toLowerCase().endsWith('.json');

  const handleFileSelect = useCallback((file: File) => {
    if (!isCharx(file) && !isPng(file) && !isJson(file)) {
      setError('Please select a .charx, .png, or .json file');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(isPng(file) ? URL.createObjectURL(file) : '');
    setError(null);
    setParsedData(null);
    setHaluBlob(null);
    setStage('idle');
  }, [previewUrl]);

  // Combined: parse → convert → ready (single click)
  const handleParseAndConvert = useCallback(async () => {
    if (!selectedFile) return;
    setError(null);

    // Step 1: Parse
    setStage('parsing');
    setLoadingText('Reading file...');
    await yieldFrame();

    try {
      setLoadingText(isCharx(selectedFile) ? 'Extracting archive...' : 'Parsing character data...');
      await yieldFrame();

      const data = await parseCharacterFile(selectedFile);
      if (!data) {
        setError('No valid character data found');
        setStage('idle');
        return;
      }

      setParsedData(data);
      setStage('parsed');

      // Step 2: Convert to .halu
      setLoadingText('Encoding assets with HPack...');
      setStage('converting');
      await yieldFrame();

      const haluData = await buildHaluFile(data);
      const blob = new Blob([haluData.buffer as ArrayBuffer], { type: 'application/octet-stream' });
      setHaluBlob(blob);

      setLoadingText('');
      setStage('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setStage('idle');
    }
  }, [selectedFile]);

  const handleDownload = useCallback(() => {
    if (!haluBlob || !parsedData) return;
    const name = (parsedData.name || 'character').replace(/[^a-zA-Z0-9_-]/g, '_');
    const url = URL.createObjectURL(haluBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.halu`;
    a.click();
    URL.revokeObjectURL(url);
  }, [haluBlob, parsedData]);

  const handleImportToHalu = useCallback(() => {
    if (!parsedData) return;

    if (window.opener) {
      window.opener.postMessage(
        { type: 'rtoh-import', payload: parsedData },
        HALUAI_URL
      );
      setStage('sent');
      setTimeout(() => window.close(), 1200);
    } else {
      handleDownload();
    }
  }, [parsedData, handleDownload]);

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
    setParsedData(null);
    setHaluBlob(null);
    setError(null);
    setStage('idle');
    setLoadingText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

  const getFileIcon = () => {
    if (!selectedFile) return null;
    if (isCharx(selectedFile)) return <Package className="w-8 h-8 text-orange-400" />;
    if (isJson(selectedFile)) return <FileJson className="w-8 h-8 text-blue-400" />;
    return <Image className="w-8 h-8 text-purple-400" />;
  };

  const isProcessing = stage === 'parsing' || stage === 'converting';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-[#0f0f0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-lg font-bold">R</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              RtoH Converter
            </h1>
            <p className="text-xs text-white/40">RisuAI → HaluAI Character Converter</p>
          </div>
          <div className="ml-auto">
            <span className="px-2.5 py-1 text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
              AGPL-3.0
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl space-y-6">
          <div className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            {/* Card Header */}
            <div className="px-6 pt-6 pb-4 border-b border-[#1e1e1e]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white/90">Convert Character</h2>
                  <p className="text-xs text-white/40">.charx / .png / .json → .halu</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Drop Zone */}
              <div
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  if (isProcessing) return;
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className={`relative min-h-[180px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${isProcessing ? 'cursor-wait' : 'cursor-pointer'
                  } ${dragActive
                    ? 'border-purple-500 bg-purple-500/5 scale-[1.01]'
                    : selectedFile
                      ? 'border-white/15 bg-[#0d0d0d]'
                      : 'border-[#222] hover:border-white/15 bg-[#0d0d0d] hover:bg-[#111]'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".charx,.png,.jpg,.jpeg,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />

                {selectedFile ? (
                  <div className="text-center p-4">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview"
                        className="max-h-[120px] max-w-full object-contain rounded-lg mx-auto mb-3 ring-1 ring-white/5" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                        {getFileIcon()}
                      </div>
                    )}
                    <p className="text-sm text-white/80 truncate max-w-[250px]">{selectedFile.name}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {selectedFile.size > 1024 * 1024
                        ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(selectedFile.size / 1024).toFixed(1)} KB`}
                    </p>
                    {isCharx(selectedFile) && (
                      <p className="text-xs text-orange-400 mt-1">📦 CHARX Archive</p>
                    )}
                    {!isProcessing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClear(); }}
                        className="mt-3 text-xs text-red-400/80 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-5 h-5 text-white/20" />
                    </div>
                    <p className="text-sm text-white/40 mb-1">Drop your character card here</p>
                    <p className="text-xs text-white/20">.charx, .png, or .json</p>
                  </div>
                )}
              </div>

              {/* Loading Progress Bar */}
              {isProcessing && (
                <div className="space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-white/70">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-sm">{loadingText}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ease-out ${stage === 'parsing'
                      ? 'w-1/2 bg-gradient-to-r from-blue-500 to-purple-500'
                      : 'w-[85%] bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}>
                      <div className="h-full w-full bg-white/20 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span className={stage === 'parsing' ? 'text-blue-400' : 'text-emerald-400'}>
                      {stage === 'parsing' ? '① Parsing...' : '✓ Parsed'}
                    </span>
                    <span className={stage === 'converting' ? 'text-purple-400' : 'text-white/20'}>
                      {stage === 'converting' ? '② Encoding...' : '② Encode'}
                    </span>
                    <span className="text-white/20">③ Ready</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Parsed Preview */}
              {parsedData && !isProcessing && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {stage === 'ready' || stage === 'sent' ? 'Ready to Import!' : 'Character Parsed!'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {parsedData.character_image_base64 && (
                        <img src={parsedData.character_image_base64} alt=""
                          className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white/90">
                          {parsedData.name || 'Unnamed'}
                        </p>
                        {parsedData.personality && (
                          <p className="text-xs text-white/40 line-clamp-1 max-w-[300px]">
                            {parsedData.personality.substring(0, 100)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {parsedData.lore_entries && parsedData.lore_entries.length > 0 && (
                        <Badge color="blue" icon="📖" label={`${parsedData.lore_entries.length} Lore`} />
                      )}
                      {parsedData.regex_scripts && parsedData.regex_scripts.length > 0 && (
                        <Badge color="purple" icon="⚙️" label={`${parsedData.regex_scripts.length} Regex`} />
                      )}
                      {parsedData.additional_assets && parsedData.additional_assets.length > 0 && (
                        <Badge color="orange" icon="🖼️" label={`${parsedData.additional_assets.length} Assets`} />
                      )}
                      {parsedData.background_embedding && (
                        <Badge color="green" icon="🎨" label="BG Embed" />
                      )}
                      {parsedData.trigger_scripts && parsedData.trigger_scripts.length > 0 && (
                        <Badge color="pink" icon="⚡" label={`${parsedData.trigger_scripts.length} Triggers`} />
                      )}
                      {parsedData.default_variables && (
                        <Badge color="yellow" icon="📊" label="CBS Vars" />
                      )}
                      {parsedData.alternate_greetings && parsedData.alternate_greetings.length > 0 && (
                        <Badge color="cyan" icon="💬" label={`${parsedData.alternate_greetings.length} Alt Greet`} />
                      )}
                    </div>
                  </div>

                  {/* .halu size */}
                  {haluBlob && (
                    <p className="text-xs text-white/30">
                      .halu size: {haluBlob.size > 1024 * 1024
                        ? `${(haluBlob.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(haluBlob.size / 1024).toFixed(1)} KB`}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {stage === 'idle' ? (
                  <button
                    onClick={handleParseAndConvert}
                    disabled={!selectedFile}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-500 hover:from-blue-500 hover:to-purple-400 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/10"
                  >
                    <FileJson className="w-4 h-4" /> Parse & Convert
                  </button>
                ) : stage === 'ready' ? (
                  <div className="flex-1 flex gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/10"
                    >
                      <Download className="w-4 h-4" /> Download .halu
                    </button>
                    <button
                      onClick={handleImportToHalu}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/10"
                    >
                      <Send className="w-4 h-4" /> Import to HaluAI
                    </button>
                  </div>
                ) : stage === 'sent' ? (
                  <div className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-emerald-400">
                    <CheckCircle className="w-4 h-4" /> Sent to HaluAI! Closing...
                  </div>
                ) : null}
              </div>

              <p className="text-[11px] text-white/20 text-center pt-1">
                Converts RisuAI character cards (.charx / .png / .json) to HaluAI format
              </p>
            </div>
          </div>

          <footer className="text-center text-[11px] text-white/15 pb-8">
            RtoH Converter • AGPL-3.0 Licensed • Powered by HaluAI
          </footer>
        </div>
      </main>
    </div>
  );
}

/** Yield one animation frame so React can paint */
function yieldFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

function Badge({ color, icon, label }: { color: string; icon: string; label: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/15',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/15',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/15',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/15',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/15',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/15',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${colors[color] || colors.blue}`}>
      {icon} {label}
    </span>
  );
}

export default App;
