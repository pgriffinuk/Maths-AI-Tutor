import { claudeErrorResponse } from '../../../../lib/claude';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

// Fetches one archived conversation's full messages for the History panel
// (see app/chatbot/page.js) - only ever returned if its session_token
// matches the one provided, so one visitor's browser can never read
// another's saved conversations even by guessing an id.
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const sessionToken = searchParams.get('sessionToken');
    const accessCode = searchParams.get('accessCode');

    if (!process.env.CHATBOT_ACCESS_PASSWORD || accessCode !== process.env.CHATBOT_ACCESS_PASSWORD) {
      return Response.json({ error: 'Incorrect or missing access code.', code: 'invalid_access_code' }, { status: 401 });
    }
    if (!sessionToken) {
      return Response.json({ error: 'Missing session.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('anon_conversations')
      .select('messages')
      .eq('id', id)
      .eq('session_token', sessionToken)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return Response.json({ error: 'Conversation not found.' }, { status: 404 });

    return Response.json({ messages: data.messages });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
