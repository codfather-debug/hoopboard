# HoopBoard 🏀

A minimal, data-focused NBA & NCAA Men's Basketball scores app built with Next.js.

## Features
- Live scores with real-time status
- Final game results
- Upcoming games with tipoff times
- Broadcast network / where to watch
- Player stats & box scores (in-game and final)
- Stat leaders per game
- Vegas odds (when available)
- Free — powered by ESPN's public API (no key required)

## Tech Stack
- **Next.js 14** (Pages Router + SSR)
- **Tailwind CSS**
- **ESPN Public API** (free, no auth)

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Open http://localhost:3000
```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the repo → Deploy

That's it! Vercel auto-detects Next.js.

## Data Refresh
- Scoreboard refreshes on every page load (SSR)
- For true real-time updates, consider adding `setInterval` client-side polling or Vercel's Edge Runtime

## Customization
- Colors: `styles/globals.css` CSS variables
- Fonts: IBM Plex Mono + IBM Plex Sans (Google Fonts)
- Add more leagues by extending `lib/espn.js`
