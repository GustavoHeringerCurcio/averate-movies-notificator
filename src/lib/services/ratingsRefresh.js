import { getNowPlayingMovies } from '@/lib/services/tmdb.js';
import { fetchRapidApiRatingsByImdbId } from '@/lib/services/ratingsRapidApi.js';
import { readRatingsStore, writeRatingsStore } from '@/lib/services/ratingsStoreSupabase.js';
import {
  createRatingsRefreshRun,
  finalizeRatingsRefreshRun,
} from '@/lib/services/ratingsRefreshLog.js';

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

export async function refreshRatingsFromRapidApi({
  minPopularity = 30000,
  force = false,
  runType = 'manual',
} = {}) {
  const startedAt = new Date();
  let runId = null;

  try {
    runId = await createRatingsRefreshRun({
      runType,
      startedAt,
      minPopularity,
    });
  } catch {
    runId = null;
  }

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

  const store = await readRatingsStore();

  const now = new Date();
  const nowMs = now.getTime();

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

  const limitedCandidates = candidates;

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

  try {
    const updatedStore = await writeRatingsStore({
      ...store,
      ratingsByImdbId,
      lastRefreshAt: now.toISOString(),
    });

    const summary = {
      nowPlayingCount: nowPlaying.length,
      eligibleCount: filteredMovies.length,
      uniqueImdbCount: dedupedByImdbId.size,
      fetchedCount,
      failedCount,
      skippedCached,
      failedDetails,
    };

    await finalizeRatingsRefreshRun({
      runId,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      summary,
      lastRefreshAt: updatedStore.lastRefreshAt,
      errorMessage: null,
    });

    return {
      summary,
      lastRefreshAt: updatedStore.lastRefreshAt,
    };
  } catch (error) {
    await finalizeRatingsRefreshRun({
      runId,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      summary: {
        nowPlayingCount: nowPlaying.length,
        eligibleCount: filteredMovies.length,
        uniqueImdbCount: dedupedByImdbId.size,
        fetchedCount,
        failedCount,
        skippedCached,
      },
      lastRefreshAt: null,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
