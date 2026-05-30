# Infinite Minesweeper — Claude Code Guide

## What this project is

Full-stack minesweeper with an infinite procedurally-generated world. Players reveal cells, flag mines, and solve sectors on an unbounded grid. Game state syncs to Supabase so sessions resume on any device.

## Monorepo layout

```
/
├── apps/web/                  # Next.js 16 App Router, Tailwind CSS 4
├── apps/mobile/               # Expo (React Native) — WIP
└── packages/
    ├── minesweeper-core/      # Pure TS game logic — NO platform deps
    └── supabase/              # Typed Supabase client + DB query helpers
```

- **pnpm workspaces** + **Turborepo** orchestrate all tasks.
- Internal packages are referenced as `@repo/minesweeper-core` and `@repo/supabase`.

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
- `serialise.ts` — `serialise`/`deserialise` convert `Set`/`Map` to plain arrays for Supabase storage.
- `index.ts` — re-exports everything.

All functions are pure (take state, return new state). Add unit tests in `src/__tests__/` using vitest for any new logic.

## Supabase package (`packages/supabase`)

- `client.ts` — `createClient(url, anonKey)` returns typed client.
- `queries.ts` — `listGames`, `getGameWithState`, `createGame`, `upsertGameState`, `deleteGame`.
- `types.ts` — generated DB types (run `pnpm dlx supabase gen types typescript ...` to regenerate after schema changes).

## Web app (`apps/web`)

**Auth flow:** email/password + Google OAuth via `@supabase/ssr`. `middleware.ts` protects `/dashboard` and `/game` routes.

**Game state management:**
- `useGameState` hook — `useReducer` dispatching `Action` through `applyAction` from core.
- `useAutoSave` hook — debounced 2s; immediate on mine hit or sector solve. Calls `upsertGameState`.
- `MinesweeperCanvas` — DOM canvas renderer. Mouse/wheel listeners attached via `useEffect` on a canvas ref.

**Component map:**
- `app/page.tsx` — redirects to `/dashboard` (authed) or `/login`.
- `app/dashboard/page.tsx` — game list, new game button.
- `app/game/[id]/page.tsx` — server component fetches state, passes to `GameView`.
- `components/GameView.tsx` — client component hosting `MinesweeperCanvas` + `SaveIndicator`.
- `components/MinesweeperCanvas.tsx` — canvas renderer + input handling.

**Supabase clients:**
- `lib/supabase-client.ts` — browser client (uses `@supabase/ssr` `createBrowserClient`).
- `lib/supabase-server.ts` — server client (uses `createServerClient` with cookie store).

## Data model

```
games         — id, user_id, seed, name, status, created_at, updated_at
game_states   — game_id (unique FK), cam_x, cam_y, flag_count,
                revealed_cells (jsonb), flagged_cells (jsonb),
                blocked_sectors (jsonb), solved_sectors (jsonb), saved_at
```

RLS: users see/modify only their own rows. `game_states` access is gated through `games.user_id`.

`mineHits` is session-only — not persisted to DB.

## Environment variables

Web app reads from `apps/web/.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## What's not built yet

- Mobile app (`apps/mobile`) — scaffolded, not implemented.
- Cross-device conflict resolution (Phase 6 in PLAN.md).
- Game rename, loading skeletons, error boundaries (Phase 7).
