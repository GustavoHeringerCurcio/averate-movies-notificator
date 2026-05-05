import { getSupabaseAdminClient } from '@/lib/supabase/adminClient.js';

const RATINGS_TABLE = 'ratings_store';
const META_TABLE = 'ratings_meta';
const META_ID = 'main';

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

function toMetaRow(store) {
  const normalized = normalizeStore(store);

  return {
    id: META_ID,
    month_key: normalized.monthKey,
    requests_used: normalized.requestsUsed,
    last_refresh_at: normalized.lastRefreshAt,
  };
}

function fromMetaRow(row) {
  if (!row) {
    return normalizeStore(INITIAL_STORE);
  }

  return normalizeStore({
    monthKey: row.month_key,
    requestsUsed: row.requests_used,
    lastRefreshAt: row.last_refresh_at,
  });
}

function toRatingRow(imdbId, rating, nowIso) {
  return {
    imdb_id: imdbId,
    tmdb_id: rating.tmdbId ?? null,
    title: rating.title ?? null,
    poster: rating.poster ?? null,
    release_date: rating.releaseDate ?? null,
    imdb_rating: rating.imdbRating ?? null,
    imdb_status: rating.imdbStatus ?? null,
    rotten_tomatoes: rating.rottenTomatoes ?? null,
    rotten_tomatoes_status: rating.rottenTomatoesStatus ?? null,
    metascore: rating.metascore ?? null,
    metascore_status: rating.metascoreStatus ?? null,
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

export async function readRatingsStoreSupabase() {
  const { client, error } = getSupabaseAdminClient();

  if (error || !client) {
    throw new Error(error || 'Supabase admin client not configured.');
  }

  const { data: metaRow, error: metaError, status: metaStatus } = await client
    .from(META_TABLE)
    .select('id, month_key, requests_used, last_refresh_at')
    .eq('id', META_ID)
    .maybeSingle();

  if (metaError) {
    throw new Error(`${metaError.message} (status ${metaStatus})`);
  }

  let baseStore = metaRow ? fromMetaRow(metaRow) : normalizeStore({
    ...INITIAL_STORE,
    monthKey: getMonthKey(),
  });

  if (!metaRow) {
    const { error: insertMetaError, status: insertMetaStatus } = await client
      .from(META_TABLE)
      .insert(toMetaRow(baseStore));

    if (insertMetaError) {
      throw new Error(`${insertMetaError.message} (status ${insertMetaStatus})`);
    }
  }

  const { data: ratingRows, error: ratingsError, status: ratingsStatus } = await client
    .from(RATINGS_TABLE)
    .select(
      'imdb_id, tmdb_id, title, poster, release_date, imdb_rating, imdb_status, rotten_tomatoes, rotten_tomatoes_status, metascore, metascore_status, source, fetched_at'
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

export async function writeRatingsStoreSupabase(store) {
  const { client, error } = getSupabaseAdminClient();

  if (error || !client) {
    throw new Error(error || 'Supabase admin client not configured.');
  }

  const normalized = normalizeStore(store);

  const { error: metaError, status: metaStatus } = await client
    .from(META_TABLE)
    .upsert(toMetaRow(normalized), { onConflict: 'id' });

  if (metaError) {
    throw new Error(`${metaError.message} (status ${metaStatus})`);
  }

  const nowIso = new Date().toISOString();
  const ratingRows = Object.entries(normalized.ratingsByImdbId || {})
    .filter(([imdbId]) => Boolean(imdbId))
    .map(([imdbId, rating]) => toRatingRow(imdbId, rating, nowIso));

  if (ratingRows.length > 0) {
    const { error: ratingsError, status: ratingsStatus } = await client
      .from(RATINGS_TABLE)
      .upsert(ratingRows, { onConflict: 'imdb_id' });

    if (ratingsError) {
      throw new Error(`${ratingsError.message} (status ${ratingsStatus})`);
    }
  }

  return normalized;
}
