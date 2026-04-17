import { Loader2 } from 'lucide-react';
import { CharacterCard } from './CharacterCard';
import { Pagination } from './Pagination';
import type { MarketplaceCharacter } from '../../services/api';

interface CharacterGridProps {
  characters: MarketplaceCharacter[];
  loading?: boolean;
  onDownload: (character: MarketplaceCharacter) => void;
  onImport: (character: MarketplaceCharacter) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function CharacterGrid({
  characters,
  loading,
  onDownload,
  onImport,
  page,
  pageSize,
  total,
  onPageChange,
}: CharacterGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-sm text-white/40">Loading characters...</p>
        </div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <p className="text-white/60">No characters found</p>
          <p className="text-xs text-white/30">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onDownload={onDownload}
            onImport={onImport}
          />
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onChange={onPageChange}
      />
    </div>
  );
}
