# Infinite Minesweeper

Minesweeper with an infinite procedurally-generated world. Explore an unbounded grid, reveal cells, flag mines, and unlock adjacent sectors. No login required — games save locally in your browser.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 16 (App Router) + Tailwind CSS |
| Mobile | Expo (React Native) — in progress |
| Shared game logic | `@repo/minesweeper-core` — pure TypeScript, zero platform deps |
| Storage interface | `@repo/storage` — `IGameStorage` contract, no platform deps |

## Repo structure

```
/
├── apps/
│   ├── web/          # Next.js app (saves to localStorage)
│   └── mobile/       # Expo app (WIP, will save to expo-file-system)
└── packages/
    ├── minesweeper-core/   # Game logic (seed, flood fill, sectors, SaveData type)
    └── storage/            # IGameStorage interface
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

Starts all apps in watch mode via Turborepo. Web app runs at `http://localhost:3000`. Open it — no login needed, start playing immediately.

To run only the web app:

```bash
pnpm --filter @repo/web dev
```

## Other commands

```bash
pnpm build        # production build (all packages)
pnpm typecheck    # type-check all packages
pnpm lint         # lint all packages
pnpm --filter @repo/minesweeper-core test   # run core game logic unit tests
```

## How it works

1. **Infinite world** — the grid has no edges. Each cell's mine status is derived from a seeded PRNG using `(seed, x, y)`, so it's deterministic without storing every cell.
2. **Sectors** — the world is divided into 16×16 sectors. Revealing all non-mine cells in a sector marks it solved and unblocks adjacent sectors.
3. **Local save** — game state (revealed cells, flags, camera position) is serialised to `SaveData` and written to `localStorage` with a 2-second debounce. Immediate save on mine hit or sector solve.
4. **No auth** — games are device-local. Open the URL and play.
