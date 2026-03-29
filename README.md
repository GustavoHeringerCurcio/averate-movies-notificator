# Movie Dashboard

Small Next.js app focused on two sources only:

- TMDB: now-playing movies in Brazil
- OMDb: IMDb, Rotten Tomatoes, and Metascore values

## Current Architecture

1. Dashboard calls `GET /api/movies/now-playing`.
2. Server fetches TMDB `/movie/now_playing` and maps the movie list.
3. Dashboard keeps TMDB as source-of-truth for title/poster and enriches ratings from OMDb.
4. Cards render title, poster, and rating fields.

There is no database, cron job, scraper stack, or cache layer.

## Environment Setup

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_api_key
TMDB_API_KEY=your_tmdb_v3_api_key
# TMDB_ACCESS_TOKEN=your_tmdb_v4_read_access_token
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

Notes:
- `TMDB_API_KEY` and `TMDB_ACCESS_TOKEN` are server-side credentials.
- Keep `NEXT_PUBLIC_OMDB_API_KEY` for client-side OMDb requests.
- `DISCORD_WEBHOOK_URL` is server-side only and used by the manual test endpoint.
- A template is available in `.env.example`.

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`.

## API Endpoint

- `GET /api/movies/now-playing`: returns mapped TMDB now-playing movies.
- `POST /api/notifications/test`: sends a hello world test message to Discord webhook.

## Manual Notification Test

1. Add `DISCORD_WEBHOOK_URL` to `.env.local`.
2. Start the app and open `/dashboard`.
3. In the notification controls, keep provider as `Discord` and click `Send test message`.
4. You should see a success message in the UI and a message in your Discord webhook channel.
