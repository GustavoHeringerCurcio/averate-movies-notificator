import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function buildDiscordTestMessage() {
  return 'Hello Word! This is a test notification from Movie Dashboard. If you received this message, the notification system is working correctly.';
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const provider = String(body?.provider || 'discord').toLowerCase();

  if (provider !== 'discord') {
    return NextResponse.json({ error: 'Unsupported notification provider.' }, { status: 400 });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'DISCORD_WEBHOOK_URL is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    // TODO: future mode should send high-rated movie summaries (rating > 7).
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        content: buildDiscordTestMessage(),
      }),
    });

    if (!discordResponse.ok) {
      const details = await discordResponse.text();
      return NextResponse.json(
        {
          error: 'Discord webhook request failed.',
          details,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      provider,
      message: 'Discord test message sent successfully.',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: 'Failed to call Discord webhook.',
        details: errorMsg,
      },
      { status: 502 }
    );
  }
}
