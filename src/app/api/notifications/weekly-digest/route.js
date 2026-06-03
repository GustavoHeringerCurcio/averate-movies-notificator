import { NextResponse } from 'next/server';
import {
  DiscordNotificationConfigError,
  DiscordWebhookError,
  sendWeeklyDiscordMovieDigest,
} from '@/lib/services/discordNotifications.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const provider = String(body?.provider || 'discord').toLowerCase();

  if (provider !== 'discord') {
    return NextResponse.json({ error: 'Unsupported notification provider.' }, { status: 400 });
  }

  try {
    const result = await sendWeeklyDiscordMovieDigest();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (error instanceof DiscordNotificationConfigError) {
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    if (error instanceof DiscordWebhookError) {
      return NextResponse.json(
        {
          error: 'Discord webhook request failed for all messages.',
          details: errorMsg,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to send weekly Discord movie digest.',
        details: errorMsg,
      },
      { status: 502 }
    );
  }
}
