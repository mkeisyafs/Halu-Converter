# RtoH - SkizoAI Character Marketplace & Converter

A modern web application for discovering, converting, and installing SkizoAI characters.

## Features

### 🏪 Character Marketplace
- Browse curated SkizoAI characters from the community
- Search and filter by categories and tags
- Featured characters showcase
- Character ratings and download statistics
- Dual installation methods:
  - **Download .skizo**: Save character file to your computer
  - **Direct Import**: Send character directly to SkizoAI (if open)

### 🔄 Character Converter
- Convert RisuAI character cards to SkizoAI format
- Supports multiple input formats:
  - `.charx` (RisuAI archive)
  - `.png` (embedded character data)
  - `.json` (character JSON)
- Outputs `.skizo` format with HPack-compressed assets
- Preserves all character features:
  - Lorebooks
  - Regex scripts
  - Trigger scripts
  - Additional assets
  - Background embeddings
  - CBS variables

## Project Structure

```
RtoH/
├── src/
│   ├── pages/
│   │   ├── Marketplace.tsx       # Main marketplace page
│   │   └── Converter.tsx         # Character converter page
│   ├── components/
│   │   └── marketplace/
│   │       ├── CharacterCard.tsx    # Character display card
│   │       ├── CharacterGrid.tsx    # Grid layout with pagination
│   │       ├── FilterSidebar.tsx    # Category/tag filters
│   │       └── SearchBar.tsx        # Debounced search input
│   ├── services/
│   │   ├── api.ts               # Marketplace API client
│   │   └── installer.ts         # Character installation logic
│   ├── utils/
│   │   ├── charxParser.ts       # Parse .charx files
│   │   ├── skizoWriter.ts       # Build .skizo files
│   │   ├── hpack.ts             # HPack compression
│   │   └── types.ts             # TypeScript types
│   └── App.tsx                  # Router setup
├── .env                         # Environment variables
└── package.json
```

## Routes

- `/` - Character Marketplace (main page)
- `/converter` - Character Converter

## Environment Variables

Create a `.env` file in the RtoH directory:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SKIZOAI_URL=http://localhost:5173
```

## Installation

```bash
cd RtoH
npm install
```

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5174`

## Build

```bash
npm run build
```

## Backend API Requirements

The marketplace requires a backend API with the following endpoints:

### GET `/api/marketplace/characters`
Returns paginated list of characters.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20)
- `search` (string): Search query
- `category` (string): Filter by category
- `tags` (string[]): Filter by tags
- `featured` (boolean): Only featured characters

**Response:**
```json
{
  "characters": [
    {
      "id": "uuid",
      "name": "Character Name",
      "creator": "Creator Name",
      "description": "Character description",
      "thumbnail": "https://cdn.example.com/thumb.jpg",
      "tags": ["anime", "fantasy"],
      "category": "Anime",
      "downloads": 1234,
      "rating": 4.5,
      "ratingCount": 89,
      "featured": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### GET `/api/marketplace/characters/:id`
Returns full character details including character data.

**Response:**
```json
{
  "id": "uuid",
  "name": "Character Name",
  "creator": "Creator Name",
  "description": "Character description",
  "thumbnail": "https://cdn.example.com/thumb.jpg",
  "tags": ["anime", "fantasy"],
  "category": "Anime",
  "downloads": 1234,
  "rating": 4.5,
  "ratingCount": 89,
  "featured": false,
  "skizoFileSize": 1024000,
  "characterData": {
    "name": "Character Name",
    "bio_character": "...",
    "personality": "...",
    "scenario": "...",
    "initial_message": "...",
    "message_example": "...",
    "character_image_base64": "data:image/png;base64,...",
    "lore_entries": [],
    "regex_scripts": [],
    "trigger_scripts": [],
    "additional_assets": []
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### GET `/api/marketplace/categories`
Returns available categories and tags.

**Response:**
```json
{
  "categories": ["Anime", "Game", "VTuber", "Original"],
  "tags": ["SFW", "NSFW", "Fantasy", "Sci-Fi", "Romance"]
}
```

### POST `/api/marketplace/characters/:id/download`
Tracks character download count.

**Response:**
```json
{
  "success": true
}
```

### GET `/api/marketplace/characters` (featured)
Get featured characters.

**Query Parameters:**
- `featured=true`
- `pageSize=10`

## Integration with SkizoAI

### Direct Import via postMessage

When a user clicks "Import to SkizoAI", RtoH sends a message to SkizoAI:

```javascript
window.opener.postMessage(
  {
    type: 'rtoh-import',
    payload: characterData // Full CharacterData object
  },
  SKIZOAI_URL
);
```

SkizoAI should listen for this message:

```javascript
window.addEventListener('message', (event) => {
  if (event.origin !== RTOH_URL) return;
  
  if (event.data.type === 'rtoh-import') {
    const characterData = event.data.payload;
    // Import character to SkizoAI
    importCharacter(characterData);
  }
});
```

### Download .skizo File

Users can download `.skizo` files and manually import them to SkizoAI through the import modal.

## Character Data Format

The `.skizo` format is a JSON file with HPack-compressed assets:

```json
{
  "version": 1,
  "format": "skizo",
  "character": {
    "name": "Character Name",
    "bio_character": "...",
    "personality": "...",
    "scenario": "...",
    "initial_message": "...",
    "message_example": "...",
    "alternate_greetings": [],
    "lore_entries": [],
    "regex_scripts": [],
    "trigger_scripts": [],
    "default_variables": "...",
    "creator": "Creator Name",
    "character_version": "1.0"
  },
  "assets": [
    {
      "name": "__character_image__",
      "mimeType": "image/png",
      "data": "base64-encoded-hpack-compressed-data"
    },
    {
      "name": "asset.hai",
      "mimeType": "image/png",
      "data": "base64-encoded-hpack-compressed-data"
    }
  ]
}
```

## Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icons
- **fflate** - Compression

## License

AGPL-3.0

## Contributing

This project is part of the SkizoAI ecosystem. Characters displayed in the marketplace come from the SkizoAI platform.
