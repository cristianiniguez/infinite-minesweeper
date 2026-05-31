# Infinite Minesweeper — Implementation Plan

## Overview

Cross-platform minesweeper with infinite procedural world and sector mechanics.
Delivered as a Progressive Web App (PWA) built with Next.js — one codebase that
works on desktop browsers and is installable on iOS and Android like a native app.
No backend, no auth, no App Store — open the URL and start playing immediately.
Games are saved in `localStorage`.

**Stack:**
- Next.js 14 (App Router) + TypeScript + Tailwind
- `@ducanh2912/next-pwa` for service worker + installability
- All game logic lives in `src/lib/minesweeper-core` (plain TS, no platform deps)

---

## Project Structure

```
/
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── icon-512-maskable.png
│       └── apple-touch-icon.png
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # → redirect to /dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── game/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── GameCard.tsx
│   │   ├── MinesweeperCanvas.tsx
│   │   └── SaveIndicator.tsx
│   └── lib/
│       ├── minesweeper-core/        # pure game logic — no DOM, no React
│       │   ├── seed.ts
│       │   ├── flood.ts
│       │   ├── sectors.ts
│       │   ├── state.ts
│       │   ├── serialise.ts
│       │   └── index.ts
│       ├── storage.ts               # localStorage helpers
│       └── hooks/
│           ├── useGames.ts
│           ├── useGameState.ts
│           └── useAutoSave.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Phase 0 — Project Bootstrap

**Goal:** Running Next.js project with all dependencies installed.

### Steps

1. **Scaffold**
   ```bash
   pnpm create next-app@latest infinite-minesweeper \
     --typescript --tailwind --eslint --app --src-dir
   cd infinite-minesweeper
   ```

2. **Install extra dependencies**
   ```bash
   pnpm add @ducanh2912/next-pwa
   pnpm add -D webpack vitest
   ```

3. **Create folder structure**
   ```bash
   mkdir -p src/lib/minesweeper-core src/lib/hooks src/components
   mkdir -p public/icons
   ```

**Done when:** `pnpm dev` starts without errors, `localhost:3000` loads.

---

## Phase 1 — `src/lib/minesweeper-core`

**Goal:** All game logic in plain TypeScript with zero platform or React deps.

### Key types (`state.ts`)

```typescript
export type CellKey = string;    // "x,y"
export type SectorKey = string;  // "sx,sy"

export interface GameState {
  id: string;           // uuid generated on creation
  name: string;         // user-editable label e.g. "Game 1"
  seed: number;
  createdAt: number;    // Date.now()
  updatedAt: number;    // updated on every save
  firstReveal: boolean;
  camX: number;
  camY: number;
  revealed: Set<CellKey>;
  flagged: Set<CellKey>;
  blocked: Set<SectorKey>;
  solved: Set<SectorKey>;
  // caches — never persisted, re-derived from seed on load
  mineCache: Map<CellKey, boolean>;
  numberCache: Map<CellKey, number>;
}
```

### Serialisation (`serialise.ts`)

```typescript
export interface SaveData {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  updatedAt: number;
  firstReveal: boolean;
  camX: number;
  camY: number;
  revealed: [number, number][];
  flagged:  [number, number][];
  blocked:  [number, number][];
  solved:   [number, number][];
}

export function toSaveData(state: GameState): SaveData { ... }
export function fromSaveData(data: SaveData): GameState { ... }
```

### Files

| File | Responsibility |
|---|---|
| `seed.ts` | `seededRand`, `isMine`, `countAdj` |
| `flood.ts` | `floodReveal` — pure, returns new state |
| `sectors.ts` | `blockSector`, `checkSectorSolved`, `canUnblock`, `tryUnblockNeighbors` |
| `state.ts` | `GameState` type, `createInitialState` |
| `serialise.ts` | `toSaveData`, `fromSaveData` |
| `index.ts` | re-exports everything |

### Rules

- No `window`, `document`, `canvas`, `React`, or any platform API
- All functions are pure: take state in, return new state out
- Unit tests with `vitest`

**Done when:** `pnpm typecheck` passes, unit tests pass for mine gen, flood fill,
and sector blocking/unblocking.

---

## Phase 2 — localStorage + Hooks

**Goal:** Game saves wired up, hooks ready for UI to consume.

### `src/lib/storage.ts`

```typescript
import type { SaveData } from './minesweeper-core';

const PREFIX = 'ms:game:';
const INDEX  = 'ms:index';

export function listGames(): SaveData[] { ... }
export function loadGame(id: string): SaveData | null { ... }
export function saveGame(data: SaveData): void { ... }
export function deleteGame(id: string): void { ... }
```

localStorage key layout:
```
ms:index          → JSON string[]   ordered list of game ids (newest first)
ms:game:<id>      → JSON SaveData   one entry per game
```

### Hooks

**`useGames.ts`** — dashboard data:
```typescript
// returns { games, createGame, deleteGame, renameGame }
// createGame() generates a uuid + random seed, calls saveGame(), returns the new id
```

**`useGameState.ts`** — single game:
```typescript
// loads SaveData from localStorage → fromSaveData() → useReducer(gameReducer)
// exposes { state, dispatch }
// gameReducer handles: REVEAL | FLAG | PAN — calls minesweeper-core functions
```

**`useAutoSave.ts`** — persistence:
```typescript
// watches state, debounces 2s, calls toSaveData() + saveGame()
// saves immediately (no debounce) on mine hit or sector solve/unblock
// exposes saveStatus: 'saved' | 'saving' | 'unsaved'
```

**Done when:** `createGame` → `loadGame` → `saveGame` round-trip works in a
unit test or quick browser console check.

---

## Phase 3 — UI

**Goal:** Playable game with dashboard, fully wired to hooks and storage.

### Dashboard (`/dashboard`)

- `useGames()` → render `<GameCard>` per save
- Empty state on first visit: "No games yet — start one!"
- "New Game" button: `createGame()` → `router.push('/game/<id>')`
- `<GameCard>`: inline-editable name, last-played timestamp, "Continue" link,
  delete button with confirmation

### Game page (`/game/[id]`)

- `useGameState(id)` loads and manages state
- `useAutoSave(state)` handles persistence, returns `saveStatus`
- `<MinesweeperCanvas state={state} dispatch={dispatch} />` renders the game
- `<SaveIndicator status={saveStatus} />` shows "Saved ✓" / "Saving…"
- Back button → `/dashboard`

### `<MinesweeperCanvas>`

- `useRef` on a `<canvas>` element
- `useEffect` attaches events:
  - **Desktop:** `mousedown/move/up` for pan, `click` to reveal,
    `contextmenu` to flag, `wheel` to scroll
  - **Mobile:** `touchstart/move/end` for pan, tap to reveal,
    long-press (300 ms hold) to flag
- `touch-action: none` on the canvas via CSS to suppress browser scroll/zoom
- On resize: recalculate canvas dimensions and redraw
- Draw loop: called after every state change via `useEffect`

**Done when:** Full game is playable in the browser, saves persist on refresh,
dashboard lists all games correctly.

---

## Phase 4 — PWA Layer

**Goal:** App is installable on iOS and Android, works fully offline after
first load.

### `next.config.ts`

```typescript
import withPWA from '@ducanh2912/next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === 'development',
})({
  // existing Next.js config
});

export default nextConfig;
```

> Always disable the service worker in development — it breaks hot reload.

### `public/manifest.json`

```json
{
  "name": "Infinite Minesweeper",
  "short_name": "Minesweeper",
  "description": "An infinite procedural minesweeper with sector mechanics.",
  "start_url": "/dashboard",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#060d1a",
  "theme_color": "#060d1a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512",
      "type": "image/png", "purpose": "maskable" }
  ]
}
```

### `src/app/layout.tsx` — metadata + meta tags

```tsx
export const metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Minesweeper',
  },
};

// Inside <head>:
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#060d1a" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

### Icons to prepare

| File | Size | Purpose |
|---|---|---|
| `icon-192.png` | 192×192 | Android / Chrome standard |
| `icon-512.png` | 512×512 | Android high-res / splash |
| `icon-512-maskable.png` | 512×512 | Android adaptive (keep content in inner 80%) |
| `apple-touch-icon.png` | 180×180 | iOS "Add to Home Screen" |

Generate all from one source SVG:
```bash
pnpm dlx pwa-asset-generator icon-source.svg public/icons \
  --manifest public/manifest.json --index src/app/layout.tsx
```

### iOS-specific notes

- iOS only supports PWA install via Safari ("Share → Add to Home Screen").
  Other iOS browsers cannot install PWAs.
- The installed PWA has isolated `localStorage` — separate from Safari's browser
  storage. A save made in Safari won't appear in the installed app. Surface this
  to users with a one-time notice.
- `viewport-fit=cover` + `env(safe-area-inset-*)` CSS padding prevents UI from
  hiding behind the notch or home indicator.

### Testing the PWA

```bash
# Must build first — service worker is disabled in dev mode
pnpm build && pnpm start
# Chrome DevTools → Application → Service Workers → check "Update on reload"
# Run Lighthouse → PWA audit to verify installability score
```

**Done when:** Lighthouse PWA audit passes, app installs on a real Android device
(Chrome) and iOS device (Safari), saved games persist after closing and reopening
the installed app.

---

## Phase 5 — Polish & Deploy

### Mobile UX

- [ ] Safe area insets: `env(safe-area-inset-*)` so nothing hides behind notch
  or home indicator
- [ ] Landscape + portrait both usable (canvas resizes to viewport on orientation
  change)
- [ ] Prevent double-tap zoom on the canvas (`touch-action: manipulation`)

### General UX

- [ ] Loading skeleton for dashboard and game page
- [ ] Error boundary around `<MinesweeperCanvas>`
- [ ] `localStorage` quota guard: warn if nearing ~5 MB limit
- [ ] "Export save" — copies raw `SaveData` JSON to clipboard for manual backup
- [ ] `next/font` for Orbitron + Share Tech Mono (self-hosted, works offline)

### Deploy

HTTPS is required for service workers and the PWA install prompt.
Vercel provides this out of the box with zero config:

```bash
pnpm dlx vercel deploy
```

**Done when:** Live URL passes Lighthouse PWA audit and installs cleanly on
real devices.

---

## Build Order Summary

```
Phase 0  →  Bootstrap Next.js project
Phase 1  →  minesweeper-core (pure game logic, no platform deps)
Phase 2  →  localStorage helpers + hooks
Phase 3  →  UI: dashboard + game page + canvas renderer
Phase 4  →  PWA: manifest + service worker + icons
Phase 5  →  Polish + deploy to Vercel
```

Phases 1–2 have no UI and can be fully built and tested before writing any
components. Phase 4 is purely additive — it wraps the existing app with PWA
capabilities without touching any game logic or UI.