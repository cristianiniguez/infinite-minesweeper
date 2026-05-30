# Infinite Minesweeper

Full-stack minesweeper with an infinite procedurally-generated world. Players explore an unbounded grid, reveal cells, flag mines, and unlock adjacent sectors. Game state syncs to the cloud so you can pick up on any device.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Backend / Auth / DB | Supabase (Postgres + Auth) |
| Web | Next.js 16 (App Router) + Tailwind CSS |
| Mobile | Expo (React Native) — in progress |
| Shared game logic | `@repo/minesweeper-core` — pure TypeScript, zero platform deps |
| Shared DB client | `@repo/supabase` — typed Supabase client + query helpers |

## Repo structure

```
/
├── apps/
│   ├── web/          # Next.js app
│   └── mobile/       # Expo app (WIP)
└── packages/
    ├── minesweeper-core/   # Game logic (seed, flood fill, sectors)
    └── supabase/           # Supabase client + DB query helpers
```

## Local setup

### Prerequisites

- Node.js 20+
- pnpm 10+ (`npm i -g pnpm`)
- A [Supabase](https://supabase.com) project

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example and fill in your Supabase credentials:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Then edit `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

### 3. Set up the database

Run the following SQL in the Supabase SQL Editor to create tables and RLS policies:

```sql
-- Games table
create table games (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  seed       bigint not null,
  name       text not null default 'New Game',
  status     text not null default 'active' check (status in ('active', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game state (one row per game, upserted on save)
create table game_states (
  id               uuid primary key default gen_random_uuid(),
  game_id          uuid not null references games(id) on delete cascade unique,
  cam_x            float not null default 0,
  cam_y            float not null default 0,
  flag_count       int not null default 0,
  revealed_cells   jsonb not null default '[]',
  flagged_cells    jsonb not null default '[]',
  blocked_sectors  jsonb not null default '[]',
  solved_sectors   jsonb not null default '[]',
  saved_at         timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger games_updated_at
  before update on games
  for each row execute function update_updated_at();

-- RLS
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

Enable **Email** and **Google** auth providers in the Supabase Dashboard under Authentication → Providers.

### 4. Run the dev server

```bash
pnpm dev
```

This starts all apps and packages in watch mode via Turborepo. The web app runs at `http://localhost:3000`.

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
3. **Cloud save** — game state (revealed cells, flags, camera position) is serialised to JSON and upserted to Supabase on every meaningful action with a 2-second debounce.
4. **Auth** — email/password and Google OAuth via Supabase Auth. Sessions are protected by Next.js middleware.
