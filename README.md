# Infinite Minesweeper

Minesweeper with an infinite procedurally-generated world, delivered as a PWA. Explore an unbounded grid, reveal cells, flag mines, and unlock adjacent sectors. No login required — games save locally in your browser. Installable on iOS and Android like a native app.

## Stack

| Layer | Tech |
|---|---|
| App | Next.js 16 (App Router) + Tailwind CSS 4 |
| PWA | `@ducanh2912/next-pwa` (service worker + installability) |
| Game logic | `src/lib/minesweeper-core` — pure TypeScript, zero platform deps |
| Storage | `localStorage` via `LocalStorageGameStorage` |

## Project structure

```
/
├── public/
│   ├── manifest.json      # PWA manifest
│   └── icons/             # PWA icons (192, 512, 512-maskable, apple-touch-icon)
└── src/
    ├── app/               # Next.js pages (dashboard, game/[id])
    ├── components/        # React components
    └── lib/
        ├── minesweeper-core/          # Pure game logic
        ├── hooks/                     # useGameState, useAutoSave
        ├── LocalStorageGameStorage.ts
        └── storageInstance.ts
```

## Local setup

### Prerequisites

- Node.js 20+
- pnpm 10+ (`npm i -g pnpm`)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run the dev server

```bash
pnpm dev
```

Web app runs at `http://localhost:3000`. No login needed — start playing immediately.

## Other commands

```bash
pnpm build        # production build (generates PWA service worker)
pnpm start        # serve production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest unit tests for game logic
```

## How it works

1. **Infinite world** — the grid has no edges. Each cell's mine status is derived from a seeded PRNG using `(seed, x, y)`, so it's deterministic without storing every cell.
2. **Sectors** — the world is divided into 16×16 sectors. Revealing all non-mine cells in a sector marks it solved and unblocks adjacent sectors.
3. **Local save** — game state (revealed cells, flags, camera position) is serialised to `SaveData` and written to `localStorage` with a 2-second debounce. Immediate save on mine hit or sector solve.
4. **No auth** — games are device-local. Open the URL and play.
5. **PWA** — service worker disabled in dev mode. Run `pnpm build && pnpm start` to test offline behaviour and installability.
