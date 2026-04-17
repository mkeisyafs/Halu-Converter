import axios from 'axios';
import { MOCK_CHARACTERS, MOCK_CATEGORIES, MOCK_TAGS, MOCK_CHARACTER_DATA } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export interface MarketplaceCharacter {
  id: string;
  name: string;
  creator: string;
  description: string;
  thumbnail: string;
  tags: string[];
  category?: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CharactersResponse {
  characters: MarketplaceCharacter[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CharacterDetailResponse extends MarketplaceCharacter {
  characterData: any; // Full character JSON
  skizoFileSize: number;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const marketplaceApi = {
  // Get paginated characters
  getCharacters: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    tags?: string[];
    category?: string;
    featured?: boolean;
  }): Promise<CharactersResponse> => {
    if (USE_MOCK_DATA) {
      // Mock data simulation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let filtered = [...MOCK_CHARACTERS];
      
      // Apply filters
      if (params?.search) {
        const search = params.search.toLowerCase();
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(search) ||
          c.description.toLowerCase().includes(search) ||
          c.creator.toLowerCase().includes(search)
        );
      }
      
      if (params?.category) {
        filtered = filtered.filter(c => c.category === params.category);
      }
      
      if (params?.tags && params.tags.length > 0) {
        filtered = filtered.filter(c => 
          params.tags!.some(tag => c.tags.includes(tag))
        );
      }
      
      if (params?.featured) {
        filtered = filtered.filter(c => c.featured);
      }
      
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return {
        characters: filtered.slice(start, end),
        total: filtered.length,
        page,
        pageSize,
      };
    }
    
    try {
      const response = await api.get('/api/marketplace/characters', { params });
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock data');
      return marketplaceApi.getCharacters(params);
    }
  },

  // Get single character detail
  getCharacter: async (id: string): Promise<CharacterDetailResponse> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const character = MOCK_CHARACTERS.find(c => c.id === id);
      if (!character) throw new Error('Character not found');
      
      return {
        ...character,
        characterData: MOCK_CHARACTER_DATA,
        skizoFileSize: 1024000,
      };
    }
    
    try {
      const response = await api.get(`/api/marketplace/characters/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock data');
      const character = MOCK_CHARACTERS.find(c => c.id === id);
      if (!character) throw error;
      return {
        ...character,
        characterData: MOCK_CHARACTER_DATA,
        skizoFileSize: 1024000,
      };
    }
  },

  // Get available categories/tags
  getCategories: async (): Promise<{ categories: string[]; tags: string[] }> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        categories: MOCK_CATEGORIES,
        tags: MOCK_TAGS,
      };
    }
    
    try {
      const response = await api.get('/api/marketplace/categories');
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock data');
      return {
        categories: MOCK_CATEGORIES,
        tags: MOCK_TAGS,
      };
    }
  },

  // Track download
  trackDownload: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      console.log('Mock: Tracked download for', id);
      return;
    }
    
    try {
      await api.post(`/api/marketplace/characters/${id}/download`);
    } catch (error) {
      console.warn('Failed to track download, continuing anyway');
    }
  },

  // Get featured characters
  getFeaturedCharacters: async (): Promise<MarketplaceCharacter[]> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return MOCK_CHARACTERS.filter(c => c.featured);
    }
    
    try {
      const response = await api.get('/api/marketplace/characters', {
        params: { featured: true, pageSize: 10 },
      });
      return response.data.characters;
    } catch (error) {
      console.warn('Backend not available, using mock data');
      return MOCK_CHARACTERS.filter(c => c.featured);
    }
  },
};

export default api;
