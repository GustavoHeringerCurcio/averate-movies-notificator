# Movie Dashboard

Small Next.js app focused on two sources only:

- TMDB: now-playing movies in Brazil
- RapidAPI: ratings fetched manually and stored in local cache

## Current Architecture

1. Dashboard calls `GET /api/movies/now-playing`.
2. Server fetches TMDB `/movie/now_playing` and maps the movie list.
3. Dashboard reads cached ratings from local store (`/api/ratings/cached`).
4. Ratings are refreshed only when user clicks manual refresh (`/api/ratings/refresh`).
5. Cards render TMDB identity fields plus cached ratings.

There is no external database, cron job, or scraper stack. Cached ratings are stored in local JSON files.

## Environment Setup

Create `.env.local` (recommended) or `.env` in the project root:

```bash
TMDB_API_KEY=your_tmdb_v3_api_key
# TMDB_ACCESS_TOKEN=your_tmdb_v4_read_access_token
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=your_rapidapi_host
RAPIDAPI_RATINGS_URL_TEMPLATE=https://your-rapidapi-endpoint?imdb_id={imdbId}
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# Supabase (optional)
# NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co  # base URL only (do not include /rest/v1)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

Notes:
- `TMDB_API_KEY` and `TMDB_ACCESS_TOKEN` are server-side credentials.
- `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, and `RAPIDAPI_RATINGS_URL_TEMPLATE` are server-side and used only on manual refresh.
- `DISCORD_WEBHOOK_URL` is server-side only and used by the manual test endpoint.
- A template is available in `.env.example`.
- For Supabase, only `NEXT_PUBLIC_SUPABASE_*` vars can be used in browser code.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`.

## Supabase Setup (Auth + RLS + Tables)

This project has an optional Supabase learning + persistence path:

- The Settings page includes a minimal Supabase Auth (magic link) + Notes demo.
- The ratings cache API can optionally persist to Supabase instead of the local JSON file.

### 1) Create tables

In Supabase Dashboard → SQL Editor, run:

```sql
-- Notes table (user-scoped learning table)
create table if not exists public.notes (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) default auth.uid(),
	content text not null,
	created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

-- Ratings store (single-row JSON mirror of data/ratings-cache.json)
create table if not exists public.ratings_store (
	id text primary key,
	month_key text not null,
	requests_used int not null default 0,
	last_refresh_at timestamptz null,
	ratings_by_imdb_id jsonb not null default '{}'::jsonb
);

alter table public.ratings_store enable row level security;
```

### 2) Add RLS policies for `notes`

```sql
-- Read own notes
create policy "notes_select_own"
on public.notes
for select
to authenticated
using (user_id = auth.uid());

-- Insert notes (own rows only)
create policy "notes_insert_own"
on public.notes
for insert
to authenticated
with check (user_id = auth.uid());

-- Update own notes
create policy "notes_update_own"
on public.notes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Delete own notes
create policy "notes_delete_own"
on public.notes
for delete
to authenticated
using (user_id = auth.uid());
```

Notes:
- These policies are what make the public `anon` key safe in the browser.
- The Settings page demo talks directly to `public.notes` using `@supabase/supabase-js`.

### 3) Ratings store access (server-only)

The code uses the Supabase `service_role` key in API routes to read/write `public.ratings_store`.
Do not create browser policies for this table.
If you later add policies, keep them locked down (or leave it with no client access).

## API Endpoint

- `GET /api/movies/now-playing`: returns mapped TMDB now-playing movies.
- `GET /api/ratings/cached`: returns locally cached ratings and quota counters.
- `POST /api/ratings/refresh`: manually refreshes ratings from RapidAPI with quota/cooldown guards.
- `POST /api/notifications/test`: sends a hello world test message to Discord webhook.

## Manual Ratings Refresh

1. Configure RapidAPI env vars in `.env.local`.
2. Open `/dashboard`.
3. Click `Refresh ratings now` on the left side.
4. Dashboard updates from local cache and shows quota usage.

## Manual Notification Test

1. Add `DISCORD_WEBHOOK_URL` to `.env.local`.
2. Start the app and open `/dashboard`.
3. In the notification controls, keep provider as `Discord` and click `Send test message`.
4. You should see a success message in the UI and a message in your Discord webhook channel.
