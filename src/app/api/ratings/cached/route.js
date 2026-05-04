import { NextResponse } from 'next/server';
import { readRatingsStore, resetMonthlyQuotaIfNeeded, writeRatingsStore } from '@/lib/services/ratingsStoreBackend.js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const store = await readRatingsStore();
    const normalized = resetMonthlyQuotaIfNeeded(store);

    if (normalized.monthKey !== store.monthKey || normalized.requestsUsed !== store.requestsUsed) {
      await writeRatingsStore(normalized);
    }

    return NextResponse.json({
      ratingsByImdbId: normalized.ratingsByImdbId,
      quota: {
        monthKey: normalized.monthKey,
        requestsUsed: normalized.requestsUsed,
        monthlyLimit: 100,
      },
      lastRefreshAt: normalized.lastRefreshAt,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to load cached ratings.',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
