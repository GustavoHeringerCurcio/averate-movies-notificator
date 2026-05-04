import {
  readRatingsStore as readRatingsStoreFile,
  writeRatingsStore as writeRatingsStoreFile,
  resetMonthlyQuotaIfNeeded,
} from '@/lib/services/ratingsStore.js';

import {
  canUseSupabaseRatingsStore,
  readRatingsStoreSupabase,
  writeRatingsStoreSupabase,
} from '@/lib/services/ratingsStoreSupabase.js';

export function isUsingSupabaseRatingsStore() {
  return canUseSupabaseRatingsStore();
}

export async function readRatingsStore() {
  if (canUseSupabaseRatingsStore()) {
    return readRatingsStoreSupabase();
  }

  return readRatingsStoreFile();
}

export async function writeRatingsStore(store) {
  if (canUseSupabaseRatingsStore()) {
    return writeRatingsStoreSupabase(store);
  }

  return writeRatingsStoreFile(store);
}

export { resetMonthlyQuotaIfNeeded };
