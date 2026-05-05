const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
const RAPIDAPI_RATINGS_URL_TEMPLATE = process.env.RAPIDAPI_RATINGS_URL_TEMPLATE;

function requireRapidApiConfig() {
  if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_RATINGS_URL_TEMPLATE) {
    throw new Error(
      'RapidAPI config missing. Set RAPIDAPI_KEY, RAPIDAPI_HOST, and RAPIDAPI_RATINGS_URL_TEMPLATE.'
    );
  }

  if (!RAPIDAPI_RATINGS_URL_TEMPLATE.includes('{imdbId}')) {
    throw new Error(
      'RapidAPI URL template must include {imdbId} placeholder.'
    );
  }
}

function buildRatingsUrl(imdbId) {
  return RAPIDAPI_RATINGS_URL_TEMPLATE.replace('{imdbId}', encodeURIComponent(imdbId));
}

function pickFirstString(candidates) {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() !== '' && value !== 'N/A') {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return 'not-found';
}

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function statusForRatingValue(value) {
  return value === 'not-found' ? 'rapidapi-not-rated-yet' : 'ok';
}

function normalizeRapidApiRatings(payload, imdbId) {
  const root = asObject(payload);
  const data = asObject(root.data);
  const ratings = asObject(root.ratings);
  const aggregateRating = asObject(root.aggregateRating);
  const ratingSummary = asObject(data.ratingSummary);
  const audienceScore = asObject(data.audienceScore);

  const imdbRating = pickFirstString([
    root.averageRating,
    data.averageRating,
    root.imdbRating,
    data.imdbRating,
    ratings.imdb,
    aggregateRating.ratingValue,
    ratingSummary.aggregateRating,
  ]);

  const rottenTomatoes = pickFirstString([
    root.rottenTomatoes,
    data.rottenTomatoes,
    ratings.rottenTomatoes,
    audienceScore.score,
  ]);

  const metascore = pickFirstString([
    root.metascore,
    root.metacritic,
    data.metascore,
    data.metacritic,
    ratings.metacritic,
  ]);

  return {
    imdbId,
    imdbRating,
    imdbStatus: statusForRatingValue(imdbRating),
    rottenTomatoes,
    rottenTomatoesStatus: statusForRatingValue(rottenTomatoes),
    metascore,
    metascoreStatus: statusForRatingValue(metascore),
    source: 'rapidapi',
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchRapidApiRatingsByImdbId(imdbId) {
  if (!imdbId) {
    return {
      imdbId: null,
      imdbRating: 'not-found',
      imdbStatus: 'rapidapi-missing-imdb-id',
      rottenTomatoes: 'not-found',
      rottenTomatoesStatus: 'rapidapi-missing-imdb-id',
      metascore: 'not-found',
      metascoreStatus: 'rapidapi-missing-imdb-id',
      source: 'rapidapi',
      fetchedAt: new Date().toISOString(),
    };
  }

  requireRapidApiConfig();

  const response = await fetch(buildRatingsUrl(imdbId), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`RapidAPI ratings request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  return normalizeRapidApiRatings(payload, imdbId);
}
