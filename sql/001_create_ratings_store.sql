-- Creates a single-row ratings_store table to mirror the existing JSON cache
CREATE TABLE IF NOT EXISTS public.ratings_store (
  id text PRIMARY KEY,
  month_key text,
  requests_used integer DEFAULT 0,
  last_refresh_at timestamptz,
  ratings_by_imdb_id jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optional: a trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.ratings_store;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.ratings_store
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();
