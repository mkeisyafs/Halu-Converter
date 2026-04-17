/**
 * TanStack Query hooks for the Marketplace
 * All fetching, caching, and pagination logic lives here.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../services/api';
import { installCharacter } from '../services/installer';

// ── Query Keys ────────────────────────────────────────────────────────────────
export const marketplaceKeys = {
  all: ['marketplace'] as const,
  categories: () => [...marketplaceKeys.all, 'categories'] as const,
  featured: () => [...marketplaceKeys.all, 'featured'] as const,
  characters: (filters: CharacterFilters) =>
    [...marketplaceKeys.all, 'characters', filters] as const,
  character: (id: string) => [...marketplaceKeys.all, 'character', id] as const,
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CharacterFilters {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  tags?: string[];
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetches category and tag lists (rarely changes — long cache) */
export function useCategories() {
  return useQuery({
    queryKey: marketplaceKeys.categories(),
    queryFn: () => marketplaceApi.getCategories(),
    staleTime: 1000 * 60 * 10,   // 10 min
  });
}

/** Fetches the featured characters strip */
export function useFeaturedCharacters() {
  return useQuery({
    queryKey: marketplaceKeys.featured(),
    queryFn: () => marketplaceApi.getFeaturedCharacters(),
    staleTime: 1000 * 60 * 5,    // 5 min
  });
}

/** Fetches a paginated + filtered page of characters */
export function useCharacters(filters: CharacterFilters) {
  return useQuery({
    queryKey: marketplaceKeys.characters(filters),
    queryFn: () =>
      marketplaceApi.getCharacters({
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search || undefined,
        category: filters.category || undefined,
        tags: filters.tags && filters.tags.length > 0 ? filters.tags : undefined,
      }),
    placeholderData: (prev) => prev,  // keep previous page visible while loading next
  });
}

/** Fetches a single character detail (used before install) */
export function useCharacterDetail(id: string | null) {
  return useQuery({
    queryKey: marketplaceKeys.character(id!),
    queryFn: () => marketplaceApi.getCharacter(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Download or direct-import a character, tracking download count optimistically */
export function useInstallCharacter() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      characterId,
      method,
    }: {
      characterId: string;
      method: 'download' | 'direct';
    }) => {
      const detail = await marketplaceApi.getCharacter(characterId);
      const result = await installCharacter({
        characterId,
        characterData: detail.characterData,
        method,
      });
      if (!result.success) throw new Error(result.error || 'Install failed');
      return { detail, method };
    },
    onSuccess: () => {
      // Invalidate character lists so download counts update
      qc.invalidateQueries({ queryKey: marketplaceKeys.all });
    },
  });
}
