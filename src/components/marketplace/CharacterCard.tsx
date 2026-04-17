import { Download, Send, Star, TrendingUp } from 'lucide-react';
import type { MarketplaceCharacter } from '../../services/api';

interface CharacterCardProps {
  character: MarketplaceCharacter;
  onDownload: (character: MarketplaceCharacter) => void;
  onImport: (character: MarketplaceCharacter) => void;
  loading?: boolean;
}

export function CharacterCard({ character, onDownload, onImport, loading }: CharacterCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden hover:border-purple-500/30 transition-all duration-300 group flex flex-col">
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#0d0d0d]">
        <img
          src={character.thumbnail}
          alt={character.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {character.featured && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
            <span className="hidden sm:inline">Featured</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex flex-col flex-1">
        {/* Name & Creator */}
        <div>
          <h3 className="font-semibold text-white/90 truncate text-xs sm:text-sm leading-tight">{character.name}</h3>
          <p className="text-[10px] sm:text-xs text-white/40 truncate">by {character.creator}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-white/50">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-yellow-500 text-yellow-500" />
            <span>{character.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>{formatNumber(character.downloads)}</span>
          </div>
        </div>

        {/* Tags — hide on very small screens */}
        {character.tags && character.tags.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1">
            {character.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] bg-white/5 text-white/60 rounded-full"
              >
                {tag}
              </span>
            ))}
            {character.tags.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] text-white/40">
                +{character.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 sm:gap-2 pt-1 sm:pt-2 mt-auto">
          <button
            onClick={() => onDownload(character)}
            disabled={loading}
            className="flex-1 py-1.5 sm:py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-[10px] sm:text-xs font-medium text-blue-400 flex items-center justify-center gap-1 sm:gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Download</span>
            <span className="sm:hidden">DL</span>
          </button>
          <button
            onClick={() => onImport(character)}
            disabled={loading}
            className="flex-1 py-1.5 sm:py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-[10px] sm:text-xs font-medium text-purple-400 flex items-center justify-center gap-1 sm:gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
