# RtoH Marketplace - Quick Start Guide

## Overview

RtoH has been transformed from a simple converter into a full-featured character marketplace with converter functionality. Users can now:

1. **Browse & Install** characters from SkizoAI's marketplace
2. **Convert** RisuAI characters to SkizoAI format

## What Changed

### New Structure
```
/                → Marketplace (main page)
/converter       → Character Converter
```

### New Features
- Character marketplace with search & filters
- Featured characters showcase
- Dual installation: Download .skizo or Direct Import
- Character ratings and download stats
- Category and tag filtering
- Responsive grid layout

### File Changes
- `haluWriter.ts` → `skizoWriter.ts` (renamed)
- New `pages/` directory with Marketplace and Converter
- New `components/marketplace/` with reusable components
- New `services/` for API and installer logic

## Setup Instructions

### 1. Frontend (RtoH)

```bash
cd RtoH

# Install dependencies (already done)
npm install

# Configure environment
cp .env.example .env
# Edit .env with your backend URL

# Development
npm run dev

# Production build
npm run build
```

### 2. Backend API

You need to implement the marketplace API endpoints in your SkizoAI backend:

#### Required Endpoints:
- `GET /api/marketplace/characters` - List characters
- `GET /api/marketplace/characters/:id` - Get character details
- `GET /api/marketplace/categories` - Get categories/tags
- `POST /api/marketplace/characters/:id/download` - Track downloads

#### Implementation Options:

**Option A: Use Existing Characters**
Populate marketplace from your existing public characters table.

**Option B: Separate Marketplace Table**
Create a dedicated `marketplace_characters` table (see `schema.prisma` example).

See `marketplace-api-example/BACKEND_GUIDE.md` for detailed implementation.

### 3. Database Setup

Add the marketplace schema to your Prisma schema:

```bash
# Copy the schema
cat marketplace-api-example/schema.prisma >> BE/prisma/schema.prisma

# Run migration
cd BE
npx prisma migrate dev --name add_marketplace
```

### 4. Populate Marketplace

Create a script to populate the marketplace from existing characters:

```bash
cd BE
npm run populate-marketplace
```

Or manually add characters through an admin panel.

## Environment Variables

### RtoH (.env)
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SKIZOAI_URL=http://localhost:5173
```

### Backend
Add CORS for RtoH:
```typescript
app.use(cors({
  origin: ['http://localhost:5174', 'https://rtoh.yourdomain.com'],
}));
```

## Testing

### 1. Test Backend API

```bash
# Get characters
curl http://localhost:3000/api/marketplace/characters

# Search
curl "http://localhost:3000/api/marketplace/characters?search=anime"

# Get categories
curl http://localhost:3000/api/marketplace/categories
```

### 2. Test Frontend

```bash
cd RtoH
npm run dev
```

Visit `http://localhost:5174`:
- Should see marketplace page
- Click "Converter" to access converter
- Search and filter should work
- Character cards should display

### 3. Test Installation

**Download Method:**
1. Click "Download" on any character
2. Should download a `.skizo` file
3. Import to SkizoAI manually

**Direct Import Method:**
1. Open SkizoAI in another tab
2. Click "Import" on any character
3. Should send character to SkizoAI via postMessage

## Integration with SkizoAI

### Receiving Imports

Add this to SkizoAI frontend to receive character imports:

```typescript
// In SkizoAI main app
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Verify origin
    if (event.origin !== 'http://localhost:5174') return;
    
    if (event.data.type === 'rtoh-import') {
      const characterData = event.data.payload;
      
      // Import character
      importCharacterFromRtoH(characterData);
      
      // Show success message
      toast.success(`${characterData.name} imported successfully!`);
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

## Deployment

### Frontend (RtoH)

```bash
cd RtoH
npm run build

# Deploy dist/ folder to:
# - Vercel
# - Netlify
# - Your own server
```

### Backend

Deploy your SkizoAI backend with the new marketplace endpoints.

Update RtoH environment variables with production URLs.

## Troubleshooting

### Characters not loading
- Check backend API is running
- Verify CORS is configured
- Check browser console for errors
- Verify API URL in `.env`

### Direct import not working
- Ensure SkizoAI is open in another tab
- Check postMessage listener is set up
- Verify origin URLs match
- Falls back to download if SkizoAI not detected

### Build errors
- Run `npm install` to ensure all dependencies
- Check TypeScript errors: `npm run build`
- Verify all imports are correct

## Next Steps

1. **Populate marketplace** with your best characters
2. **Add featured characters** to showcase quality content
3. **Implement ratings** (optional) for user feedback
4. **Add character submission** (optional) for community contributions
5. **Analytics** to track popular characters

## Support

For issues or questions:
- Check the main README.md
- Review BACKEND_GUIDE.md for API details
- Check browser console for errors
- Verify all environment variables are set

## Architecture Summary

```
┌─────────────┐
│   RtoH      │
│ (Frontend)  │
│             │
│ - Marketplace
│ - Converter │
└──────┬──────┘
       │
       │ HTTP API
       │
┌──────▼──────┐
│  SkizoAI    │
│  Backend    │
│             │
│ - /api/marketplace/*
│ - Character DB
└──────┬──────┘
       │
       │ postMessage
       │
┌──────▼──────┐
│  SkizoAI    │
│ (Frontend)  │
│             │
│ - Import Handler
│ - Character Display
└─────────────┘
```

## License

AGPL-3.0 - Same as SkizoAI
