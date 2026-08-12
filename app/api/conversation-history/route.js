import { claudeErrorResponse } from '../../../lib/claude';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

// Lightweight list for the History panel (see app/chatbot/page.js) - just
// enough to render each entry's title and date, not the full messages
// array, which can be sizable across many saved conversations.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionToken = searchParams.get('sessionToken');
    const accessCode = searchParams.get('accessCode');

    // Same shared-password gate as every other anon-chat route - the
    // conversation content behind this list deserves the same protection
    // as the chat itself, not just a sessionToken match.
    if (!process.env.CHATBOT_ACCESS_PASSWORD || accessCode !== process.env.CHATBOT_ACCESS_PASSWORD) {
      return Response.json({ error: 'Incorrect or missing access code.', code: 'invalid_access_code' }, { status: 401 });
    }
    if (!sessionToken) {
      return Response.json({ error: 'Missing session.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('anon_conversations')
      .select('id, title, updated_at')
      .eq('session_token', sessionToken)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);

    return Response.json({ conversations: data || [] });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
