import {
  canUseSupabaseRatingsStore,
  readRatingsStoreSupabase,
  writeRatingsStoreSupabase,
} from '@/lib/services/ratingsStoreSupabase.js';

function requireSupabaseRatingsStore() {
  if (!canUseSupabaseRatingsStore()) {
    throw new Error(
      'Supabase ratings store is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
}

function getMonthKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function isUsingSupabaseRatingsStore() {
  return canUseSupabaseRatingsStore();
}

export async function readRatingsStore() {
  requireSupabaseRatingsStore();
  return readRatingsStoreSupabase();
}

export async function writeRatingsStore(store) {
  requireSupabaseRatingsStore();
  return writeRatingsStoreSupabase(store);
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
