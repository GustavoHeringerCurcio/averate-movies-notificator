import { createClient } from '@supabase/supabase-js';

let cachedClient = null;
let cachedClientConfig = '';

export function getSupabaseBrowserClient() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey) {
    return {
      client: null,
      error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  const configKey = `${url}|${anonKey}`;

  if (!cachedClient || cachedClientConfig !== configKey) {
    cachedClient = createClient(url, anonKey);
    cachedClientConfig = configKey;
  }

  return { client: cachedClient, error: null };
}
