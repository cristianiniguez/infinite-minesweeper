# Infinite Minesweeper — Claude Code Guide

## What this project is

Minesweeper with an infinite procedurally-generated world delivered as a PWA. Players reveal cells, flag mines, and solve sectors on an unbounded grid. No auth — games save locally via `localStorage`. Installable on iOS (Safari) and Android (Chrome) like a native app.

## Project layout

```
/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # PWA icons (192, 512, 512-maskable, apple-touch-icon)
└── src/
    ├── app/                   # Next.js App Router pages
    ├── components/            # React components
    └── lib/
        ├── minesweeper-core/  # Pure TS game logic — NO platform deps
        ├── hooks/             # useGameState, useAutoSave
        ├── LocalStorageGameStorage.ts   # IGameStorage interface + implementation
        └── storageInstance.ts           # singleton storage export
```

Single Next.js app — no monorepo, no Turborepo.

## Key commands

```bash
pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build (PWA service worker generated)
pnpm start        # serve production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest unit tests for game logic
```

Always install packages with `--save-exact`:
```bash
pnpm add --save-exact <package>
pnpm add -D --save-exact <package>
```

## Game logic (`src/lib/minesweeper-core`)

**Rule: zero platform dependencies.** No `window`, `document`, `canvas`, React, or Node APIs.

Key files:
- `seed.ts` — `seededRand`, `isMine`, `countAdj`. Mine status is deterministic from `(seed, x, y)` — never stored per-cell.
- `state.ts` — `GameState` type, `Action` union, `createInitialState`. Caches (`mineCache`, `numberCache`, `mineHits`) are derived at runtime, not persisted.
- `flood.ts` — `floodReveal` pure function; returns new state.
- `sectors.ts` — `SECTOR_SIZE = 16`. `blockSector`, `checkSectorSolved`, `canUnblock`, `tryUnblockNeighbors`. A blocked sector unblocks when all 8 surrounding sectors are solved.
- `serialise.ts` — `serialise`/`deserialise` convert `Set`/`Map` to plain arrays. `SaveData` extends `Serialised` with `id`, `name`, `createdAt`, `updatedAt`. `fromSaveData` rebuilds `GameState` from a `SaveData`.
- `index.ts` — re-exports everything.

All functions are pure (take state, return new state). Add unit tests in `__tests__/` using vitest for any new logic.

## Storage (`src/lib/LocalStorageGameStorage.ts`)

`IGameStorage` interface defined inline (no separate package). `localStorage` key layout:
- `ms:index` — `string[]` list of game ids
- `ms:game:<id>` — `JSON<SaveData>` per game

Singleton exported from `storageInstance.ts`.

## App structure

**No auth.** Open the URL → dashboard → play immediately.

**Game state management:**
- `useGameState` hook — `useReducer` dispatching `Action` through `applyAction` from core. Takes `SaveData | null`.
- `useAutoSave` hook — debounced 2s; immediate on mine hit or sector solve. Calls `storage.saveGame()`.
- `MinesweeperCanvas` — DOM canvas renderer. Mouse/wheel listeners attached via `useEffect` on a canvas ref.

**Component map:**
- `app/page.tsx` — redirects to `/dashboard`.
- `app/dashboard/page.tsx` — client component; loads games from `storage.listGames()`.
- `app/game/[id]/page.tsx` — thin server component passes `id` to `GameLoader`.
- `components/GameLoader.tsx` — client component; loads `SaveData` from storage, renders `GameView`.
- `components/GameView.tsx` — client component hosting `MinesweeperCanvas` + `SaveIndicator`.
- `components/MinesweeperCanvas.tsx` — canvas renderer + input handling.
- `components/NewGameButton.tsx` — generates `id`/`seed`/`name`, calls `storage.saveGame()`, navigates to game.
- `components/GameCard.tsx` — shows game name + last played; links to game, calls `storage.deleteGame()`.

## PWA

- Service worker via `@ducanh2912/next-pwa` — disabled in dev, active in production.
- `public/manifest.json` — PWA manifest with `start_url: /dashboard`, `display: standalone`.
- Icons needed in `public/icons/`: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`.
- iOS: install via Safari → Share → Add to Home Screen. Installed PWA has isolated localStorage from Safari browser storage.

## What's not built yet

- PWA icons (`public/icons/`) — placeholder dir exists, icons need to be generated from source SVG.
- Game rename (inline edit on dashboard).
- Loading skeletons, error boundaries.
- Polish items from Phase 5 in PLAN.md.
