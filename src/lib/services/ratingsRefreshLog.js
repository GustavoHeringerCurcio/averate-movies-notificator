import { getSupabaseAdminClient } from '@/lib/supabase/adminClient.js';

const REFRESH_RUNS_TABLE = 'ratings_refresh_runs';

export async function createRatingsRefreshRun({
  runType,
  startedAt,
  minPopularity,
}) {
  try {
    const { client, error } = getSupabaseAdminClient();

    if (error || !client) {
      return null;
    }

    const { data, error: insertError } = await client
      .from(REFRESH_RUNS_TABLE)
      .insert([
        {
          run_type: runType,
          started_at: startedAt.toISOString(),
          min_popularity: minPopularity,
        },
      ])
      .select('id')
      .single();

    if (insertError) {
      return null;
    }

    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function finalizeRatingsRefreshRun({
  runId,
  finishedAt,
  durationMs,
  summary,
  lastRefreshAt,
  errorMessage,
}) {
  if (!runId) {
    return;
  }

  try {
    const { client, error } = getSupabaseAdminClient();

    if (error || !client) {
      return;
    }

    const payload = {
      finished_at: finishedAt.toISOString(),
      duration_ms: Number.isFinite(durationMs) ? Math.round(durationMs) : null,
      last_refresh_at: lastRefreshAt ?? null,
      error_message: errorMessage ?? null,
      now_playing_count: summary?.nowPlayingCount ?? null,
      eligible_count: summary?.eligibleCount ?? null,
      unique_imdb_count: summary?.uniqueImdbCount ?? null,
      fetched_count: summary?.fetchedCount ?? null,
      failed_count: summary?.failedCount ?? null,
      skipped_cached: summary?.skippedCached ?? null,
    };

    await client
      .from(REFRESH_RUNS_TABLE)
      .update(payload)
      .eq('id', runId);
  } catch {
    return;
  }
}
