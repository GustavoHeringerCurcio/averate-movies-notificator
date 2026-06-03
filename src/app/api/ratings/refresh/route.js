import { NextResponse } from 'next/server';
import { refreshRatingsFromRapidApi } from '@/lib/services/ratingsRefresh.js';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const minPopularity = Number(body?.minPopularity ?? 30000);
    const force = Boolean(body?.force);
    const { summary, lastRefreshAt } = await refreshRatingsFromRapidApi({
      minPopularity,
      force,
      runType: 'manual',
    });

    return NextResponse.json({
      success: true,
      summary,
      lastRefreshAt,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to refresh ratings from RapidAPI.',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
