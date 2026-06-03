import { NextResponse } from 'next/server';
import { refreshRatingsFromRapidApi } from '@/lib/services/ratingsRefresh.js';

export const runtime = 'nodejs';

function isCronEnabled() {
  return String(process.env.RATINGS_CRON_ENABLED || '').toLowerCase() === 'true';
}

function getCronMinPopularity() {
  const raw = Number(process.env.RATINGS_CRON_MIN_POPULARITY ?? 30);
  return Number.isFinite(raw) ? raw : 30;
}

export async function GET() {
  if (!isCronEnabled()) {
    return NextResponse.json(
      { error: 'Ratings cron is disabled.' },
      { status: 404 }
    );
  }

  try {
    const { summary, lastRefreshAt } = await refreshRatingsFromRapidApi({
      minPopularity: getCronMinPopularity(),
      runType: 'cron',
    });

    return NextResponse.json({
      success: true,
      summary,
      lastRefreshAt,
      cron: true,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to refresh ratings from RapidAPI (cron).',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
