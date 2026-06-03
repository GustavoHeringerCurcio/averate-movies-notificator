import { readRatingsStore } from '@/lib/services/ratingsStoreSupabase.js';

export const MIN_AVERATE_THRESHOLD = 7;
const MAX_DISCORD_EMBEDS = 10;
const MAX_MOVIE_EMBEDS = MAX_DISCORD_EMBEDS - 1;

export class DiscordNotificationConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DiscordNotificationConfigError';
  }
}

export class DiscordWebhookError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DiscordWebhookError';
  }
}

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
    throw new DiscordWebhookError(
      `Discord webhook request failed: ${details || response.status}`
    );
  }
}

export async function sendWeeklyDiscordMovieDigest() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new DiscordNotificationConfigError(
      'DISCORD_WEBHOOK_URL is not configured on the server.'
    );
  }

  const store = await readRatingsStore();
  const ratingsByImdbId =
    store?.ratingsByImdbId && typeof store.ratingsByImdbId === 'object'
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

  const digestMovies = qualifiedMovies.slice(0, MAX_MOVIE_EMBEDS);

  const payload =
    digestMovies.length === 0
      ? {
          content:
            'New best movies for this week: no movies reached Averate 7.0+ in the current cache.',
        }
      : buildWeeklyMoviesPayload(digestMovies);

  await sendDiscordWebhookMessage(webhookUrl, payload);

  return {
    provider: 'discord',
    message: 'Weekly Discord movie digest sent 1/1 Discord message(s).',
    summary: {
      minAverateThreshold: MIN_AVERATE_THRESHOLD,
      qualifiedMovies: qualifiedMovies.length,
      notifiedMovies: digestMovies.length,
      attemptedMessages: 1,
      sentMessages: 1,
      failedMessages: 0,
    },
    failures: [],
  };
}
