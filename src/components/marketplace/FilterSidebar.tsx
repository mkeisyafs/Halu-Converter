import { Filter, X } from 'lucide-react';

interface FilterSidebarProps {
  categories: string[];
  tags: string[];
  selectedCategory: string | null;
  selectedTags: string[];
  onCategoryChange: (category: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onClear: () => void;
}

export function FilterSidebar({
  categories,
  tags,
  selectedCategory,
  selectedTags,
  onCategoryChange,
  onTagsChange,
  onClear,
}: FilterSidebarProps) {
  const hasFilters = selectedCategory || selectedTags.length > 0;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-white/90">Filters</h3>
        </div>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-xs text-red-400/80 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Category
          </h4>
          <div className="space-y-1">
            <button
              onClick={() => onCategoryChange(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !selectedCategory
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === category
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-white/60 hover:bg-white/5'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasFilters && (
        <div className="pt-3 border-t border-[#222] space-y-2">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Active Filters
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedCategory && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-400">
                <span>{selectedCategory}</span>
                <button
                  onClick={() => onCategoryChange(null)}
                  className="hover:bg-purple-500/20 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {selectedTags.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400"
              >
                <span>{tag}</span>
                <button
                  onClick={() => toggleTag(tag)}
                  className="hover:bg-blue-500/20 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
