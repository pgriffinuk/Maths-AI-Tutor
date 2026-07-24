// Server-side only. Verifies a student's Supabase access token and enforces
// the daily API call limit before any route is allowed to call Claude.

import { createClient } from '@supabase/supabase-js';
import { DAILY_CALL_LIMIT } from './claude';

export const RATE_LIMIT_MESSAGE = "You've hit today's practice limit - come back tomorrow for more!";

export async function checkRateLimit(accessToken) {
  if (!accessToken) {
    return { error: 'Not signed in.', status: 401 };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return { error: 'Not signed in.', status: 401 };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('api_usage')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', user.id)
    .gte('created_at', since);

  if (countError) {
    return { error: countError.message, status: 500 };
  }

  if ((count || 0) >= DAILY_CALL_LIMIT) {
    return { limited: true };
  }

  return { supabase, userId: user.id };
}

export async function recordApiUsage(supabase, userId, endpoint) {
  await supabase.from('api_usage').insert({ student_id: userId, endpoint });
}
