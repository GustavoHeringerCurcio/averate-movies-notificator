# Database

This project uses a normalized Supabase schema with two tables:

- ratings_store: one row per imdb_id
- ratings_meta: single row for quota and refresh metadata

## Migration (from old content JSON)

If you already have a ratings_store table with content JSON, rename it first.

```sql
alter table if exists public.ratings_store
rename to ratings_store_snapshot;
```

Then create the new tables.

```sql
create table if not exists public.ratings_meta (
  id text primary key,
  month_key text not null,
  requests_used int not null default 0,
  last_refresh_at timestamptz null
);

create table if not exists public.ratings_store (
  imdb_id text primary key,
  tmdb_id text null,
  title text null,
  poster text null,
  release_date date null,
  imdb_rating text null,
  imdb_status text null,
  rotten_tomatoes text null,
  rotten_tomatoes_status text null,
  metascore text null,
  metascore_status text null,
  source text null,
  fetched_at timestamptz null,
  updated_at timestamptz null
);

create index if not exists ratings_store_fetched_at_idx
  on public.ratings_store (fetched_at desc);
```

Notes:
- The app uses the Supabase service role key in API routes, so RLS is not required.
- If you enable RLS, keep ratings tables locked down (server-only).
