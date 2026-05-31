# Infinite Minesweeper — Implementation Plan

## Overview

Cross-platform minesweeper with infinite procedural world and sector mechanics.
No backend, no auth — games are saved locally on each device and playable immediately.

**Stack:**
- Monorepo: pnpm workspaces + Turborepo
- Web: Next.js 14 (App Router) — saves in `localStorage`
- Mobile: Expo (React Native) — saves in `expo-file-system` (JSON files)
- Shared logic: plain TypeScript package

---

## Repository Structure

```
/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── apps/
│   ├── web/                        # Next.js app
│   └── mobile/                     # Expo app
└── packages/
    ├── minesweeper-core/           # Pure game logic (no DOM, no React)
    └── storage/                    # Shared serialise/deserialise types (no platform deps)
```

---

## Phase 0 — Monorepo Bootstrap

**Goal:** Working pnpm workspace with Turborepo, all packages linked.

### Steps

1. **Init repo**
   ```bash
   mkdir infinite-minesweeper && cd infinite-minesweeper
   git init
   pnpm init
   pnpm add -D turbo -w
   ```

2. **pnpm-workspace.yaml**
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. **turbo.json**
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "tasks": {
       "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
       "dev":   { "cache": false, "persistent": true },
       "lint":  {},
       "typecheck": { "dependsOn": ["^build"] }
     }
   }
   ```

4. **Root package.json scripts**
   ```json
   {
     "scripts": {
       "dev":       "turbo dev",
       "build":     "turbo build",
       "lint":      "turbo lint",
       "typecheck": "turbo typecheck"
     }
   }
   ```

5. **Create package scaffolds**
   ```bash
   mkdir -p apps/web apps/mobile packages/minesweeper-core packages/storage
   ```

**Done when:** `pnpm install` succeeds with no errors.

---

## Phase 1 — `packages/minesweeper-core`

**Goal:** All game logic in a pure TypeScript package with zero platform deps.

### Package setup

```bash
cd packages/minesweeper-core
pnpm init
# package.json: { "name": "@repo/minesweeper-core", "main": "src/index.ts" }
pnpm add -D typescript vitest
```

### Files to create

```
packages/minesweeper-core/src/
├── seed.ts          # seededRand, isMine, countAdj
├── flood.ts         # floodReveal (pure, returns new state)
├── sectors.ts       # blockSector, checkSectorSolved, canUnblock, tryUnblockNeighbors
├── state.ts         # GameState type + createInitialState
├── serialise.ts     # toSaveData / fromSaveData
└── index.ts         # re-exports everything
```

### Key types (`state.ts`)

```typescript
export type CellKey = string;    // "x,y"
export type SectorKey = string;  // "sx,sy"

export interface GameState {
  id: string;           // uuid generated on creation
  name: string;         // user-editable label e.g. "Game 1"
  seed: number;
  createdAt: number;    // Date.now()
  updatedAt: number;    // Date.now() — updated on every save
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
// Portable flat object — safe to JSON.stringify
export interface SaveData {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  updatedAt: number;
  firstReveal: boolean;
  camX: number;
  camY: number;
  revealed: [number, number][];   // Set → array of [x, y]
  flagged:  [number, number][];
  blocked:  [number, number][];   // Set → array of [sx, sy]
  solved:   [number, number][];
}

export function toSaveData(state: GameState): SaveData { ... }
export function fromSaveData(data: SaveData): GameState { ... }  // caches start empty
```

### Rules

- No `window`, `document`, `canvas`, `React`, or any platform API
- All functions are pure: take state in, return new state out
- Unit tests with `vitest` for mine gen, flood fill, sector blocking/unblocking

**Done when:** `pnpm typecheck` passes, unit tests pass.

---

## Phase 2 — `packages/storage`

**Goal:** Define the storage interface and shared types so both apps implement
the same contract, with zero platform code in this package.

### Package setup

```bash
cd packages/storage
pnpm init
# package.json: { "name": "@repo/storage" }
pnpm add -D typescript
pnpm add @repo/minesweeper-core
```

### Files

```
packages/storage/src/
├── interface.ts     # IGameStorage interface
└── index.ts
```

### `interface.ts`

```typescript
import type { SaveData } from '@repo/minesweeper-core';

export interface IGameStorage {
  /** Return all saved games, sorted by updatedAt desc */
  listGames(): Promise<SaveData[]>;
  /** Load one game by id. Returns null if not found. */
  loadGame(id: string): Promise<SaveData | null>;
  /** Create or overwrite a game save */
  saveGame(data: SaveData): Promise<void>;
  /** Delete a game by id */
  deleteGame(id: string): Promise<void>;
}
```

Each app provides its own concrete implementation of `IGameStorage`.
The game hooks only depend on this interface — swapping storage backends
requires zero changes to game logic or UI.

**Done when:** TypeScript compiles. No tests needed (pure types).

---

## Phase 3 — Next.js Web App

**Goal:** Instant-play web app. No login screen. Open the URL → start playing.
Games saved in `localStorage`.

### Setup

```bash
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir
pnpm add @repo/minesweeper-core @repo/storage
```

### Storage implementation

`localStorage` key layout:
```
ms:index          → string[]         list of game ids (ordered by updatedAt)
ms:game:<id>      → JSON<SaveData>   one entry per game
```

```typescript
// apps/web/src/lib/LocalStorageGameStorage.ts
import type { IGameStorage } from '@repo/storage';
import type { SaveData } from '@repo/minesweeper-core';

export class LocalStorageGameStorage implements IGameStorage {
  private prefix = 'ms:game:';
  private indexKey = 'ms:index';

  async listGames(): Promise<SaveData[]> { ... }
  async loadGame(id: string): Promise<SaveData | null> { ... }
  async saveGame(data: SaveData): Promise<void> { ... }
  async deleteGame(id: string): Promise<void> { ... }
}
```

> `localStorage` is synchronous but the interface is async — keeps it compatible
> with the mobile implementation which is genuinely async.

### File structure

```
apps/web/src/
├── app/
│   ├── layout.tsx              # root layout, fonts
│   ├── page.tsx                # → redirect to /dashboard
│   ├── dashboard/
│   │   └── page.tsx            # game list + "New Game" button
│   └── game/
│       └── [id]/
│           └── page.tsx        # game canvas page
├── components/
│   ├── GameCard.tsx            # name, last played, continue / delete
│   ├── MinesweeperCanvas.tsx   # canvas renderer (web-specific)
│   └── SaveIndicator.tsx       # "Saved" / "Saving…"
└── lib/
    ├── LocalStorageGameStorage.ts
    ├── storageInstance.ts      # singleton: new LocalStorageGameStorage()
    └── hooks/
        ├── useGames.ts         # listGames, createGame, deleteGame
        ├── useGameState.ts     # loadGame → deserialise → GameState in useReducer
        └── useAutoSave.ts      # debounced serialise + saveGame
```

### Dashboard page (`/dashboard`)

- On mount: `storage.listGames()` → render a `<GameCard>` for each
- "New Game" button: generate a random seed + uuid, call `storage.saveGame()` with
  a fresh `SaveData`, then `router.push('/game/<id>')`
- `<GameCard>` shows: game name (editable), last-played timestamp, "Continue" link,
  delete button (with confirm)
- First visit: `localStorage` is empty → show empty state with a prompt to start a game

### Game page (`/game/[id]`)

1. `useGameState(id)`: calls `storage.loadGame(id)`, runs `fromSaveData()`,
   puts result into `useReducer`
2. `<MinesweeperCanvas>`: receives dispatch + state, renders the canvas
   (port widget code into a React component with `useRef` on the `<canvas>`)
3. `useAutoSave`: debounce 2 s on any state change; immediate save on mine hit
   or sector solve/unblock — calls `toSaveData()` then `storage.saveGame()`
4. `<SaveIndicator>`: "Saved ✓" / "Saving…"

### Canvas renderer notes

- `useEffect` to attach `mousedown`, `mousemove`, `mouseup`, `contextmenu`, `wheel`
- Dispatch actions: `REVEAL | FLAG | PAN | SET_CAM`
- Reducer calls `minesweeper-core` functions, returns new state (new object ref
  so React detects the change and triggers auto-save)

**Done when:** User opens `/`, lands on dashboard, creates a game, plays it,
refreshes the page, and resumes exactly where they left off.

---

## Phase 4 — Expo Mobile App

**Goal:** iOS/Android app. Open it → start playing immediately.
Games saved as JSON files via `expo-file-system`.

### Setup

```bash
cd apps/mobile
pnpm create expo-app@latest . --template blank-typescript
pnpm add expo-file-system expo-router
pnpm add @shopify/react-native-skia
pnpm add @repo/minesweeper-core @repo/storage
```

### Storage implementation

Each game is a separate JSON file inside the app's private documents directory:

```
<DocumentDirectory>/minesweeper/
  index.json          → string[]       ordered list of game ids
  <id>.json           → SaveData       one file per game
```

```typescript
// apps/mobile/lib/FileSystemGameStorage.ts
import * as FileSystem from 'expo-file-system';
import type { IGameStorage } from '@repo/storage';
import type { SaveData } from '@repo/minesweeper-core';

const BASE = FileSystem.documentDirectory + 'minesweeper/';

export class FileSystemGameStorage implements IGameStorage {
  async listGames(): Promise<SaveData[]> { ... }
  async loadGame(id: string): Promise<SaveData | null> { ... }
  async saveGame(data: SaveData): Promise<void> { ... }
  async deleteGame(id: string): Promise<void> { ... }
}
```

### File structure

```
apps/mobile/
├── app/
│   ├── _layout.tsx             # Expo Router root layout
│   ├── index.tsx               # → redirect to /dashboard
│   ├── dashboard.tsx           # game list + "New Game" button
│   └── game/
│       └── [id].tsx            # game canvas page
├── components/
│   ├── GameCard.tsx
│   ├── MinesweeperSkia.tsx     # Skia canvas renderer
│   └── SaveIndicator.tsx
└── lib/
    ├── FileSystemGameStorage.ts
    ├── storageInstance.ts      # singleton: new FileSystemGameStorage()
    └── hooks/                  # same useGames, useGameState, useAutoSave as web
                                # — only the import of storageInstance differs
```

### Key differences from web

**No auth, no network** — the app is fully offline from the first launch.
On cold start, `index.json` either doesn't exist (first run → show empty dashboard)
or lists existing games.

**Canvas renderer** — use `@shopify/react-native-skia` instead of the DOM canvas:
- Same draw logic; replace `ctx.fillRect(x,y,w,h)` with Skia `<Rect x y width height>`
- Touch events replace mouse: `onTouch` (pan/tap), long-press for flag
- `useGestureHandler` from `react-native-gesture-handler` for pinch-to-zoom (optional)
- Game logic calls are identical — same `minesweeper-core` functions

**Auto-save** — same `useAutoSave` hook, same debounce logic. `FileSystem.writeAsStringAsync`
is async and fast enough for JSON payloads of typical game states.

**Done when:** App launches immediately to the dashboard, games persist across
app restarts, canvas is playable on touch.

---

## Phase 5 — Polish & Production

### Web

- [ ] Loading skeleton for game list and canvas
- [ ] Error boundary around `<MinesweeperCanvas>`
- [ ] Inline game rename on dashboard (click name to edit)
- [ ] Responsive layout (tablet / narrow mobile browser)
- [ ] `next/font` for Orbitron + Share Tech Mono
- [ ] `localStorage` quota guard: warn if approaching ~5 MB limit
  (unlikely for normal play — each cell is ~10 bytes, millions of cells needed)
- [ ] Deploy to Vercel (static export or edge runtime — no server needed)

### Mobile

- [ ] Splash screen + app icon (`expo-splash-screen`)
- [ ] Haptic feedback on mine hit (`expo-haptics`)
- [ ] Pinch-to-zoom on the canvas
- [ ] Build with EAS: `pnpm dlx eas-cli build --platform all`

### Both

- [ ] Max 50 saved games per device (soft limit — show warning, not hard block)
- [ ] "Export game" — copy the raw `SaveData` JSON to clipboard so a user can
  manually transfer a save between devices if they want

---

## Build Order Summary

```
Phase 0  →  Monorepo + pnpm workspaces + Turborepo
Phase 1  →  minesweeper-core package (pure logic + serialisation)
Phase 2  →  storage package (IGameStorage interface)
Phase 3  →  Next.js web app (localStorage, instant play)
Phase 4  →  Expo mobile app (expo-file-system, instant play)
Phase 5  →  Polish + deploy
```

Phases 1–2 are pure TypeScript with no UI. Build and unit-test them fully
before touching either app. The only thing that differs between web and mobile
is the storage implementation (100 lines) and the canvas renderer — all game
logic, hooks, and types are shared.