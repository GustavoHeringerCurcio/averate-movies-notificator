
import { getNowPlayingMovies } from '@/lib/services/tmdb.js';
import { readRatingsStore } from '@/lib/services/ratingsStoreBackend.js';
import MovieDashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

const NOW_PLAYING_LANGUAGE = 'en-US';
const MIN_DASHBOARD_POPULARITY = 30.000;

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

function attachAverate(movie) {
  return {
    ...movie,
    ...computeAverate(movie),
  };
}

function buildTmdbBaseMovie(movie) {
  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    imdbID: movie.imdbId || null,
    releaseDate: movie.releaseDate,
    title: movie.title,
    poster: movie.poster,
    imdbRating: 'not-found',
    imdbStatus: movie.imdbId ? 'rapidapi-not-fetched-yet' : 'rapidapi-missing-imdb-id',
    rottenTomatoes: 'not-found',
    rottenTomatoesStatus: movie.imdbId
      ? 'rapidapi-not-fetched-yet'
      : 'rapidapi-missing-imdb-id',
    metascore: 'not-found',
    metascoreStatus: movie.imdbId ? 'rapidapi-not-fetched-yet' : 'rapidapi-missing-imdb-id',
  };
}

function mergeCachedRatings(baseMovies, ratingsByImdbId) {
  return baseMovies.map((movie) => {
    const cachedByImdb = movie.imdbID ? ratingsByImdbId?.[movie.imdbID] : null;
    const cachedByTmdb =
      !cachedByImdb && movie.tmdbId
        ? Object.values(ratingsByImdbId || {}).find(
            (rating) => String(rating?.tmdbId) === String(movie.tmdbId)
          )
        : null;
    const cached = cachedByImdb || cachedByTmdb;

    if (!cached) {
      return movie;
    }

    return {
      ...movie,
      imdbID: cached.imdbId ?? movie.imdbID,
      imdbRating: cached.imdbRating ?? movie.imdbRating,
      imdbStatus: cached.imdbStatus ?? movie.imdbStatus,
      rottenTomatoes: cached.rottenTomatoes ?? movie.rottenTomatoes,
      rottenTomatoesStatus: cached.rottenTomatoesStatus ?? movie.rottenTomatoesStatus,
      metascore: cached.metascore ?? movie.metascore,
      metascoreStatus: cached.metascoreStatus ?? movie.metascoreStatus,
      liveFetchedAt: cached.fetchedAt ?? movie.liveFetchedAt,
    };
  });
}

async function loadDashboardData() {
  try {
    const tmdbPayload = await getNowPlayingMovies({
      region: 'BR',
      language: NOW_PLAYING_LANGUAGE,
      page: 1,
    });

    const nowPlayingMovies = Array.isArray(tmdbPayload.movies) ? tmdbPayload.movies : [];

    if (nowPlayingMovies.length === 0) {
      return {
        movies: [],
        error: '',
        emptyMessage: 'No now-playing movies returned by TMDB for Brazil.',
      };
    }

    const popularNowPlayingMovies = nowPlayingMovies.filter(
      (movie) => Number(movie?.popularity ?? 0) >= MIN_DASHBOARD_POPULARITY
    );

    if (popularNowPlayingMovies.length === 0) {
      return {
        movies: [],
        error: '',
        emptyMessage: `No now-playing movies reached popularity ${MIN_DASHBOARD_POPULARITY}+ on TMDB.`,
      };
    }

    const baseMovies = popularNowPlayingMovies.map(buildTmdbBaseMovie);
    let ratingsByImdbId = {};

    try {
      const store = await readRatingsStore();
      ratingsByImdbId = store?.ratingsByImdbId || {};
    } catch {
      ratingsByImdbId = {};
    }

    const movies = mergeCachedRatings(baseMovies, ratingsByImdbId).map(attachAverate);

    return {
      movies,
      error: '',
      emptyMessage: '',
    };
  } catch {
    return {
      movies: [],
      error: 'Could not load movie data from TMDB/cached ratings.',
      emptyMessage: '',
    };
  }
}

export default async function MovieDashboard() {
  const { movies, error, emptyMessage } = await loadDashboardData();

  return (
    <MovieDashboardClient
      initialMovies={movies}
      initialError={error}
      initialEmptyMessage={emptyMessage}
    />
  );
}
