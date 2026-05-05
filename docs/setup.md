# Setup

## Requirements

- Node.js 18+
- Supabase project with normalized ratings tables (see docs/db.md)

## Environment Variables

Create .env.local and set:

- TMDB_API_KEY or TMDB_ACCESS_TOKEN
- RAPIDAPI_KEY
- RAPIDAPI_HOST
- RAPIDAPI_RATINGS_URL_TEMPLATE
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- DISCORD_WEBHOOK_URL (only for Send test message)

## Run

npm install
npm run dev

Open http://localhost:3000/dashboard
