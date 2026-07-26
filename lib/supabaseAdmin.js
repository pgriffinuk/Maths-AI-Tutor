// Server-side only. Uses the Supabase service role key, which bypasses Row
// Level Security entirely - never import this from a client component, and
// never let this key reach the browser. Only use this for data that isn't
// scoped to the requesting student, e.g. topic_primers, whose rows are
// generic content shared across every student studying that topic rather
// than owned by any one of them (which is why the normal per-student RLS
// policies elsewhere in this app don't fit here).
import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

// Built lazily, on first use inside a request handler, rather than at
// module load time - createClient() throws synchronously if either arg is
// missing, and a throw at import time happens before any route's try/catch
// exists to catch it, crashing the whole function (a bare 502, no JSON
// body) instead of a normal handled error response. Building it lazily
// means a missing SUPABASE_SERVICE_ROLE_KEY - e.g. added to .env.local but
// never set in the Vercel project's environment variables - surfaces as a
// catchable error inside the route instead of taking the function down.
export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw Object.assign(
      new Error('Supabase admin client is not configured - SUPABASE_SERVICE_ROLE_KEY is missing in this environment.'),
      { code: 'server_error' }
    );
  }

  cachedClient = createClient(url, serviceRoleKey);
  return cachedClient;
}
