
'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Star } from 'lucide-react';
import MovieCard from './components/MovieCard';

const NOW_PLAYING_LANGUAGE = 'en-US';
const MIN_DASHBOARD_POPULARITY = 30.000;

const RELEASE_MODE_NOW_PLAYING = 'now-playing';
const RELEASE_MODE_UPCOMING = 'upcoming';

const SORT_HIGHEST = 'highest';
const SORT_LOWEST = 'lowest';

async function fetchNowPlayingMovies() {
  const response = await fetch(
    `/api/movies/now-playing?language=${encodeURIComponent(NOW_PLAYING_LANGUAGE)}`,
    {
      method: 'GET',
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'TMDB now-playing request failed');
  }

  const payload = await response.json();
  return Array.isArray(payload?.movies) ? payload.movies : [];
}

async function fetchCachedRatings() {
  const response = await fetch('/api/ratings/cached', {
    method: 'GET',
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load cached ratings.');
  }

  return payload;
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
  // Rotten Tomatoes is temporarily excluded from Averate.
  const values = [
    normalizeToTenScale(movie.imdbRating, 'imdb'),
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

function logTmdbSignalsForEveryMovie(movies) {
  movies.forEach((movie) => {
    console.log(`[TMDB-MOVIE-JSON] ${JSON.stringify(movie, null, 2)}`);
    console.debug(
      `[TMDB-SIGNALS] ${movie.title} | popularity: ${movie.popularity ?? 'not-found'} | vote_average: ${movie.voteAverage ?? 'not-found'} | vote_count: ${movie.voteCount ?? 'not-found'}`
    );
  });
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
    const key = movie.imdbID;
    const cached = key ? ratingsByImdbId?.[key] : null;

    if (!cached) {
      return movie;
    }

    return {
      ...movie,
      imdbRating: cached.imdbRating ?? movie.imdbRating,
      imdbStatus: cached.imdbStatus ?? movie.imdbStatus,
      rottenTomatoes: cached.rottenTomatoes ?? movie.rottenTomatoes,
      rottenTomatoesStatus: cached.rottenTomatoesStatus ?? movie.rottenTomatoesStatus,
      metascore: cached.metascore ?? movie.metascore,
      metascoreStatus: cached.metascoreStatus ?? movie.metascoreStatus,
    };
  });
}

function sortByAverate(a, b, direction) {
  const aValue = a.averateValue;
  const bValue = b.averateValue;

  if (aValue === null && bValue === null) {
    return 0;
  }

  if (aValue === null) {
    return 1;
  }

  if (bValue === null) {
    return -1;
  }

  return direction === SORT_LOWEST ? aValue - bValue : bValue - aValue;
}

function applyMovieControls(movies, { sortDirection, sevenPlusOnly }) {
  const filtered = sevenPlusOnly
    ? movies.filter((movie) => movie.averateValue !== null && movie.averateValue >= 7)
    : movies;

  return [...filtered].sort((a, b) => sortByAverate(a, b, sortDirection));
}

export default function MovieDashboard() {
  const [allMovies, setAllMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emptyMessage, setEmptyMessage] = useState('');
  const [releaseMode, setReleaseMode] = useState(RELEASE_MODE_NOW_PLAYING);
  const [sortDirection, setSortDirection] = useState(SORT_HIGHEST);
  const [showSevenPlusOnly, setShowSevenPlusOnly] = useState(false);

  const loadMovies = async () => {
    setLoading(true);
    setError('');
    setEmptyMessage('');

    try {
      const nowPlayingMovies = await fetchNowPlayingMovies();
      logTmdbSignalsForEveryMovie(nowPlayingMovies);

      if (nowPlayingMovies.length === 0) {
        setAllMovies([]);
        setEmptyMessage('No now-playing movies returned by TMDB for Brazil.');
        return;
      }

      const popularNowPlayingMovies = nowPlayingMovies.filter(
        (movie) => Number(movie?.popularity ?? 0) >= MIN_DASHBOARD_POPULARITY
      );

      if (popularNowPlayingMovies.length === 0) {
        setAllMovies([]);
        setEmptyMessage(
          `No now-playing movies reached popularity ${MIN_DASHBOARD_POPULARITY}+ on TMDB.`
        );
        return;
      }

      const baseMovies = popularNowPlayingMovies.map(buildTmdbBaseMovie);

      try {
        const cachedPayload = await fetchCachedRatings();
        const mergedMovies = mergeCachedRatings(
          baseMovies,
          cachedPayload?.ratingsByImdbId || {}
        ).map(attachAverate);

        setAllMovies(mergedMovies);
      } catch {
        setAllMovies(baseMovies.map(attachAverate));
      }

    } catch {
      setError('Could not load movie data from TMDB/cached ratings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const handleToggleSortDirection = () => {
    setSortDirection((current) =>
      current === SORT_HIGHEST ? SORT_LOWEST : SORT_HIGHEST
    );
  };

  const visibleMovies = useMemo(
    () => applyMovieControls(allMovies, { sortDirection, sevenPlusOnly: showSevenPlusOnly }),
    [allMovies, sortDirection, showSevenPlusOnly]
  );

  const resolvedEmptyMessage = (() => {
    if (loading || error) {
      return '';
    }

    if (releaseMode === RELEASE_MODE_UPCOMING) {
      return 'Upcoming is coming soon. For now, use Now Playing to browse movies and ratings.';
    }

    if (showSevenPlusOnly && visibleMovies.length === 0) {
      return 'No movies with Averate 7.0+ were found for the current selection.';
    }

    if (visibleMovies.length === 0) {
      return emptyMessage || 'No movies are available at the moment.';
    }

    return '';
  })();

  return (
    <div className="min-h-screen averate-app-shell p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <section className="space-y-3">
          <div className="flex flex-wrap gap-6 items-center">
            <button
              type="button"
              onClick={() => setReleaseMode(RELEASE_MODE_NOW_PLAYING)}
              className={`averate-nav-tab ${releaseMode === RELEASE_MODE_NOW_PLAYING ? 'averate-nav-tab-active' : ''}`}
            >
              Now Playing
            </button>
            <button
              type="button"
              onClick={() => setReleaseMode(RELEASE_MODE_UPCOMING)}
              className={`averate-nav-tab ${releaseMode === RELEASE_MODE_UPCOMING ? 'averate-nav-tab-active' : ''}`}
            >
              Upcoming
            </button>
          </div>

          <div className="averate-divider" />
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={handleToggleSortDirection}
              className="averate-pill averate-pill-active inline-flex items-center gap-2"
            >
              <ArrowDownUp className="h-4 w-4" />
              {sortDirection === SORT_HIGHEST ? 'Highest rated first' : 'Lowest rated first'}
            </button>
            <button
              type="button"
              onClick={() => setShowSevenPlusOnly((current) => !current)}
              className={`averate-pill inline-flex items-center gap-2 ${showSevenPlusOnly ? 'averate-pill-active' : ''}`}
            >
              <Star className="h-4 w-4" />
              Show just movies with 7 or more
            </button>
          </div>

          {loading && <p className="text-sm text-sky-300">Loading movies...</p>}

          {error && <p className="text-sm text-red-300">{error}</p>}

          {!loading && !error && resolvedEmptyMessage && (
            <p className="text-sm text-amber-300">{resolvedEmptyMessage}</p>
          )}
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {visibleMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </div>
    </div>
  );
}
