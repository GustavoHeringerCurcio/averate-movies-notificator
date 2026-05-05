import { NextResponse } from 'next/server';
import { readRatingsStore, resetMonthlyQuotaIfNeeded, writeRatingsStore } from '@/lib/services/ratingsStoreSupabase.js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const store = await readRatingsStore();
    return NextResponse.json({
      ratingsByImdbId: store.ratingsByImdbId,
      lastRefreshAt: store.lastRefreshAt,
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
