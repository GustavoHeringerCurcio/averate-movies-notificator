import fs from 'fs/promises';
import process from 'process';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const filePath = path.resolve(process.cwd(), 'data', 'ratings-cache.json');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(2);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error('Failed to read', filePath, err.message);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON in', filePath, err.message);
    process.exit(1);
  }

  const payload = {
    id: 'main',
    month_key: data.monthKey ?? null,
    requests_used: typeof data.requestsUsed === 'number' ? data.requestsUsed : 0,
    last_refresh_at: data.lastRefreshAt ? new Date(data.lastRefreshAt).toISOString() : null,
    ratings_by_imdb_id: data.ratingsByImdbId ?? {}
  };

  console.log('Prepared payload:', JSON.stringify(payload, null, 2));

  if (dryRun) {
    console.log('Dry run: not writing to Supabase.');
    process.exit(0);
  }

  console.log('Upserting into Supabase table `ratings_store`...');
  const { data: upserted, error } = await supabase
    .from('ratings_store')
    .upsert(payload, { onConflict: ['id'], returning: 'representation' });

  if (error) {
    console.error('Supabase upsert error:', error.message || error);
    process.exit(1);
  }

  console.log('Upsert successful. Row:', JSON.stringify(upserted, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
