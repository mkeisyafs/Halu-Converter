# Halu Converter

A modern, **100% client-side** converter that turns RisuAI character cards into a portable `.zip` archive.

No backend. No upload. No tracking. Everything runs in your browser.

## Supported Inputs

- `.charx` — RisuAI character archive
- `.png` / `.jpg` — character cards with embedded data
- `.json` — raw character JSON

## Output

A standard `.zip` containing:

- `card.json` — full character data
- `card.png` — character avatar (when present)
- `assets/…` — additional assets (when present)

Preserves lorebooks, regex scripts, trigger scripts, alternate greetings, background embeddings, CBS variables, and more.

## Develop

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle
```

## Deploy to Vercel

This is a static Vite app — Vercel's defaults work out of the box.

1. Push to GitHub.
2. Import the repo on [vercel.com/new](https://vercel.com/new).
3. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.

A `vercel.json` is included so SPA routing and asset caching are correct.

## License

AGPL-3.0
