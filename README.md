# Movie Dashboard

Small Next.js app focused on two sources only:

- TMDB: now-playing movies in Brazil
- RapidAPI: ratings fetched manually and stored in Supabase

## Current Architecture

1. Dashboard calls `GET /api/movies/now-playing`.
2. Server fetches TMDB `/movie/now_playing` and maps the movie list.
3. Dashboard reads cached ratings from Supabase (`/api/ratings/cached`).
4. Ratings are refreshed only when user clicks manual refresh (`/api/ratings/refresh`).
5. Cards render TMDB identity fields plus cached ratings.

Ratings live in Supabase as the single source of truth. There is no cron job yet.

## Environment Setup

Create `.env.local` (recommended) or `.env` in the project root:

```bash
TMDB_API_KEY=your_tmdb_v3_api_key
# TMDB_ACCESS_TOKEN=your_tmdb_v4_read_access_token
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=your_rapidapi_host
RAPIDAPI_RATINGS_URL_TEMPLATE=https://your-rapidapi-endpoint?imdb_id={imdbId}
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# Supabase (required for ratings store)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

Notes:
- `TMDB_API_KEY` and `TMDB_ACCESS_TOKEN` are server-side credentials.
- `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, and `RAPIDAPI_RATINGS_URL_TEMPLATE` are server-side and used only on manual refresh.
- `DISCORD_WEBHOOK_URL` is server-side only and used by the manual test endpoint.
- A template is available in `.env.example`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`.

Docs: see ./docs for setup, API notes, and database schema.

## API Endpoint

- `GET /api/movies/now-playing`: returns mapped TMDB now-playing movies.
- `GET /api/ratings/cached`: returns Supabase ratings and quota counters.
- `POST /api/ratings/refresh`: manually refreshes ratings from RapidAPI with quota/cooldown guards.
- `POST /api/notifications/test`: sends a hello world test message to Discord webhook.

## Manual Ratings Refresh

1. Configure RapidAPI env vars in `.env.local`.
2. Open `/dashboard`.
3. Click `Refresh ratings now` on the left side.
4. Dashboard updates from Supabase and shows quota usage.

## Manual Notification Test

1. Add `DISCORD_WEBHOOK_URL` to `.env.local`.
2. Start the app and open `/dashboard`.
3. In the notification controls, keep provider as `Discord` and click `Send test message`.
4. You should see a success message in the UI and a message in your Discord webhook channel.
