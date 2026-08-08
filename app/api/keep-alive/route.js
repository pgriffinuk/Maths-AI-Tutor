import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

// Hit once a day by Vercel Cron (see the "0 6 * * *" schedule in
// vercel.json at the project root) for no reason other than to keep the
// Supabase free-tier project from auto-pausing after 7 days with no
// database activity - a genuine query against the database is what resets
// that inactivity timer, a plain HTTP ping alone wouldn't count. Once a
// day is comfortably inside that 7-day window, and daily cron jobs are
// supported on Vercel's Hobby (free) plan - no plan upgrade needed for
// this schedule. No auth: this isn't reading or exposing any user data,
// just proving the database is reachable.
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    // head:true means Supabase returns just the count, not any actual row
    // data - about as lightweight as a genuine query gets.
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
