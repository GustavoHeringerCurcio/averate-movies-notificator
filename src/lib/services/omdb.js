const OMDB_API_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY || 'd81d197';

function parseRottenTomatoesFromRatings(ratings) {
  if (!Array.isArray(ratings)) {
    return null;
  }

  const rt = ratings.find((entry) => entry?.Source === 'Rotten Tomatoes');
  return rt?.Value || null;
}

function toOmdbRating(value, statusWhenMissingMatch) {
  if (statusWhenMissingMatch) {
    return {
      value: 'not-found',
      status: statusWhenMissingMatch,
    };
  }

  if (!value || value === 'N/A') {
    return {
      value: 'not-found',
      status: 'omdb-not-rated-yet',
    };
  }

  return {
    value,
    status: 'ok',
  };
}

function mapMovieRatingsResponse(movie, fallbackMovie) {
  const isValid = movie?.Response === 'True';
  const noMatchStatus = isValid ? null : 'omdb-no-match';
  const imdb = toOmdbRating(movie?.imdbRating, noMatchStatus);
  const metascore = toOmdbRating(movie?.Metascore, noMatchStatus);
  const rottenTomatoes = toOmdbRating(
    parseRottenTomatoesFromRatings(movie?.Ratings),
    noMatchStatus
  );

  return {
    id: fallbackMovie.id,
    tmdbId: fallbackMovie.tmdbId,
    imdbID: isValid ? movie.imdbID || fallbackMovie.imdbId || null : fallbackMovie.imdbId || null,
    imdbRating: imdb.value,
    imdbStatus: imdb.status,
    rottenTomatoes: rottenTomatoes.value,
    rottenTomatoesStatus: rottenTomatoes.status,
    metascore: metascore.value,
    metascoreStatus: metascore.status,
  };
}

function buildMissingImdbIdRatings(movie) {
  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    imdbID: null,
    imdbRating: 'not-found',
    imdbStatus: 'omdb-missing-imdb-id',
    rottenTomatoes: 'not-found',
    rottenTomatoesStatus: 'omdb-missing-imdb-id',
    metascore: 'not-found',
    metascoreStatus: 'omdb-missing-imdb-id',
  };
}

function buildRequestFailedRatings(movie) {
  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    imdbID: movie.imdbId || null,
    imdbRating: 'not-found',
    imdbStatus: 'omdb-request-failed',
    rottenTomatoes: 'not-found',
    rottenTomatoesStatus: 'omdb-request-failed',
    metascore: 'not-found',
    metascoreStatus: 'omdb-request-failed',
  };
}

export async function fetchRatingsByImdbIds(movies) {
  if (!Array.isArray(movies) || movies.length === 0) {
    return [];
  }

  const requests = movies.map(async (movie) => {
    if (!movie?.imdbId) {
      return buildMissingImdbIdRatings(movie);
    }

    try {
      const url = `https://www.omdbapi.com/?i=${encodeURIComponent(movie.imdbId)}&apikey=${OMDB_API_KEY}`;
      const payload = await fetch(url).then((response) => response.json());
      return mapMovieRatingsResponse(payload, movie);
    } catch {
      return buildRequestFailedRatings(movie);
    }
  });

  return await Promise.all(requests);
}
