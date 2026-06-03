create extension if not exists pgcrypto;

create table if not exists ratings_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_ms integer,
  min_popularity numeric,
  now_playing_count integer,
  eligible_count integer,
  unique_imdb_count integer,
  fetched_count integer,
  failed_count integer,
  skipped_cached integer,
  last_refresh_at timestamptz,
  error_message text
);

create index if not exists ratings_refresh_runs_started_at_idx
  on ratings_refresh_runs (started_at desc);

create index if not exists ratings_refresh_runs_run_type_idx
  on ratings_refresh_runs (run_type);
