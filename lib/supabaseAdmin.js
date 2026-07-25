// Server-side only. Uses the Supabase service role key, which bypasses Row
// Level Security entirely - never import this from a client component, and
// never let this key reach the browser. Only use this for data that isn't
// scoped to the requesting student, e.g. topic_primers, whose rows are
// generic content shared across every student studying that topic rather
// than owned by any one of them (which is why the normal per-student RLS
// policies elsewhere in this app don't fit here).
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
