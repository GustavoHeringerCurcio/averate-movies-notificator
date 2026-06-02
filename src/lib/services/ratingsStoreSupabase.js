import { getSupabaseAdminClient } from '@/lib/supabase/adminClient.js';

const MOVIES_TABLE = 'movies';

const INITIAL_STORE = {
  version: 1,
  monthKey: '',
  requestsUsed: 0,
  lastRefreshAt: null,
  ratingsByImdbId: {},
};

function getMonthKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function normalizeStore(rawStore) {
  const safe = rawStore && typeof rawStore === 'object' ? rawStore : {};

  return {
    version: 1,
    monthKey: typeof safe.monthKey === 'string' ? safe.monthKey : getMonthKey(),
    requestsUsed: Number.isFinite(Number(safe.requestsUsed)) ? Number(safe.requestsUsed) : 0,
    lastRefreshAt: safe.lastRefreshAt || null,
    ratingsByImdbId:
      safe.ratingsByImdbId && typeof safe.ratingsByImdbId === 'object'
        ? safe.ratingsByImdbId
        : {},
  };
}


const NULLABLE_RATING_VALUES = new Set([
  '',
  'N/A',
  'not-found',
  'rapidapi-not-rated-yet',
  'rapidapi-not-fetched-yet',
  'rapidapi-missing-imdb-id',
]);

function toNullableRatingValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return NULLABLE_RATING_VALUES.has(normalized) ? null : normalized;
  }

  return value;
}

function toRatingRow(imdbId, rating, nowIso) {
  return {
    imdb_id: imdbId,
    tmdb_id: rating.tmdbId ?? null,
    title: rating.title ?? null,
    overview: rating.overview ?? null,
    poster: rating.poster ?? null,
    release_date: rating.releaseDate ?? null,
    imdb_rating: toNullableRatingValue(rating.imdbRating),
    imdb_status: toNullableRatingValue(rating.imdbStatus),
    rotten_tomatoes: toNullableRatingValue(rating.rottenTomatoes),
    rotten_tomatoes_status: toNullableRatingValue(rating.rottenTomatoesStatus),
    metascore: toNullableRatingValue(rating.metascore),
    metascore_status: toNullableRatingValue(rating.metascoreStatus),
    source: rating.source ?? null,
    fetched_at: rating.fetchedAt ?? null,
    updated_at: nowIso,
  };
}

function fromRatingRow(row) {
  return {
    imdbId: row.imdb_id ?? null,
    imdbRating: row.imdb_rating ?? 'not-found',
    imdbStatus: row.imdb_status ?? 'not-found',
    rottenTomatoes: row.rotten_tomatoes ?? 'not-found',
    rottenTomatoesStatus: row.rotten_tomatoes_status ?? 'not-found',
    metascore: row.metascore ?? 'not-found',
    metascoreStatus: row.metascore_status ?? 'not-found',
    source: row.source ?? 'rapidapi',
    fetchedAt: row.fetched_at ?? null,
    title: row.title ?? null,
    overview: row.overview ?? null,
    poster: row.poster ?? null,
    releaseDate: row.release_date ?? null,
    tmdbId: row.tmdb_id ?? null,
  };
}

export function canUseSupabaseRatingsStore() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && serviceRoleKey);
}

export async function readRatingsStore() {
  const { client, error } = getSupabaseAdminClient();

  if (error || !client) {
    throw new Error(error || 'Supabase admin client not configured.');
  }

  let baseStore = normalizeStore({
    ...INITIAL_STORE,
    monthKey: getMonthKey(),
  });

  const { data: ratingRows, error: ratingsError, status: ratingsStatus } = await client
    .from(MOVIES_TABLE)
    .select(
      'imdb_id, tmdb_id, title, overview, poster, release_date, imdb_rating, imdb_status, rotten_tomatoes, rotten_tomatoes_status, metascore, metascore_status, source, fetched_at'
    );

  if (ratingsError) {
    throw new Error(`${ratingsError.message} (status ${ratingsStatus})`);
  }

  const ratingsByImdbId = {};
  const rows = Array.isArray(ratingRows) ? ratingRows : [];
  rows.forEach((row) => {
    if (row?.imdb_id) {
      ratingsByImdbId[row.imdb_id] = fromRatingRow(row);
    }
  });

  baseStore = {
    ...baseStore,
    ratingsByImdbId,
  };

  return baseStore;
}

export async function writeRatingsStore(store) {
  const { client, error } = getSupabaseAdminClient();

  if (error || !client) {
    throw new Error(error || 'Supabase admin client not configured.');
  }

  const normalized = normalizeStore(store);


  const nowIso = new Date().toISOString();
  const ratingRows = Object.entries(normalized.ratingsByImdbId || {})
    .filter(([imdbId]) => Boolean(imdbId))
    .map(([imdbId, rating]) => toRatingRow(imdbId, rating, nowIso));

  if (ratingRows.length > 0) {
    const { error: ratingsError, status: ratingsStatus } = await client
      .from(MOVIES_TABLE)
      .upsert(ratingRows, { onConflict: 'imdb_id' });

    if (ratingsError) {
      throw new Error(`${ratingsError.message} (status ${ratingsStatus})`);
    }
  }

  return normalized;
}

export function resetMonthlyQuotaIfNeeded(store, now = new Date()) {
  const monthKey = getMonthKey(now);

  if (store?.monthKey === monthKey) {
    return store;
  }

  return {
    ...(store || {}),
    monthKey,
    requestsUsed: 0,
  };
}
