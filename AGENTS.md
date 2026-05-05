<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Focus

- Show now-playing movies from TMDB.
- Fetch ratings via RapidAPI only on manual refresh.
- Store ratings in Supabase (single source of truth).
- Keep the Send test message flow for Discord notifications.

# Data Flow

- /api/movies/now-playing -> TMDB
- /api/ratings/refresh -> RapidAPI -> Supabase movies
- /api/ratings/cached -> Supabase movies -> UI
- /api/notifications/test -> Discord webhook

# Structure Notes

- API routes live in src/app/api
- UI pages live in src/app
- Server-only services in src/lib/services
- Supabase admin client in src/lib/supabase
