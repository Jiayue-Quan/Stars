# STARS

Editorial-style film review frontend built with React, TypeScript, and Vite.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Use the local env file:

[.env.local](/abs/path/c:/Users/newna/OneDrive/Documents/Desktop/app/.env.local)

3. Paste your TMDB key in `.env.local`:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
# or
VITE_TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token_here
```

4. Start or restart the app:

```bash
npm run dev
```

## TMDB

- Put your API key in `.env.local` at `VITE_TMDB_API_KEY`.
- If you prefer the bearer token, use `VITE_TMDB_READ_ACCESS_TOKEN`.
- TMDB requests should go through `src/lib/tmdb.ts`.
- Environment settings live in `src/lib/env.ts`.

## Production

- Default router mode is `hash`, which is safer on static hosts without SPA rewrites.
- If your host supports rewrites, set `VITE_ROUTER_MODE=browser`.
- If deploying under a subpath, set `VITE_BASE_PATH` to that path, for example `/stars/`.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
```
