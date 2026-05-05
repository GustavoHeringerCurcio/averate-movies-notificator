'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MIN_DASHBOARD_POPULARITY = 30.0;

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

function formatTimestamp(value) {
  if (!value) {
    return 'Not refreshed yet.';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

export default function SettingsClient({
  initialQuotaSummary,
  initialLastRefreshAt,
  initialError,
}) {
  const router = useRouter();
  const [refreshingRatings, setRefreshingRatings] = useState(false);
  const [ratingsSuccess, setRatingsSuccess] = useState('');
  const [ratingsError, setRatingsError] = useState(initialError || '');
  const [quotaSummary, setQuotaSummary] = useState(initialQuotaSummary);
  const [lastRefreshAt, setLastRefreshAt] = useState(initialLastRefreshAt);

  const handleRefreshRatings = async () => {
    setRatingsError('');
    setRatingsSuccess('');
    setRefreshingRatings(true);

    try {
      const payload = await refreshRapidApiRatings(MIN_DASHBOARD_POPULARITY);
      setQuotaSummary(payload?.quota || null);
      setLastRefreshAt(payload?.lastRefreshAt || null);

      const summary = payload?.summary || {};
      setRatingsSuccess(
        `Ratings refresh finished. fetched=${summary.fetchedCount || 0}, cached=${summary.skippedCached || 0}, failed=${summary.failedCount || 0}.`
      );

      router.refresh();
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
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold">Settings</h1>
          <p className="text-slate-300">
            Manual refresh for ratings stored in Supabase.
          </p>
        </section>

        <section className="averate-surface rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Manual Ratings Refresh</h2>
          <p className="text-sm text-slate-300">
            Trigger a RapidAPI refresh for now-playing movies. Results are stored in Supabase.
          </p>
          <button
            type="button"
            onClick={handleRefreshRatings}
            disabled={refreshingRatings}
            className="averate-btn averate-btn-primary rounded-full px-6 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshingRatings ? 'Refreshing ratings...' : 'Refresh ratings now'}
          </button>
          {ratingsSuccess && <p className="text-sm text-emerald-300">{ratingsSuccess}</p>}
          {ratingsError && <p className="text-sm text-red-300">{ratingsError}</p>}
        </section>

        <section className="averate-surface rounded-2xl p-5 sm:p-6 space-y-3">
          <h2 className="text-2xl font-semibold">RapidAPI Quota</h2>
          <p className="text-sm text-slate-300">Quota is tracked in Supabase.</p>
          <div className="grid gap-2 text-sm text-slate-200">
            <p>Month: {quotaSummary?.monthKey || 'unknown'}</p>
            <p>Requests used: {quotaSummary?.requestsUsed ?? 'n/a'}</p>
            <p>Monthly limit: {quotaSummary?.monthlyLimit ?? 'n/a'}</p>
            <p>Last refresh: {formatTimestamp(lastRefreshAt)}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
