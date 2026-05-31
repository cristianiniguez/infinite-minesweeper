# Infinite Minesweeper — Claude Code Guide

## What this project is

Minesweeper with an infinite procedurally-generated world. Players reveal cells, flag mines, and solve sectors on an unbounded grid. No auth — games save locally on each device via `localStorage` (web) or `expo-file-system` (mobile, WIP).

## Monorepo layout

```
/
├── apps/web/                  # Next.js 16 App Router, Tailwind CSS 4
├── apps/mobile/               # Expo (React Native) — WIP
└── packages/
    ├── minesweeper-core/      # Pure TS game logic — NO platform deps
    └── storage/               # IGameStorage interface — NO platform deps
```

- **pnpm workspaces** + **Turborepo** orchestrate all tasks.
- Internal packages are referenced as `@repo/minesweeper-core` and `@repo/storage`.

## Key commands

```bash
pnpm dev                                      # start all apps in watch mode
pnpm --filter @repo/web dev                   # web only (localhost:3000)
pnpm build                                    # production build, all packages
pnpm typecheck                                # tsc across all packages
pnpm lint                                     # eslint across all packages
pnpm --filter @repo/minesweeper-core test     # vitest unit tests for game logic
```

Always install packages with `--save-exact`:
```bash
pnpm add --save-exact <package>
pnpm add -D --save-exact <package>
```

## Game logic (`packages/minesweeper-core`)

**Rule: zero platform dependencies.** No `window`, `document`, `canvas`, React, or Node APIs.

Key files:
- `seed.ts` — `seededRand`, `isMine`, `countAdj`. Mine status is deterministic from `(seed, x, y)` — never stored per-cell.
- `state.ts` — `GameState` type, `Action` union, `createInitialState`. Caches (`mineCache`, `numberCache`, `mineHits`) are derived at runtime, not persisted.
- `flood.ts` — `floodReveal` pure function; returns new state.
- `sectors.ts` — `SECTOR_SIZE = 16`. `blockSector`, `checkSectorSolved`, `canUnblock`, `tryUnblockNeighbors`. A blocked sector unblocks when all 8 surrounding sectors are solved.
- `serialise.ts` — `serialise`/`deserialise` convert `Set`/`Map` to plain arrays. `SaveData` extends `Serialised` with `id`, `name`, `createdAt`, `updatedAt`. `fromSaveData` rebuilds `GameState` from a `SaveData`.
- `index.ts` — re-exports everything.

All functions are pure (take state, return new state). Add unit tests in `src/__tests__/` using vitest for any new logic.

## Storage package (`packages/storage`)

Defines the storage contract. Zero platform deps — both apps implement this interface with their own backends.

- `interface.ts` — `IGameStorage` with `listGames`, `loadGame`, `saveGame`, `deleteGame`. All methods return `Promise<SaveData | ...>`.

## Web app (`apps/web`)

**No auth.** Open the URL → dashboard → play immediately.

**Storage:** `localStorage` with key layout:
- `ms:index` — `string[]` list of game ids
- `ms:game:<id>` — `JSON<SaveData>` per game

**Game state management:**
- `lib/LocalStorageGameStorage.ts` — implements `IGameStorage`.
- `lib/storageInstance.ts` — singleton `storage` instance used across the app.
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

## What's not built yet

- Mobile app (`apps/mobile`) — scaffolded, not implemented. Will use `expo-file-system` + `FileSystemGameStorage`.
- Game rename (inline edit on dashboard).
- Loading skeletons, error boundaries.
- Polish items from Phase 5 in PLAN.md.
