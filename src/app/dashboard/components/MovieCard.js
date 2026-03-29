export default function MovieCard({ movie }) {
  const averateText = movie.averateDisplay === 'not-found' ? 'N/A' : movie.averateDisplay;

  return (
    <article className="averate-surface rounded-2xl overflow-hidden border border-slate-700/70 shadow-[0_20px_45px_rgba(1,8,27,0.55)]">
      <img
        src={movie.poster}
        alt={`${movie.title} poster`}
        className="w-full h-80 object-cover"
      />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-xl leading-tight text-white">{movie.title}</h3>
          <div className="averate-chip min-w-24 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-900/70">Averate</p>
            <p className="text-2xl leading-none font-bold text-slate-950 mt-1">{averateText}</p>
          </div>
        </div>

        <div className="space-y-1 text-sm text-slate-200">
          <p>
            IMDb: <span className="font-semibold text-white">{movie.imdbRating}</span>
            {movie.imdbStatus && movie.imdbStatus !== 'ok' && (
              <span className="text-xs text-slate-400 ml-1">({movie.imdbStatus})</span>
            )}
          </p>

          <p>
            Metascore: <span className="font-semibold text-white">{movie.metascore}</span>
            {movie.metascoreStatus && movie.metascoreStatus !== 'ok' && (
              <span className="text-xs text-slate-400 ml-1">({movie.metascoreStatus})</span>
            )}
          </p>
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
