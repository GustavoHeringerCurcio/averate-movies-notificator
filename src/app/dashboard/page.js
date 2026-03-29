
'use client';
import { useEffect, useState } from 'react';
import MovieCard from './components/MovieCard';
import { fetchRatingsByImdbIds } from '@/lib/services/omdb.js';

const NOW_PLAYING_LANGUAGE = 'en-US';
const MIN_DASHBOARD_POPULARITY = 30.000;
const DEFAULT_NOTIFICATION_PROVIDER = 'discord';

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

async function sendTestNotification(provider) {
  const response = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ provider }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to send notification test message.');
  }

  return payload;
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
    imdbStatus: movie.imdbId ? 'omdb-pending' : 'omdb-missing-imdb-id',
    rottenTomatoes: 'not-found',
    rottenTomatoesStatus: movie.imdbId ? 'omdb-pending' : 'omdb-missing-imdb-id',
    metascore: 'not-found',
    metascoreStatus: movie.imdbId ? 'omdb-pending' : 'omdb-missing-imdb-id',
  };
}

export default function MovieDashboard() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emptyMessage, setEmptyMessage] = useState('');
  const [notificationProvider, setNotificationProvider] = useState(
    DEFAULT_NOTIFICATION_PROVIDER
  );
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState('');
  const [notificationError, setNotificationError] = useState('');

  const loadMovies = async () => {
    setLoading(true);
    setError('');
    setEmptyMessage('');

    try {
      const nowPlayingMovies = await fetchNowPlayingMovies();
      logTmdbSignalsForEveryMovie(nowPlayingMovies);

      if (nowPlayingMovies.length === 0) {
        setMovies([]);
        setEmptyMessage('No now-playing movies returned by TMDB for Brazil.');
        return;
      }

      const popularNowPlayingMovies = nowPlayingMovies.filter(
        (movie) => Number(movie?.popularity ?? 0) >= MIN_DASHBOARD_POPULARITY
      );

      if (popularNowPlayingMovies.length === 0) {
        setMovies([]);
        setEmptyMessage(
          `No now-playing movies reached popularity ${MIN_DASHBOARD_POPULARITY}+ on TMDB.`
        );
        return;
      }

      const baseMovies = popularNowPlayingMovies.map(buildTmdbBaseMovie);

      try {
        const ratings = await fetchRatingsByImdbIds(popularNowPlayingMovies);
        const ratingsByMovieId = Object.fromEntries(
          ratings.map((rating) => [rating.id, rating])
        );

        const mergedMovies = baseMovies.map((movie) => {
          const rating = ratingsByMovieId[movie.id];

          if (!rating) {
            return movie;
          }

          return {
            ...movie,
            imdbID: rating.imdbID || movie.imdbID,
            imdbRating: rating.imdbRating,
            imdbStatus: rating.imdbStatus,
            rottenTomatoes: rating.rottenTomatoes,
            rottenTomatoesStatus: rating.rottenTomatoesStatus,
            metascore: rating.metascore,
            metascoreStatus: rating.metascoreStatus,
          };
        });

        setMovies(mergedMovies);
      } catch {
        const failedRatingsMovies = baseMovies.map((movie) => ({
          ...movie,
          imdbStatus: movie.imdbID ? 'omdb-request-failed' : 'omdb-missing-imdb-id',
          rottenTomatoesStatus: movie.imdbID
            ? 'omdb-request-failed'
            : 'omdb-missing-imdb-id',
          metascoreStatus: movie.imdbID ? 'omdb-request-failed' : 'omdb-missing-imdb-id',
        }));

        setMovies(failedRatingsMovies);
      }

    } catch {
      setError('Could not load movie data from TMDB/OMDb.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const handleSendTestNotification = async () => {
    setNotificationSuccess('');
    setNotificationError('');
    setSendingNotification(true);

    try {
      const payload = await sendTestNotification(notificationProvider);
      setNotificationSuccess(payload?.message || 'Test message sent successfully.');
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : 'Could not send test message to notification provider.';
      setNotificationError(message);
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Movie Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing now-playing movies in Brazil from TMDB with OMDb ratings.
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={notificationProvider}
              onChange={(event) => setNotificationProvider(event.target.value)}
              disabled={sendingNotification}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              aria-label="Notification provider"
            >
              <option value="discord">Discord</option>
            </select>

            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={sendingNotification}
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingNotification ? 'Sending...' : 'Send test message'}
            </button>
          </div>
        </div>

        {notificationSuccess && (
          <p className="text-sm text-emerald-700">{notificationSuccess}</p>
        )}

        {notificationError && (
          <p className="text-sm text-red-600">{notificationError}</p>
        )}

        {loading && <p className="text-sm text-blue-700">Loading movies...</p>}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && emptyMessage && (
          <p className="text-sm text-amber-700">{emptyMessage}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
