'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient.js';

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

function isMissingColumnError(error, columnName) {
  const message =
    typeof error?.message === 'string'
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!message) {
    return false;
  }

  return (
    message.includes(`column notes.${columnName} does not exist`) ||
    message.includes(`column "notes".${columnName} does not exist`) ||
    message.includes(`Could not find the '${columnName}' column`) ||
    message.includes(`Could not find the '${columnName}'`) ||
    message.includes('does not exist')
  );
}

export default function SettingsPage() {
  const [refreshingRatings, setRefreshingRatings] = useState(false);
  const [ratingsSuccess, setRatingsSuccess] = useState('');
  const [ratingsError, setRatingsError] = useState('');
  const [quotaSummary, setQuotaSummary] = useState(null);

  const [supabaseEnvError, setSupabaseEnvError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [session, setSession] = useState(null);

  const [notesBusy, setNotesBusy] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [notes, setNotes] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState('');

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

  useEffect(() => {
    const { client, error } = getSupabaseBrowserClient();

    if (error || !client) {
      setSupabaseEnvError(error || 'Supabase client not configured.');
      return;
    }

    let mounted = true;

    (async () => {
      const { data, error: sessionError } = await client.auth.getSession();
      if (mounted && !sessionError) {
        setSession(data?.session || null);
      }
    })();

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession || null);
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const loadNotes = async () => {
    setNotesError('');

    const { client, error } = getSupabaseBrowserClient();
    if (error || !client) {
      setSupabaseEnvError(error || 'Supabase client not configured.');
      return;
    }

    if (!session) {
      setNotes([]);
      return;
    }

    setNotesBusy(true);

    try {
      let query = await client
        .from('notes')
        .select('id, content, created_at')
        .order('created_at', { ascending: false });

      if (query.error && isMissingColumnError(query.error, 'content')) {
        query = await client
          .from('notes')
          .select('id, notes, created_at')
          .order('created_at', { ascending: false });
      }

      if (query.error) {
        throw new Error(`${query.error.message} (status ${query.status})`);
      }

      const rows = Array.isArray(query.data) ? query.data : [];
      const normalized = rows.map((row) => ({
        ...row,
        content:
          typeof row?.content === 'string'
            ? row.content
            : typeof row?.notes === 'string'
              ? row.notes
              : '',
      }));

      setNotes(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notes.';
      setNotesError(message);
    } finally {
      setNotesBusy(false);
    }
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

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

  const handleSendMagicLink = async () => {
    setAuthError('');
    setAuthMessage('');
    setSupabaseEnvError('');
    setAuthBusy(true);

    const { client, error } = getSupabaseBrowserClient();
    if (error || !client) {
      setSupabaseEnvError(error || 'Supabase client not configured.');
      setAuthBusy(false);
      return;
    }

    try {
      const email = authEmail.trim();
      if (!email) {
        throw new Error('Enter an email first.');
      }

      const redirectTo = `${window.location.origin}/settings`;

      const { error: signInError } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setAuthMessage('Magic link sent. Check your email and open the link to sign in.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send magic link.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError('');
    setAuthMessage('');
    setSupabaseEnvError('');
    setAuthBusy(true);

    const { client, error } = getSupabaseBrowserClient();
    if (error || !client) {
      setSupabaseEnvError(error || 'Supabase client not configured.');
      setAuthBusy(false);
      return;
    }

    try {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      setAuthMessage('Signed out.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to sign out.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleInsertNote = async () => {
    setNotesError('');
    setSupabaseEnvError('');

    const { client, error } = getSupabaseBrowserClient();
    if (error || !client) {
      setSupabaseEnvError(error || 'Supabase client not configured.');
      return;
    }

    if (!session) {
      setNotesError('You must be signed in to insert notes.');
      return;
    }

    const content = newNoteContent.trim();
    if (!content) {
      setNotesError('Note content cannot be empty.');
      return;
    }

    setNotesBusy(true);

    try {
      let insertResult = await client.from('notes').insert({ content });

      if (insertResult.error && isMissingColumnError(insertResult.error, 'content')) {
        insertResult = await client.from('notes').insert({ notes: content });
      }

      if (insertResult.error) {
        throw new Error(`${insertResult.error.message} (status ${insertResult.status})`);
      }

      setNewNoteContent('');
      await loadNotes();
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'Failed to insert note.');
    } finally {
      setNotesBusy(false);
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

        <section className="averate-surface rounded-2xl p-5 sm:p-7 space-y-4">
          <h2 className="text-2xl font-semibold">Supabase Auth (Magic Link)</h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            This is a learning section. Configure <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and{' '}
            <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to enable it.
          </p>

          {supabaseEnvError && <p className="text-sm text-red-300">{supabaseEnvError}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full max-w-sm">
              <label className="text-sm text-slate-300" htmlFor="supabase-email">
                Email
              </label>
              <input
                id="supabase-email"
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
                className="averate-input mt-1 w-full rounded-xl px-3 py-2"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSendMagicLink}
                disabled={authBusy}
                className="averate-btn averate-btn-primary rounded-full px-5 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {authBusy ? 'Sending...' : 'Send magic link'}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={authBusy || !session}
                className="averate-btn rounded-full border border-slate-500/50 bg-slate-900/40 px-5 py-2 text-sm text-slate-200 hover:border-sky-400/70 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Sign out
              </button>
            </div>
          </div>

          {session?.user?.email && (
            <p className="text-xs text-slate-300">
              Signed in as <span className="text-slate-100">{session.user.email}</span>
            </p>
          )}
          {authMessage && <p className="text-sm text-emerald-300">{authMessage}</p>}
          {authError && <p className="text-sm text-red-300">{authError}</p>}
        </section>

        <section className="averate-surface rounded-2xl p-5 sm:p-7 space-y-4">
          <h2 className="text-2xl font-semibold">Supabase Notes (Select + Insert)</h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            This demo hits the <span className="font-mono">notes</span> table directly from the browser using the anon key.
            RLS policies decide what you can read/write.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full">
              <label className="text-sm text-slate-300" htmlFor="new-note">
                New note
              </label>
              <input
                id="new-note"
                type="text"
                value={newNoteContent}
                onChange={(event) => setNewNoteContent(event.target.value)}
                placeholder={session ? 'Type something and insert...' : 'Sign in to insert notes'}
                className="averate-input mt-1 w-full rounded-xl px-3 py-2"
                disabled={!session || notesBusy}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleInsertNote}
                disabled={!session || notesBusy}
                className="averate-btn averate-btn-secondary rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {notesBusy ? 'Working...' : 'Insert'}
              </button>
              <button
                type="button"
                onClick={loadNotes}
                disabled={!session || notesBusy}
                className="averate-btn rounded-full border border-slate-500/50 bg-slate-900/40 px-5 py-2 text-sm text-slate-200 hover:border-sky-400/70 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Refresh
              </button>
            </div>
          </div>

          {notesError && <p className="text-sm text-red-300">{notesError}</p>}

          <div className="space-y-2">
            {session && notes.length === 0 && !notesBusy && (
              <p className="text-sm text-slate-400">No notes yet.</p>
            )}

            {notes.map((note) => (
              <div key={note.id} className="rounded-xl border border-slate-600/40 bg-slate-900/30 p-3">
                <p className="text-sm text-slate-100">{note.content}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {note.created_at ? new Date(note.created_at).toLocaleString() : 'unknown time'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
