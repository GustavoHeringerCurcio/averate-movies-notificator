import { NextResponse } from 'next/server';
import { getNowPlayingMovies } from '@/lib/services/tmdb.js';
import { fetchRapidApiRatingsByImdbId } from '@/lib/services/ratingsRapidApi.js';
import {
  readRatingsStore,
  resetMonthlyQuotaIfNeeded,
  writeRatingsStore,
} from '@/lib/services/ratingsStoreBackend.js';

export const runtime = 'nodejs';

const MONTHLY_LIMIT = 100;
const REFRESH_COOLDOWN_HOURS = 24;
const ENABLE_UNLIMITED_TEST_REFRESH = true;

function parseIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shouldRefreshEntry(entry, nowMs) {
  if (!entry) {
    return true;
  }

  const fetchedAtMs = parseIsoDate(entry.fetchedAt)?.getTime();

  if (!fetchedAtMs) {
    return true;
  }

  const isMissing =
    entry.imdbRating === 'not-found' &&
    entry.rottenTomatoes === 'not-found' &&
    entry.metascore === 'not-found';

  const ttlMs = isMissing ? 1000 * 60 * 60 * 24 * 3 : 1000 * 60 * 60 * 24 * 14;
  return nowMs - fetchedAtMs > ttlMs;
}

function applyMovieData(rating, movie) {
  return {
    ...rating,
    title: movie.title,
    overview: movie.overview,
    poster: movie.poster,
    releaseDate: movie.releaseDate,
    tmdbId: movie.tmdbId,
  };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const minPopularity = Number(body?.minPopularity ?? 30000);
    const force = Boolean(body?.force);
    const bypassRefreshGuards = force || ENABLE_UNLIMITED_TEST_REFRESH;

    const tmdbPayload = await getNowPlayingMovies({
      region: 'BR',
      language: 'en-US',
      page: 1,
    });

    const nowPlaying = Array.isArray(tmdbPayload.movies) ? tmdbPayload.movies : [];
    const filteredMovies = nowPlaying.filter(
      (movie) => Number(movie?.popularity ?? 0) >= minPopularity
    );

    const dedupedByImdbId = new Map();
    for (const movie of filteredMovies) {
      if (movie?.imdbId && !dedupedByImdbId.has(movie.imdbId)) {
        dedupedByImdbId.set(movie.imdbId, movie);
      }
    }

    let store = await readRatingsStore();
    store = resetMonthlyQuotaIfNeeded(store);

    const now = new Date();
    const nowMs = now.getTime();
    const lastRefreshDate = parseIsoDate(store.lastRefreshAt);

    if (!bypassRefreshGuards && lastRefreshDate) {
      const cooldownMs = REFRESH_COOLDOWN_HOURS * 60 * 60 * 1000;
      const nextAllowedAtMs = lastRefreshDate.getTime() + cooldownMs;

      if (nowMs < nextAllowedAtMs) {
        return NextResponse.json(
          {
            error: 'Refresh cooldown active. Try again later or set force=true.',
            nextAllowedAt: new Date(nextAllowedAtMs).toISOString(),
          },
          { status: 429 }
        );
      }
    }

    const remainingBudget = Math.max(0, MONTHLY_LIMIT - store.requestsUsed);
    if (!bypassRefreshGuards && remainingBudget === 0) {
      return NextResponse.json(
        {
          error: 'Monthly RapidAPI request limit reached.',
          quota: {
            monthKey: store.monthKey,
            requestsUsed: store.requestsUsed,
            monthlyLimit: MONTHLY_LIMIT,
            unlimitedTestMode: ENABLE_UNLIMITED_TEST_REFRESH,
          },
        },
        { status: 429 }
      );
    }

    const ratingsByImdbId = { ...store.ratingsByImdbId };
    let skippedCached = 0;
    let fetchedCount = 0;
    let failedCount = 0;
    const failedDetails = [];

    const candidates = [];
    for (const [imdbId, movie] of dedupedByImdbId.entries()) {
      const existing = ratingsByImdbId[imdbId];

      if (!bypassRefreshGuards && !shouldRefreshEntry(existing, nowMs)) {
        skippedCached += 1;
        continue;
      }

      candidates.push({ imdbId, movie });
    }

    const limitedCandidates = bypassRefreshGuards
      ? candidates
      : candidates.slice(0, remainingBudget);

    for (const candidate of limitedCandidates) {
      try {
        const rating = await fetchRapidApiRatingsByImdbId(candidate.imdbId);
        ratingsByImdbId[candidate.imdbId] = applyMovieData(rating, candidate.movie);
        fetchedCount += 1;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        failedDetails.push({ imdbId: candidate.imdbId, error: errorMsg });
        failedCount += 1;
      }
    }

    const skippedByQuota = Math.max(0, candidates.length - limitedCandidates.length);

    const updatedStore = await writeRatingsStore({
      ...store,
      ratingsByImdbId,
      requestsUsed: ENABLE_UNLIMITED_TEST_REFRESH
        ? store.requestsUsed
        : store.requestsUsed + fetchedCount,
      lastRefreshAt: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      summary: {
        nowPlayingCount: nowPlaying.length,
        eligibleCount: filteredMovies.length,
        uniqueImdbCount: dedupedByImdbId.size,
        fetchedCount,
        failedCount,
        skippedCached,
        skippedByQuota,
        failedDetails,
      },
      quota: {
        monthKey: updatedStore.monthKey,
        requestsUsed: updatedStore.requestsUsed,
        monthlyLimit: MONTHLY_LIMIT,
        remaining: Math.max(0, MONTHLY_LIMIT - updatedStore.requestsUsed),
        unlimitedTestMode: ENABLE_UNLIMITED_TEST_REFRESH,
      },
      lastRefreshAt: updatedStore.lastRefreshAt,
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
