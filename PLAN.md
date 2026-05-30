# Infinite Minesweeper — Implementation Plan

## Overview

Full-stack cross-platform minesweeper with infinite procedural world, sector mechanics,
user auth, and cloud save/load. Users can seamlessly switch between web and mobile.

**Stack:**
- Monorepo: pnpm workspaces + Turborepo
- Backend/Auth/DB: Supabase (Postgres + Auth + Realtime)
- Web: Next.js 14 (App Router)
- Mobile: Expo (React Native)
- Shared logic: plain TypeScript package

---

## Repository Structure

```
/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .env.example
├── apps/
│   ├── web/                        # Next.js app
│   └── mobile/                     # Expo app
└── packages/
    ├── minesweeper-core/           # Pure game logic (no DOM, no React)
    ├── supabase/                   # Shared Supabase client + DB types
    └── ui/                         # Shared React components (optional, later)
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
   mkdir -p apps/web apps/mobile packages/minesweeper-core packages/supabase
   ```

6. **Add .env.example** at repo root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=
   ```

**Done when:** `pnpm install` succeeds with no errors.

---

## Phase 1 — Supabase Project Setup

**Goal:** Database schema, RLS policies, and auth providers configured.

### Steps

1. **Create Supabase project** at supabase.com. Note the project URL and anon key.

2. **Enable auth providers** in Supabase Dashboard → Authentication → Providers:
   - Email / Password: enable
   - Google: enable, paste OAuth client ID + secret from Google Cloud Console
     (create credentials at console.cloud.google.com → APIs & Services → Credentials)

3. **Run migrations** in Supabase SQL Editor:

   ```sql
   -- Games table
   create table games (
     id           uuid primary key default gen_random_uuid(),
     user_id      uuid not null references auth.users(id) on delete cascade,
     seed         bigint not null,
     name         text not null default 'New Game',
     status       text not null default 'active' check (status in ('active', 'abandoned')),
     created_at   timestamptz not null default now(),
     updated_at   timestamptz not null default now()
   );

   -- Game state table (one row per game, upserted on save)
   create table game_states (
     id               uuid primary key default gen_random_uuid(),
     game_id          uuid not null references games(id) on delete cascade unique,
     cam_x            float not null default 0,
     cam_y            float not null default 0,
     flag_count       int not null default 0,
     revealed_cells   jsonb not null default '[]',  -- [[x,y], ...]
     flagged_cells    jsonb not null default '[]',  -- [[x,y], ...]
     blocked_sectors  jsonb not null default '[]',  -- [[sx,sy], ...]
     solved_sectors   jsonb not null default '[]',  -- [[sx,sy], ...]
     saved_at         timestamptz not null default now()
   );

   -- Auto-update updated_at on games
   create or replace function update_updated_at()
   returns trigger as $$
   begin new.updated_at = now(); return new; end;
   $$ language plpgsql;

   create trigger games_updated_at
     before update on games
     for each row execute function update_updated_at();

   -- RLS: users can only see/edit their own games
   alter table games       enable row level security;
   alter table game_states enable row level security;

   create policy "owner access" on games
     for all using (auth.uid() = user_id);

   create policy "owner access via game" on game_states
     for all using (
       exists (
         select 1 from games where games.id = game_states.game_id
           and games.user_id = auth.uid()
       )
     );
   ```

4. **Generate TypeScript types** (run locally after schema is set):
   ```bash
   pnpm dlx supabase gen types typescript \
     --project-id YOUR_PROJECT_ID > packages/supabase/src/types.ts
   ```

**Done when:** Tables exist, RLS is on, types file generated.

---

## Phase 2 — `packages/minesweeper-core`

**Goal:** All game logic extracted to a pure TypeScript package with zero platform deps.

### Package setup

```bash
cd packages/minesweeper-core
pnpm init
# package.json: { "name": "@repo/minesweeper-core", "main": "src/index.ts" }
pnpm add -D typescript
```

### Files to create

```
packages/minesweeper-core/src/
├── seed.ts          # seededRand, isMine, countAdj
├── flood.ts         # floodReveal (pure, returns new state)
├── sectors.ts       # blockSector, checkSectorSolved, canUnblock, tryUnblockNeighbors
├── state.ts         # GameState type + createInitialState + applyAction
├── serialise.ts     # toJSON / fromJSON (for Supabase storage)
└── index.ts         # re-exports everything
```

### Key types (`state.ts`)

```typescript
export type CellKey = string;      // "x,y"
export type SectorKey = string;    // "sx,sy"

export interface GameState {
  seed: number;
  firstReveal: boolean;
  camX: number;
  camY: number;
  revealed: Set<CellKey>;
  flagged: Set<CellKey>;
  blocked: Set<SectorKey>;
  solved: Set<SectorKey>;
  // caches (not persisted — re-derived from seed)
  mineCache: Map<CellKey, boolean>;
  numberCache: Map<CellKey, number>;
}
```

### Serialisation (`serialise.ts`)

```typescript
// Convert Sets to arrays for JSON storage, strip caches
export function serialise(state: GameState): Serialised { ... }

// Rebuild Sets from arrays, caches start empty (lazy-filled)
export function deserialise(data: Serialised): GameState { ... }
```

### Rules

- No `window`, `document`, `canvas`, `React`, or any platform API
- All functions are pure: take state, return new state (or mutations on a passed object — keep it consistent)
- Full unit test coverage with `vitest` (add `pnpm add -D vitest`)

**Done when:** `pnpm typecheck` passes, basic unit tests pass for mine gen + flood fill + sector blocking/unblocking.

---

## Phase 3 — `packages/supabase`

**Goal:** Shared Supabase client factory usable in both Next.js and Expo.

### Package setup

```bash
cd packages/supabase
pnpm init
# package.json: { "name": "@repo/supabase" }
pnpm add @supabase/supabase-js
```

### Files

```
packages/supabase/src/
├── types.ts          # generated DB types (from Phase 1 step 4)
├── client.ts         # createClient() — takes url + anonKey, returns typed client
└── queries.ts        # listGames, getGameWithState, upsertGameState, createGame, deleteGame
```

### `queries.ts` shape

```typescript
export async function listGames(client, userId): Promise<Game[]>
export async function getGameWithState(client, gameId): Promise<{ game: Game, state: GameState | null }>
export async function createGame(client, userId, seed, name): Promise<Game>
export async function upsertGameState(client, gameId, serialised): Promise<void>
export async function deleteGame(client, gameId): Promise<void>
```

**Done when:** TypeScript compiles, queries have correct return types from generated DB types.

---

## Phase 4 — Next.js Web App

**Goal:** Working web app with auth, game list, and playable game with cloud save.

### Setup

```bash
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir
pnpm add @supabase/ssr @supabase/supabase-js
pnpm add @repo/minesweeper-core @repo/supabase
```

### File structure

```
apps/web/src/
├── app/
│   ├── layout.tsx                  # root layout, SessionProvider
│   ├── page.tsx                    # redirect: auth → /dashboard, unauth → /login
│   ├── login/
│   │   └── page.tsx                # email/password form + Google button
│   ├── signup/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx                # game list + new game button
│   ├── game/
│   │   └── [id]/
│   │       └── page.tsx            # game canvas page
│   └── auth/
│       └── callback/
│           └── route.ts            # OAuth callback handler
├── components/
│   ├── AuthForm.tsx
│   ├── GameCard.tsx
│   ├── MinesweeperCanvas.tsx       # canvas renderer (web-specific)
│   └── SaveIndicator.tsx
├── lib/
│   ├── supabase-client.ts          # browser Supabase client (uses @supabase/ssr)
│   ├── supabase-server.ts          # server Supabase client
│   └── hooks/
│       ├── useGameState.ts         # loads + saves game state
│       └── useAutoSave.ts          # debounced save trigger
└── middleware.ts                   # protect /dashboard and /game routes
```

### Auth flow

1. **`/login`** — `supabase.auth.signInWithPassword()` for email, `supabase.auth.signInWithOAuth({ provider: 'google' })` for Google
2. **`/auth/callback/route.ts`** — exchange OAuth code for session using `supabase.auth.exchangeCodeForSession()`
3. **`middleware.ts`** — check session via `supabase.auth.getUser()`, redirect unauthenticated users to `/login`

### Dashboard page

- Fetch games with `listGames(client, user.id)`
- "New Game" button: calls `createGame()` with a random seed, then `router.push('/game/[id]')`
- Each card shows game name, last saved timestamp, and a "Continue" link
- Delete button (with confirm) calls `deleteGame()`

### Game page (`/game/[id]`)

1. Server component fetches `getGameWithState(gameId)` — passes serialised state as prop
2. Client component `MinesweeperCanvas` receives state, calls `deserialise()` from core, runs the canvas renderer (port the widget code from the chat, adapted as a React component with `useRef` for the canvas)
3. `useAutoSave` hook: debounce 2s on any state change; immediate save on mine hit or sector solve. Calls `upsertGameState()`
4. `SaveIndicator` shows: "Saved", "Saving…", or "Unsaved changes"

### Canvas renderer notes

- Extract the draw/event logic from the widget into `MinesweeperCanvas.tsx`
- Use `useEffect` to attach mouse/wheel listeners to the canvas ref
- Game state lives in `useReducer` — dispatch actions (REVEAL, FLAG, PAN)
- Reducer calls `minesweeper-core` functions and returns new state
- `useAutoSave` subscribes to state changes

**Done when:** User can sign up, log in with Google, create games, play, and see saves persist on page refresh.

---

## Phase 5 — Expo Mobile App

**Goal:** iOS/Android app with same auth + game list + playable game.

### Setup

```bash
cd apps/mobile
pnpm create expo-app@latest . --template blank-typescript
pnpm add @supabase/supabase-js @react-native-async-storage/async-storage
pnpm add expo-web-browser expo-auth-session expo-crypto
pnpm add @shopify/react-native-skia   # canvas renderer
pnpm add @repo/minesweeper-core @repo/supabase
```

### File structure

```
apps/mobile/
├── app/
│   ├── _layout.tsx               # Expo Router root layout
│   ├── index.tsx                 # redirect based on auth state
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (app)/
│   │   ├── dashboard.tsx
│   │   └── game/
│   │       └── [id].tsx
│   └── auth/
│       └── callback.tsx          # deep link OAuth handler
├── components/
│   ├── AuthForm.tsx
│   ├── GameCard.tsx
│   ├── MinesweeperSkia.tsx       # Skia canvas renderer
│   └── SaveIndicator.tsx
└── lib/
    ├── supabase.ts               # Supabase client with AsyncStorage session
    └── hooks/                    # same useGameState + useAutoSave as web
```

### Key differences from web

**Supabase client** — must use AsyncStorage for session persistence:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(URL, ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Google OAuth on mobile** — use `expo-auth-session`:
```typescript
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: 'infiniteminesweeper' });

async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUri },
  });
  if (data?.url) await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
}
```

Add deep link scheme to `app.json`:
```json
{ "expo": { "scheme": "infiniteminesweeper" } }
```

**Canvas renderer** — replace the DOM canvas with `@shopify/react-native-skia`:
- The rendering loop is the same logic; replace `ctx.fillRect` / `ctx.fillText` with Skia `<Rect>` / `<Text>` components
- Touch events replace mouse events: `onTouch` for pan/tap, long press for flag
- Game logic calls are identical — same `minesweeper-core` functions

**Done when:** App runs in Expo Go, auth works, games load/save, same saves appear on both web and mobile.

---

## Phase 6 — Cross-Platform Save Sync

**Goal:** Picking up a game on one device continues exactly where the other left off.

### Steps

1. **On game load** — always fetch fresh state from Supabase (not just initial prop):
   ```typescript
   const { state } = await getGameWithState(client, gameId);
   // compare saved_at with local last-save timestamp
   // if remote is newer, use remote state
   ```

2. **Conflict banner** — if remote `saved_at` > local `saved_at` when the app resumes (AppState change on mobile, `visibilitychange` on web), show:
   > "Newer save found from another device. Load it?"

3. **Save debounce** — 2000ms after last action, or immediately on:
   - Mine hit (sector blocked)
   - Sector solved
   - Sector unblocked

4. **Optimistic UI** — don't wait for save to complete before updating the canvas.
   Show "Saving…" indicator; revert + show error toast only on failure.

**Done when:** Open game on web, make moves, switch to mobile, see the same board state within 2 seconds.

---

## Phase 7 — Polish & Production

### Web

- [ ] Loading skeleton for game list and game page
- [ ] Error boundary around the canvas
- [ ] Game rename (inline edit on dashboard)
- [ ] Responsive layout (works on tablet/phone browser too)
- [ ] `next/font` for Orbitron + Share Tech Mono
- [ ] Deploy to Vercel: add env vars in project settings

### Mobile

- [ ] Splash screen + app icon (use `expo-splash-screen`)
- [ ] Haptic feedback on mine hit (`expo-haptics`)
- [ ] Pinch-to-zoom on the canvas
- [ ] Build with EAS: `pnpm dlx eas-cli build --platform all`

### Both

- [ ] Handle Supabase rate limits (exponential backoff on save retries)
- [ ] Offline detection — queue saves and flush when back online
- [ ] Max games per user limit (e.g. 20) to keep storage reasonable

---

## Environment Variables Reference

| Variable | Used in | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web, mobile | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web, mobile | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | web (server only) | For admin operations if needed |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | web | Google OAuth client ID |
| `EXPO_PUBLIC_SUPABASE_URL` | mobile | Same URL, Expo env prefix |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | Same anon key, Expo env prefix |

> Expo requires `EXPO_PUBLIC_` prefix for env vars exposed to the client bundle.

---

## Build Order Summary

```
Phase 0  →  Monorepo + pnpm workspaces + Turborepo
Phase 1  →  Supabase schema + auth providers
Phase 2  →  minesweeper-core package (pure logic)
Phase 3  →  supabase package (client + queries)
Phase 4  →  Next.js web app (auth + dashboard + game)
Phase 5  →  Expo mobile app (same auth + game, Skia renderer)
Phase 6  →  Cross-device sync
Phase 7  →  Polish + deploy
```

Each phase is independently testable. Phases 2–3 have no UI and can be developed
and unit-tested before touching either app.
