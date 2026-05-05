import fs from 'fs/promises';
import process from 'process';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const filePath = path.resolve(process.cwd(), 'data', 'ratings-cache.json');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(2);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error('Failed to read', filePath, err.message);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON in', filePath, err.message);
    process.exit(1);
  }

  const metaRow = {
    id: 'main',
    month_key: data.monthKey ?? null,
    requests_used: typeof data.requestsUsed === 'number' ? data.requestsUsed : 0,
    last_refresh_at: data.lastRefreshAt ? new Date(data.lastRefreshAt).toISOString() : null,
  };

  const ratingsByImdbId = data?.ratingsByImdbId && typeof data.ratingsByImdbId === 'object'
    ? data.ratingsByImdbId
    : {};
  const nowIso = new Date().toISOString();

  const movieRows = Object.entries(ratingsByImdbId)
    .filter(([imdbId]) => Boolean(imdbId))
    .map(([imdbId, rating]) => ({
      imdb_id: imdbId,
      tmdb_id: rating?.tmdbId ?? null,
      title: rating?.title ?? null,
      overview: rating?.overview ?? null,
      poster: rating?.poster ?? null,
      release_date: rating?.releaseDate ?? null,
      imdb_rating: rating?.imdbRating ?? null,
      imdb_status: rating?.imdbStatus ?? null,
      rotten_tomatoes: rating?.rottenTomatoes ?? null,
      rotten_tomatoes_status: rating?.rottenTomatoesStatus ?? null,
      metascore: rating?.metascore ?? null,
      metascore_status: rating?.metascoreStatus ?? null,
      source: rating?.source ?? null,
      fetched_at: rating?.fetchedAt ?? null,
      updated_at: nowIso,
    }));

  console.log('Prepared meta row:', JSON.stringify(metaRow, null, 2));
  console.log(`Prepared ${movieRows.length} movie rows.`);

  if (dryRun) {
    console.log('Dry run: not writing to Supabase.');
    process.exit(0);
  }

  console.log('Upserting into Supabase table `ratings_meta`...');
  const { error: metaError } = await supabase
    .from('ratings_meta')
    .upsert(metaRow, { onConflict: 'id' });

  if (metaError) {
    console.error('Supabase upsert error (ratings_meta):', metaError.message || metaError);
    process.exit(1);
  }

  if (movieRows.length > 0) {
    console.log('Upserting into Supabase table `movies`...');
    const { error: moviesError } = await supabase
      .from('movies')
      .upsert(movieRows, { onConflict: 'imdb_id' });

    if (moviesError) {
      console.error('Supabase upsert error (movies):', moviesError.message || moviesError);
      process.exit(1);
    }
  }

  console.log('Upsert successful.');
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
