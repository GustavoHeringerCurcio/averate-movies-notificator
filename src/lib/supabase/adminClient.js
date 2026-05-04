import { createClient } from '@supabase/supabase-js';

let cachedAdminClient = null;
let cachedAdminClientConfig = '';

export function getSupabaseAdminClient() {
  const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceRoleKey) {
    return {
      client: null,
      error:
        'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY on the server.',
    };
  }

  const configKey = `${url}|${serviceRoleKey}`;

  if (!cachedAdminClient || cachedAdminClientConfig !== configKey) {
    cachedAdminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    cachedAdminClientConfig = configKey;
  }

  return { client: cachedAdminClient, error: null };
}
