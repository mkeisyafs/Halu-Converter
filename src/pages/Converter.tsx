import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Download,
  FileJson,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  X,
  Github,
  Zap,
  Shield,
  Layers,
} from 'lucide-react';
import { parseCharacterFile } from '../utils/charxParser';
import { buildZipFile } from '../utils/zipWriter';
import type { CharacterData } from '../utils/types';

type Stage = 'idle' | 'parsing' | 'converting' | 'ready';

const ACCEPT = '.charx,.png,.jpg,.jpeg,.json';

export default function Converter() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CharacterData | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isProcessing = stage === 'parsing' || stage === 'converting';

  const acceptFile = useCallback(
    (f: File) => {
      const ok =
        /\.charx$/i.test(f.name) ||
        /\.json$/i.test(f.name) ||
        /\.(png|jpe?g|gif|webp)$/i.test(f.name) ||
        f.type.startsWith('image/');

      if (!ok) {
        setError('Unsupported file. Use .charx, .png, or .json');
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const isImage = f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.name);

      setFile(f);
      setPreviewUrl(isImage ? URL.createObjectURL(f) : '');
      setError(null);
      setParsed(null);
      setZipBlob(null);
      setStage('idle');
    },
    [previewUrl],
  );

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setError(null);

    try {
      setStage('parsing');
      setStatusText('Reading file…');
      await frame();

      setStatusText(/\.charx$/i.test(file.name) ? 'Extracting archive…' : 'Parsing character…');
      await frame();

      const data = await parseCharacterFile(file);
      if (!data) {
        setError('No valid character data found in this file.');
        setStage('idle');
        return;
      }
      setParsed(data);

      setStage('converting');
      setStatusText('Building .zip archive…');
      await frame();

      const zipData = await buildZipFile(data);
      setZipBlob(new Blob([new Uint8Array(zipData)], { type: 'application/zip' }));
      setStage('ready');
      setStatusText('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Conversion failed.');
      setStage('idle');
    }
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!zipBlob || !parsed) return;
    const safeName = (parsed.name || 'character').replace(/[^\w.-]+/g, '_');
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [zipBlob, parsed]);

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    setParsed(null);
    setZipBlob(null);
    setError(null);
    setStage('idle');
    setStatusText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 text-white">
      <AmbientBackdrop />

      <header className="relative z-10 border-b border-white/5 bg-ink-950/40 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Halu</p>
              <p className="text-[10px] text-white/40">Character Converter</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300 sm:inline-flex">
              100% client-side
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
        <section className="fade-up text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
            <Sparkles className="h-3 w-3 text-purple-300" />
            Drop. Convert. Done.
          </span>
          <h1 className="mt-5 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            <span className="shine-text">RisuAI character cards</span>
            <br className="hidden sm:block" />
            <span className="text-white/85"> into a portable </span>
            <span className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
              .zip
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/50 sm:text-base">
            Convert <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-white/75">.charx</code>,{' '}
            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-white/75">.png</code>, or{' '}
            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-white/75">.json</code> cards into a clean zip archive — everything runs in your browser, no upload, no tracking.
          </p>
        </section>

        <section className="fade-up mt-10 sm:mt-14" style={{ animationDelay: '80ms' }}>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
            <div className="pointer-events-none absolute -top-px left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />

            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (isProcessing) return;
                const f = e.dataTransfer.files?.[0];
                if (f) acceptFile(f);
              }}
              className={[
                'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all sm:min-h-[260px]',
                isProcessing && 'cursor-wait',
                dragActive
                  ? 'scale-[1.01] border-purple-400/60 bg-purple-500/10'
                  : file
                    ? 'border-white/15 bg-ink-900/60'
                    : 'border-white/10 bg-ink-900/40 hover:border-white/25 hover:bg-ink-900/70',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) acceptFile(f);
                }}
              />

              {file ? (
                <SelectedFilePreview
                  file={file}
                  previewUrl={previewUrl}
                  isProcessing={isProcessing}
                  onClear={handleClear}
                />
              ) : (
                <EmptyDropTarget />
              )}
            </div>

            {isProcessing && (
              <div className="mt-5 fade-up">
                <div className="mb-2 flex items-center gap-2 text-white/80">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
                  <span className="text-sm">{statusText || 'Working…'}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={[
                      'h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out',
                      stage === 'parsing'
                        ? 'w-1/2 from-blue-500 to-purple-500'
                        : 'w-[88%] from-purple-500 to-pink-500',
                    ].join(' ')}
                  >
                    <div className="h-full w-full animate-pulse bg-white/20" />
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-white/30">
                  <Step label="Parse" active={stage === 'parsing'} done={stage === 'converting'} />
                  <Step label="Encode" active={stage === 'converting'} done={false} />
                  <Step label="Ready" active={false} done={false} />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300 fade-up">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {parsed && !isProcessing && (
              <ParsedSummary data={parsed} zipSize={zipBlob?.size ?? 0} />
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {stage === 'idle' && (
                <button
                  onClick={handleConvert}
                  disabled={!file}
                  className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale"
                >
                  <FileJson className="h-4 w-4" />
                  Convert to .zip
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
              {stage === 'ready' && (
                <>
                  <button
                    onClick={handleDownload}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
                  >
                    <Download className="h-4 w-4" />
                    Download .zip
                  </button>
                  <button
                    onClick={handleClear}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white sm:flex-none"
                  >
                    Convert another
                  </button>
                </>
              )}
            </div>

            <p className="mt-4 text-center text-[11px] text-white/30">
              .charx · .png · .json &nbsp;→&nbsp; standard .zip with{' '}
              <code className="font-mono text-white/50">card.json</code> + assets
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Feature
              icon={<Shield className="h-4 w-4 text-emerald-300" />}
              title="Private by default"
              body="No upload, no server. Files never leave your device."
            />
            <Feature
              icon={<Zap className="h-4 w-4 text-yellow-300" />}
              title="Fast & client-side"
              body="Parse, extract, repack — all in your browser."
            />
            <Feature
              icon={<Layers className="h-4 w-4 text-cyan-300" />}
              title="Preserves everything"
              body="Lorebooks, regex, triggers, assets, alt greetings."
            />
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-[11px] text-white/30">
        Halu Converter · AGPL-3.0
      </footer>
    </div>
  );
}

function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-purple-600/20 blur-[120px] float-slow" />
      <div
        className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[120px] float-slow"
        style={{ animationDelay: '6s' }}
      />
      <div
        className="absolute left-1/2 top-1/3 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-[100px] float-slow"
        style={{ animationDelay: '3s' }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
    </div>
  );
}

function Logo() {
  return (
    <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-purple-500/30">
      <div className="absolute inset-[1px] flex items-center justify-center rounded-[10px] bg-ink-950">
        <span className="bg-gradient-to-br from-purple-300 to-cyan-300 bg-clip-text font-extrabold text-transparent">
          H
        </span>
      </div>
    </div>
  );
}

function EmptyDropTarget() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Upload className="h-6 w-6 text-white/40" />
      </div>
      <p className="text-sm font-medium text-white/80">Drop your character card here</p>
      <p className="mt-1 text-xs text-white/40">
        or <span className="text-purple-300 underline-offset-2 hover:underline">browse files</span>
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        <Pill>.charx</Pill>
        <Pill>.png</Pill>
        <Pill>.json</Pill>
      </div>
    </div>
  );
}

function SelectedFilePreview({
  file,
  previewUrl,
  isProcessing,
  onClear,
}: {
  file: File;
  previewUrl: string;
  isProcessing: boolean;
  onClear: () => void;
}) {
  const isCharx = /\.charx$/i.test(file.name);
  const isJson = /\.json$/i.test(file.name);
  const sizeText =
    file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

  const Icon = isCharx ? Package : isJson ? FileJson : ImageIcon;
  const tint = isCharx ? 'text-orange-300' : isJson ? 'text-blue-300' : 'text-purple-300';

  return (
    <div className="text-center">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          className="mx-auto mb-3 max-h-[140px] max-w-full rounded-xl object-contain shadow-lg ring-1 ring-white/10"
        />
      ) : (
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <Icon className={`h-7 w-7 ${tint}`} />
        </div>
      )}

      <p className="mx-auto max-w-[260px] truncate text-sm font-medium text-white/85">
        {file.name}
      </p>
      <p className="mt-0.5 text-[11px] text-white/40">{sizeText}</p>

      {!isProcessing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/50 transition hover:bg-white/5 hover:text-red-300"
        >
          <X className="h-3 w-3" /> Remove
        </button>
      )}
    </div>
  );
}

function ParsedSummary({ data, zipSize }: { data: CharacterData; zipSize: number }) {
  const sizeText =
    zipSize > 1024 * 1024
      ? `${(zipSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(zipSize / 1024).toFixed(1)} KB`;

  const features: { show: boolean; label: string; tint: string }[] = [
    { show: !!data.lore_entries?.length, label: `${data.lore_entries?.length} lore`, tint: 'blue' },
    { show: !!data.regex_scripts?.length, label: `${data.regex_scripts?.length} regex`, tint: 'purple' },
    { show: !!data.additional_assets?.length, label: `${data.additional_assets?.length} assets`, tint: 'orange' },
    { show: !!data.background_embedding, label: 'BG embed', tint: 'green' },
    { show: !!data.trigger_scripts?.length, label: `${data.trigger_scripts?.length} triggers`, tint: 'pink' },
    { show: !!data.default_variables, label: 'CBS vars', tint: 'yellow' },
    {
      show: !!data.alternate_greetings?.length,
      label: `${data.alternate_greetings?.length} alt greet`,
      tint: 'cyan',
    },
  ];

  return (
    <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 fade-up">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-semibold">Ready to download</span>
        </div>
        {zipSize > 0 && <span className="text-[11px] text-white/40">{sizeText}</span>}
      </div>

      <div className="flex items-start gap-3">
        {data.character_image_base64 && (
          <img
            src={data.character_image_base64}
            alt=""
            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover ring-1 ring-white/10"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white/90">{data.name || 'Unnamed character'}</p>
          {data.personality && (
            <p className="mt-0.5 line-clamp-1 text-xs text-white/45">
              {data.personality.slice(0, 140)}
            </p>
          )}
        </div>
      </div>

      {features.some((f) => f.show) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {features.filter((f) => f.show).map((f) => (
            <Tag key={f.label} tint={f.tint}>
              {f.label}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/10 hover:bg-white/[0.04]">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
        {icon}
      </div>
      <p className="text-sm font-semibold text-white/85">{title}</p>
      <p className="mt-0.5 text-xs text-white/45">{body}</p>
    </div>
  );
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={
        done
          ? 'text-emerald-300'
          : active
            ? 'text-purple-300'
            : 'text-white/25'
      }
    >
      {label}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-white/55">
      {children}
    </span>
  );
}

const tagColors: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  pink: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
};

function Tag({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tagColors[tint] || tagColors.blue}`}
    >
      {children}
    </span>
  );
}

function frame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}
