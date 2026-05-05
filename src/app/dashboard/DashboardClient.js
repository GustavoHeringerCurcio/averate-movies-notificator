'use client';

import { useMemo, useState } from 'react';
import { ArrowDownUp, Star } from 'lucide-react';
import MovieCard from './components/MovieCard';

const RELEASE_MODE_NOW_PLAYING = 'now-playing';
const RELEASE_MODE_UPCOMING = 'upcoming';

const SORT_HIGHEST = 'highest';
const SORT_LOWEST = 'lowest';

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

export default function MovieDashboardClient({
  initialMovies,
  initialError,
  initialEmptyMessage,
}) {
  const [releaseMode, setReleaseMode] = useState(RELEASE_MODE_NOW_PLAYING);
  const [sortDirection, setSortDirection] = useState(SORT_HIGHEST);
  const [showSevenPlusOnly, setShowSevenPlusOnly] = useState(false);

  const movies = Array.isArray(initialMovies) ? initialMovies : [];
  const error = initialError || '';

  const visibleMovies = useMemo(
    () => applyMovieControls(movies, { sortDirection, sevenPlusOnly: showSevenPlusOnly }),
    [movies, sortDirection, showSevenPlusOnly]
  );

  const resolvedEmptyMessage = (() => {
    if (error) {
      return '';
    }

    if (releaseMode === RELEASE_MODE_UPCOMING) {
      return 'Upcoming is coming soon. For now, use Now Playing to browse movies and ratings.';
    }

    if (showSevenPlusOnly && visibleMovies.length === 0) {
      return 'No movies with Averate 7.0+ were found for the current selection.';
    }

    if (visibleMovies.length === 0) {
      return initialEmptyMessage || 'No movies are available at the moment.';
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
              onClick={() =>
                setSortDirection((current) =>
                  current === SORT_HIGHEST ? SORT_LOWEST : SORT_HIGHEST
                )
              }
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

          {error && <p className="text-sm text-red-300">{error}</p>}

          {!error && resolvedEmptyMessage && (
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
