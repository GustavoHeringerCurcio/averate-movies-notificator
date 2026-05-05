import { SiImdb, SiMetacritic, SiRottentomatoes } from 'react-icons/si';

function getAverateToneClass(averateValue) {
  if (averateValue === null || averateValue === undefined) {
    return 'averate-score-unknown';
  }

  if (averateValue >= 7.5) {
    return 'averate-score-good';
  }

  if (averateValue >= 6) {
    return 'averate-score-medium';
  }

  if (averateValue >= 5) {
    return 'averate-score-warn';
  }

  return 'averate-score-bad';
}

function formatRatingValue(value) {
  if (value === null || value === undefined || value === 'not-found') {
    return 'N/A';
  }

  return String(value);
}

function formatStatusLabel(status) {
  if (!status || status === 'ok') {
    return null;
  }

  const labels = {
    'rapidapi-not-fetched-yet': 'Pending refresh',
    'rapidapi-not-rated-yet': 'Pending rating',
    'rapidapi-missing-imdb-id': 'Missing IMDb ID',
  };

  return labels[status] || 'Pending update';
}

function shouldShowStatus(status) {
  return Boolean(formatStatusLabel(status));
}

export default function MovieCard({ movie }) {
  const averateText = movie.averateDisplay === 'not-found' ? 'N/A' : movie.averateDisplay;
  const scoreToneClass = getAverateToneClass(movie.averateValue);

  return (
    <article className="averate-surface rounded-2xl overflow-hidden border border-slate-700/70 shadow-[0_20px_45px_rgba(1,8,27,0.55)]">
      <div className="relative">
        <img
          src={movie.poster}
          alt={`${movie.title} poster`}
          className="w-full h-80 object-cover"
        />

        <div className={`averate-score-circle ${scoreToneClass}`} aria-label={`Averate ${averateText}`}>
          <span className="averate-score-value">{averateText}</span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-lg leading-tight text-white">{movie.title}</h3>

        <div className="averate-rating-list">
          <div className="averate-rating-row">
            <span className="averate-rating-icon imdb" aria-hidden="true">
              <SiImdb size={16} />
            </span>
            <span className="averate-rating-label">IMDb</span>
            <span className="averate-rating-value">{formatRatingValue(movie.imdbRating)}</span>
            {shouldShowStatus(movie.imdbStatus) && (
              <span className="averate-rating-status">{formatStatusLabel(movie.imdbStatus)}</span>
            )}
          </div>

          <div className="averate-rating-row">
            <span className="averate-rating-icon rotten" aria-hidden="true">
              <SiRottentomatoes size={16} />
            </span>
            <span className="averate-rating-label">Rotten Tomatoes</span>
            <span className="averate-rating-value">{formatRatingValue(movie.rottenTomatoes)}</span>
            {shouldShowStatus(movie.rottenTomatoesStatus) && (
              <span className="averate-rating-status">
                {formatStatusLabel(movie.rottenTomatoesStatus)}
              </span>
            )}
          </div>

          <div className="averate-rating-row">
            <span className="averate-rating-icon metacritic" aria-hidden="true">
              <SiMetacritic size={16} />
            </span>
            <span className="averate-rating-label">Metascore</span>
            <span className="averate-rating-value">{formatRatingValue(movie.metascore)}</span>
            {shouldShowStatus(movie.metascoreStatus) && (
              <span className="averate-rating-status">{formatStatusLabel(movie.metascoreStatus)}</span>
            )}
          </div>
        </div>

        {movie.liveFetchedAt && (
          <p className="text-xs text-slate-400 mt-2">
            Updated: {new Date(movie.liveFetchedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </article>
  );
}
