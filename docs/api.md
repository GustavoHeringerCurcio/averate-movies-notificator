# API

- GET /api/movies/now-playing
  - Returns now-playing movies from TMDB with imdbId.

- GET /api/ratings/cached
  - Returns ratings and quota data from Supabase.

- POST /api/ratings/refresh
  - Fetches ratings from RapidAPI and stores them in Supabase.
  - Body: { "minPopularity": 30000, "force": false }

- POST /api/notifications/test
  - Sends a Discord test message using DISCORD_WEBHOOK_URL.
  - Body: { "provider": "discord" }
