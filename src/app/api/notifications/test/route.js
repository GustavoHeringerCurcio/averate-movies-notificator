import { NextResponse } from 'next/server';
import { readRatingsStore } from '@/lib/services/ratingsStoreSupabase.js';

export const runtime = 'nodejs';

const MIN_AVERATE_THRESHOLD = 7;

function parseNumericRating(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    if (value.trim() === '' || value === 'not-found' || value === 'N/A') {
      return null;
    }

    const parsed = Number.parseFloat(value.replace('%', '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeToTenScale(rawValue, source) {
  const parsed = parseNumericRating(rawValue);

  if (parsed === null) {
    return null;
  }

  if (source === 'imdb') {
    return Math.max(0, Math.min(10, parsed));
  }

  return Math.max(0, Math.min(10, parsed / 10));
}

function computeAverate(movie) {
  const values = [
    normalizeToTenScale(movie.imdbRating, 'imdb'),
    normalizeToTenScale(movie.rottenTomatoes, 'rottenTomatoes'),
    normalizeToTenScale(movie.metascore, 'metascore'),
  ].filter((value) => value !== null);

  if (values.length === 0) {
    return {
      averateValue: null,
      averateDisplay: 'not-found',
    };
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    averateValue: average,
    averateDisplay: average.toFixed(1),
  };
}

function formatRatingValue(value) {
  if (value === null || value === undefined || value === '' || value === 'not-found') {
    return 'N/A';
  }

  return String(value);
}

function buildMovieDescription(movie) {
  if (movie.overview && String(movie.overview).trim() !== '') {
    return String(movie.overview).trim();
  }

  if (movie.releaseDate) {
    return `Release date: ${movie.releaseDate}`;
  }

  return 'No description available.';
}

function buildMovieEmbed(movie) {
  const embed = {
    title: movie.title || 'Untitled Movie',
    description: `${buildMovieDescription(movie)}\n\nAverate: **${movie.averateDisplay}/10**`,
  };

  if (movie.poster) {
    embed.image = { url: movie.poster };
  }

  return embed;
}

function buildCtaEmbed() {
  return {
    title: 'Discover More on Averate',
    description:
      'Check the best movies are playing right now easy on Averate: https://averate.com!',
  };
}

function buildWeeklyMoviesPayload(movies) {
  return {
    content: 'New best movies for this week.',
    embeds: [...movies.map(buildMovieEmbed), buildCtaEmbed()],
  };
}

async function sendDiscordWebhookMessage(webhookUrl, payload) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Discord webhook request failed: ${details || response.status}`);
  }
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
    const store = await readRatingsStore();
    const ratingsByImdbId = store?.ratingsByImdbId && typeof store.ratingsByImdbId === 'object'
      ? store.ratingsByImdbId
      : {};

    const allMovies = Object.values(ratingsByImdbId)
      .map((movie) => {
        const averate = computeAverate(movie);

        return {
          ...movie,
          ...averate,
        };
      })
      .filter((movie) => movie.averateValue !== null);

    const qualifiedMovies = allMovies
      .filter((movie) => movie.averateValue >= MIN_AVERATE_THRESHOLD)
      .sort((a, b) => b.averateValue - a.averateValue);

    const payload = qualifiedMovies.length === 0
      ? {
          content:
            'New best movies for this week: no movies reached Averate 7.0+ in the current cache.',
        }
      : buildWeeklyMoviesPayload(qualifiedMovies);

    try {
      await sendDiscordWebhookMessage(webhookUrl, payload);
    } catch (sendError) {
      const details = sendError instanceof Error ? sendError.message : String(sendError);
      return NextResponse.json(
        {
          error: 'Discord webhook request failed for all messages.',
          details,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      provider,
      message: 'Weekly test flow sent 1/1 Discord message(s).',
      summary: {
        minAverateThreshold: MIN_AVERATE_THRESHOLD,
        qualifiedMovies: qualifiedMovies.length,
        attemptedMessages: 1,
        sentMessages: 1,
        failedMessages: 0,
      },
      failures: [],
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
