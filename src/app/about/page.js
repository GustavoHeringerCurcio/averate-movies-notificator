export const metadata = {
  title: 'About | Averate',
};

export default function AboutPage() {
  return (
    <div className="averate-app-shell px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="averate-surface rounded-2xl p-5 sm:p-7">
          <h1 className="text-3xl sm:text-4xl font-semibold">About Averate</h1>
          <p className="mt-3 text-slate-300 max-w-3xl">
            Averate is a movie intelligence dashboard focused on what is playing right now.
            For each movie, it collects ratings and computes one single average score so you can
            quickly spot the titles worth your time.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="averate-surface rounded-2xl p-5">
            <h2 className="text-xl font-semibold">Now Playing Focus</h2>
            <p className="mt-2 text-sm text-slate-300">
              The dashboard tracks current theatrical releases and keeps the movie cards easy to compare.
            </p>
          </article>

          <article className="averate-surface rounded-2xl p-5">
            <h2 className="text-xl font-semibold">One Average Score</h2>
            <p className="mt-2 text-sm text-slate-300">
              Averate normalizes available ratings and prints just one average per movie,
              making ranking and filtering straightforward.
            </p>
          </article>

          <article className="averate-surface rounded-2xl p-5">
            <h2 className="text-xl font-semibold">Never Miss Good Movies</h2>
            <p className="mt-2 text-sm text-slate-300">
              The core idea is simple: alert you when a movie average goes above 7,
              so strong releases do not slip by.
            </p>
          </article>
        </section>

        <section className="averate-surface rounded-2xl p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">Notification Vision</h2>
          <p className="mt-3 text-slate-300">
            Averate is designed to notify through Discord, Telegram, or Slack. Right now, Discord
            is active for test messages, while Telegram and Slack are shown as coming soon in the configuration UI.
          </p>
        </section>
      </div>
    </div>
  );
}
