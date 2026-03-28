const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

function buildTmdbRequest(pathname, searchParams = {}) {
  const url = new URL(`${TMDB_BASE_URL}${pathname}`);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    accept: 'application/json',
  };

  if (TMDB_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
  } else if (TMDB_API_KEY) {
    url.searchParams.set('api_key', TMDB_API_KEY);
  } else {
    throw new Error('TMDB credentials are missing. Set TMDB_API_KEY or TMDB_ACCESS_TOKEN.');
  }

  return { url: url.toString(), headers };
}

async function fetchTmdbList(pathname, searchParams) {
  const request = buildTmdbRequest(pathname, searchParams);

  const response = await fetch(request.url, {
    method: 'GET',
    headers: request.headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`TMDB request failed (${response.status}) on ${pathname}: ${errorBody}`);
  }

  return await response.json();
}

function mapNowPlayingMovie(movie, index, page) {
  return {
    id: `tmdb-${movie.id}`,
    tmdbId: String(movie.id),
    imdbId: null,
    title: movie.title || movie.original_title || `Movie ${index + 1}`,
    poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
    releaseDate: movie.release_date || null,
    overview: movie.overview || '',
    originalLanguage: movie.original_language || null,
    popularity: movie.popularity ?? null,
    voteAverage: movie.vote_average ?? null,
    voteCount: movie.vote_count ?? null,
    page,
  };
}

async function fetchMovieImdbId(tmdbId) {
  try {
    const payload = await fetchTmdbList(`/movie/${tmdbId}/external_ids`, {});
    return payload?.imdb_id || null;
  } catch {
    return null;
  }
}

export async function getNowPlayingMovies({
  region = 'BR',
  language = 'en-US',
  page = 1,
} = {}) {
  const resolvedPage = Math.max(1, Number(page) || 1);

  const payload = await fetchTmdbList('/movie/now_playing', {
    region,
    language,
    page: resolvedPage,
  });

  const results = Array.isArray(payload?.results) ? payload.results : [];
  const baseMovies = results.map((movie, index) => mapNowPlayingMovie(movie, index, resolvedPage));
  const moviesWithImdbIds = await Promise.all(
    baseMovies.map(async (movie) => ({
      ...movie,
      imdbId: await fetchMovieImdbId(movie.tmdbId),
    }))
  );

  return {
    movies: moviesWithImdbIds,
    page: resolvedPage,
    totalPages: Number(payload?.total_pages || 0),
    totalResults: Number(payload?.total_results || 0),
    region,
    language,
  };
}
