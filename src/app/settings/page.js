import {
  readRatingsStore,
  resetMonthlyQuotaIfNeeded,
  writeRatingsStore,
} from '@/lib/services/ratingsStoreSupabase.js';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

const MONTHLY_LIMIT = 100;

async function loadQuotaData() {
  try {
    const store = await readRatingsStore();
    const normalized = resetMonthlyQuotaIfNeeded(store);

    if (
      normalized.monthKey !== store?.monthKey ||
      normalized.requestsUsed !== store?.requestsUsed
    ) {
      await writeRatingsStore(normalized);
    }

    return {
      quotaSummary: {
        monthKey: normalized.monthKey,
        requestsUsed: normalized.requestsUsed,
        monthlyLimit: MONTHLY_LIMIT,
      },
      lastRefreshAt: normalized.lastRefreshAt || null,
      error: '',
    };
  } catch (error) {
    return {
      quotaSummary: null,
      lastRefreshAt: null,
      error: error instanceof Error ? error.message : 'Failed to load ratings summary.',
    };
  }
}

export default async function SettingsPage() {
  const { quotaSummary, lastRefreshAt, error } = await loadQuotaData();

  return (
    <SettingsClient
      initialQuotaSummary={quotaSummary}
      initialLastRefreshAt={lastRefreshAt}
      initialError={error}
    />
  );
}
