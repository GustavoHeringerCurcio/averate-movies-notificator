'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const MIN_DASHBOARD_POPULARITY = 30.0;

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

async function refreshRapidApiRatings(minPopularity) {
  const response = await fetch('/api/ratings/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ minPopularity }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to refresh ratings from RapidAPI.');
  }

  return payload;
}

export default function SettingsPage() {
  const [refreshingRatings, setRefreshingRatings] = useState(false);
  const [ratingsSuccess, setRatingsSuccess] = useState('');
  const [ratingsError, setRatingsError] = useState('');
  const [quotaSummary, setQuotaSummary] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const cachedPayload = await fetchCachedRatings();

        if (active) {
          setQuotaSummary(cachedPayload?.quota || null);
        }
      } catch {
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleRefreshRatings = async () => {
    setRatingsError('');
    setRatingsSuccess('');
    setRefreshingRatings(true);

    try {
      const payload = await refreshRapidApiRatings(MIN_DASHBOARD_POPULARITY);
      setQuotaSummary(payload?.quota || null);

      const summary = payload?.summary || {};
      setRatingsSuccess(
        `Ratings refresh finished. fetched=${summary.fetchedCount || 0}, cached=${summary.skippedCached || 0}, failed=${summary.failedCount || 0}.`
      );
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh ratings from RapidAPI.';
      setRatingsError(message);
    } finally {
      setRefreshingRatings(false);
    }
  };

  return (
    <div className="averate-app-shell px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="averate-surface rounded-2xl p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl sm:text-4xl font-semibold">Movie Intelligence Settings</h1>
            <Link
              href="/dashboard"
              className="averate-btn rounded-full border border-slate-500/50 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 hover:border-sky-400/70"
            >
              Back to dashboard
            </Link>
          </div>

          <p className="text-sm text-slate-300 max-w-2xl">
            Manage manual rating refreshes and monitor your RapidAPI usage.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshRatings}
              disabled={refreshingRatings}
              className="averate-btn averate-btn-primary rounded-full px-5 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {refreshingRatings ? 'Refreshing ratings...' : 'Refresh ratings now'}
            </button>

            {quotaSummary && (
              <p className="text-xs text-slate-300">
                RapidAPI quota: {quotaSummary.requestsUsed}/{quotaSummary.monthlyLimit} used ({quotaSummary.monthKey}).
              </p>
            )}
          </div>

          {ratingsSuccess && <p className="text-sm text-emerald-300">{ratingsSuccess}</p>}
          {ratingsError && <p className="text-sm text-red-300">{ratingsError}</p>}
        </section>
      </div>
    </div>
  );
}
