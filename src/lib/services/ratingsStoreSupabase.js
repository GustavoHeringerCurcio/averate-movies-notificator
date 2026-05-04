import { getSupabaseAdminClient } from '@/lib/supabase/adminClient.js';

const TABLE_NAME = 'ratings_store';
const PRIMARY_ID = 'main';

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

function toDbRow(store) {
  const normalized = normalizeStore(store);

  return {
    id: PRIMARY_ID,
    month_key: normalized.monthKey,
    requests_used: normalized.requestsUsed,
    last_refresh_at: normalized.lastRefreshAt,
    ratings_by_imdb_id: normalized.ratingsByImdbId,
  };
}

function fromDbRow(row) {
  if (!row) {
    return normalizeStore(INITIAL_STORE);
  }

  return normalizeStore({
    monthKey: row.month_key,
    requestsUsed: row.requests_used,
    lastRefreshAt: row.last_refresh_at,
    ratingsByImdbId: row.ratings_by_imdb_id,
  });
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

  const { data, error: readError, status } = await client
    .from(TABLE_NAME)
    .select('id, month_key, requests_used, last_refresh_at, ratings_by_imdb_id')
    .eq('id', PRIMARY_ID)
    .maybeSingle();

  if (readError) {
    throw new Error(`${readError.message} (status ${status})`);
  }

  if (data) {
    return fromDbRow(data);
  }

  const initial = normalizeStore({
    ...INITIAL_STORE,
    monthKey: getMonthKey(),
  });

  const { error: upsertError, status: upsertStatus } = await client
    .from(TABLE_NAME)
    .upsert(toDbRow(initial), { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`${upsertError.message} (status ${upsertStatus})`);
  }

  return initial;
}

export async function writeRatingsStoreSupabase(store) {
  const { client, error } = getSupabaseAdminClient();

  if (error || !client) {
    throw new Error(error || 'Supabase admin client not configured.');
  }

  const normalized = normalizeStore(store);

  const { error: upsertError, status } = await client
    .from(TABLE_NAME)
    .upsert(toDbRow(normalized), { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`${upsertError.message} (status ${status})`);
  }

  return normalized;
}
