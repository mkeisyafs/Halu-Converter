import { useState } from 'react';
import { CheckCircle, AlertCircle, X, SlidersHorizontal } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/marketplace/SearchBar';
import { FilterSidebar } from '../components/marketplace/FilterSidebar';
import { CharacterGrid } from '../components/marketplace/CharacterGrid';
import {
  useCategories,
  useFeaturedCharacters,
  useCharacters,
  useInstallCharacter,
} from '../hooks/useMarketplace';
import type { MarketplaceCharacter } from '../services/api';

const PAGE_SIZE = 20;

export function Marketplace() {
  // ── Filter state ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  // ── Toast ─────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Reset to page 1 on any filter change
  const handleSearch = (q: string) => { setSearchQuery(q); setPage(1); };
  const handleCategory = (cat: string | null) => { setSelectedCategory(cat); setPage(1); };
  const handleTags = (tags: string[]) => { setSelectedTags(tags); setPage(1); };
  const clearFilters = () => { setSelectedCategory(null); setSelectedTags([]); setPage(1); };

  const activeFilterCount = (selectedCategory ? 1 : 0) + selectedTags.length;

  // ── TanStack Query ────────────────────────────────────────
  const { data: catalogData } = useCategories();
  const categories = catalogData?.categories ?? [];
  const tags = catalogData?.tags ?? [];

  const { data: featuredCharacters = [] } = useFeaturedCharacters();

  const charactersQuery = useCharacters({
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery || undefined,
    category: selectedCategory || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });
  const characters = charactersQuery.data?.characters ?? [];
  const total = charactersQuery.data?.total ?? 0;
  const loading = charactersQuery.isLoading || charactersQuery.isFetching;

  const installMutation = useInstallCharacter();

  // ── Actions ───────────────────────────────────────────────
  const install = (character: MarketplaceCharacter, method: 'download' | 'direct') => {
    installMutation.mutate(
      { characterId: character.id, method },
      {
        onSuccess: ({ method: m }) => {
          showToast('success', m === 'download'
            ? `${character.name} downloaded!`
            : `${character.name} sent to SkizoAI!`);
        },
        onError: (err) => {
          showToast('error', err instanceof Error ? err.message : 'Failed');
        },
      }
    );
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── UI ────────────────────────────────────────────────────
  const showFeatured =
    featuredCharacters.length > 0 && !searchQuery && !selectedCategory && selectedTags.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      {/* Mobile search pinned below navbar */}
      <div className="sm:hidden sticky top-14 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#1a1a1a] px-4 py-2.5">
        <SearchBar value={searchQuery} onChange={handleSearch} />
      </div>

      {/* Filter drawer backdrop */}
      {filterOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 sm:hidden" onClick={() => setFilterOpen(false)} />
      )}

      {/* Filter drawer */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#0f0f0f] border-r border-[#1a1a1a] z-50 transform transition-transform duration-300 ease-in-out sm:hidden overflow-y-auto ${filterOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="font-semibold text-white/90 text-sm">Filters</span>
          <button onClick={() => setFilterOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="p-4">
          <FilterSidebar
            categories={categories} tags={tags}
            selectedCategory={selectedCategory} selectedTags={selectedTags}
            onCategoryChange={handleCategory} onTagsChange={handleTags}
            onClear={clearFilters}
          />
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-8">

        {/* Featured strip */}
        {showFeatured && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
              ✨ Featured
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {featuredCharacters.slice(0, 5).map((ch) => (
                <div
                  key={ch.id}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden group cursor-pointer ring-1 ring-white/5 hover:ring-purple-500/40 transition-all duration-300"
                  onClick={() => install(ch, 'direct')}
                >
                  <img
                    src={ch.thumbnail}
                    alt={ch.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                    <p className="font-semibold text-white text-[11px] sm:text-sm truncate">{ch.name}</p>
                    <p className="text-[9px] sm:text-xs text-white/55 truncate">by {ch.creator}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API error */}
        {charactersQuery.isError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs sm:text-sm">
              {charactersQuery.error instanceof Error
                ? charactersQuery.error.message
                : 'Failed to load characters'}
            </p>
          </div>
        )}

        {/* Sidebar + grid */}
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden sm:block w-56 flex-shrink-0">
            <div className="bg-[#141414] border border-[#222] rounded-xl p-4 sticky top-24">
              <FilterSidebar
                categories={categories} tags={tags}
                selectedCategory={selectedCategory} selectedTags={selectedTags}
                onCategoryChange={handleCategory} onTagsChange={handleTags}
                onClear={clearFilters}
              />
            </div>
          </aside>

          {/* Character grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              {/* Result count */}
              <p className="text-xs text-white/40 flex-1">
                {loading
                  ? 'Loading…'
                  : `${total} character${total !== 1 ? 's' : ''}`}
              </p>

              {/* Desktop search */}
              <div className="hidden sm:block w-64">
                <SearchBar value={searchQuery} onChange={handleSearch} />
              </div>

              {/* Mobile filter button */}
              <button
                className="sm:hidden relative flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] border border-[#222] rounded-lg text-xs text-white/70 hover:border-purple-500/30 transition-colors"
                onClick={() => setFilterOpen(true)}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            <CharacterGrid
              characters={characters}
              loading={loading}
              onDownload={(ch) => install(ch, 'download')}
              onImport={(ch) => install(ch, 'direct')}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)]">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <p className="text-xs sm:text-sm font-medium">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-1 hover:bg-white/10 rounded p-1 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
