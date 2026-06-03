import { NextResponse } from 'next/server';
import { refreshRatingsFromRapidApi } from '@/lib/services/ratingsRefresh.js';
import {
  DiscordWebhookError,
  sendWeeklyDiscordMovieDigest,
} from '@/lib/services/discordNotifications.js';

export const runtime = 'nodejs';

function isCronEnabled() {
  return String(process.env.RATINGS_CRON_ENABLED || '').toLowerCase() === 'true';
}

function isDiscordNotificationsCronEnabled() {
  return String(process.env.DISCORD_NOTIFICATIONS_CRON_ENABLED ?? 'true').toLowerCase() === 'true';
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

    if (!isDiscordNotificationsCronEnabled()) {
      return NextResponse.json({
        success: true,
        ratings: {
          summary,
          lastRefreshAt,
        },
        notifications: {
          skipped: true,
          reason: 'Discord notifications are disabled for cron.',
        },
        cron: true,
      });
    }

    try {
      const notifications = await sendWeeklyDiscordMovieDigest();

      return NextResponse.json({
        success: true,
        ratings: {
          summary,
          lastRefreshAt,
        },
        notifications,
        cron: true,
      });
    } catch (notificationError) {
      const notificationErrorMsg =
        notificationError instanceof Error
          ? notificationError.message
          : String(notificationError);
      const status = notificationError instanceof DiscordWebhookError ? 502 : 500;

      return NextResponse.json(
        {
          error: 'Ratings refreshed, but Discord notification failed.',
          details: notificationErrorMsg,
          ratings: {
            summary,
            lastRefreshAt,
          },
          notifications: {
            success: false,
          },
          cron: true,
        },
        { status }
      );
    }
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
