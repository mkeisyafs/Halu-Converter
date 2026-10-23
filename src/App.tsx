import { useState } from 'react';
import Converter from './pages/Converter';
import JanitorSplitter from './pages/JanitorSplitter';
import { Layers, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'janitor'>('janitor');

  return (
    <div className="min-h-screen bg-ink-950 text-white selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md shadow-purple-600/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">Halu Converter</span>
              <span className="ml-2 rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-purple-300 font-mono">
                v1.1
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center rounded-xl border border-white/10 bg-ink-900/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('janitor')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'janitor'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Janitor Splitter</span>
              <span className="hidden sm:inline rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold">
                NEW
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('converter')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'converter'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>RPack / CHARX</span>
            </button>
          </nav>

          {/* Info Badge */}
          <div className="hidden md:flex items-center gap-2 text-xs text-white/40">
            <span>Ready for SkizoAI</span>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="py-4">
        {activeTab === 'janitor' ? <JanitorSplitter /> : <Converter />}
      </main>
    </div>
  );
}
