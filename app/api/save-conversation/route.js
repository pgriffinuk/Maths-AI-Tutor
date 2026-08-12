import { callClaude, claudeErrorResponse } from '../../../lib/claude';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

// One short AI call (the title) plus a DB upsert - same maxDuration
// convention as every other AI route.
export const maxDuration = 60;

const TITLE_SYSTEM = 'You write short titles for maths tutoring conversations. Read the conversation and produce a plain title of 2-4 words that captures what it was mainly about (e.g. "Quadratic equations", "Fraction addition help", "Circle theorems"). Return ONLY the title text - no quotation marks, no punctuation at the end, no preamble, nothing else.';

// Used if the AI title call fails for any reason (network, rate limit,
// malformed output) - a conversation should never fail to save just
// because the title generation had a hiccup.
function fallbackTitle(messages) {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  const text = (firstUserMessage?.content || 'Conversation').trim();
  return text.length > 40 ? `${text.slice(0, 40).trim()}...` : text || 'Conversation';
}

export async function POST(req) {
  try {
    const { sessionToken, conversationId, messages, accessCode } = await req.json();

    // Same shared-password gate as /api/anon-chat - this route makes its
    // own AI call (the title), so it needs the same cost-control check,
    // not just a sessionToken match.
    if (!process.env.CHATBOT_ACCESS_PASSWORD || accessCode !== process.env.CHATBOT_ACCESS_PASSWORD) {
      return Response.json({ error: 'Incorrect or missing access code.', code: 'invalid_access_code' }, { status: 401 });
    }
    if (!sessionToken || typeof sessionToken !== 'string') {
      return Response.json({ error: 'Missing session.' }, { status: 400 });
    }
    // Client-generated and stable for the lifetime of one conversation
    // (see app/chatbot/page.js) - this is what makes the upsert below
    // update the same row rather than creating a new one if this
    // still-open conversation ever gets saved more than once.
    if (!conversationId || typeof conversationId !== 'string') {
      return Response.json({ error: 'Missing conversation id.' }, { status: 400 });
    }
    // Not an error - a conversation with 0-1 messages has nothing worth
    // titling or archiving yet.
    if (!Array.isArray(messages) || messages.length < 2) {
      return Response.json({ saved: false });
    }

    let title;
    try {
      const transcript = messages.map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');
      const rawTitle = await callClaude({ system: TITLE_SYSTEM, userText: transcript, expectJson: false, maxTokens: 20 });
      const cleaned = rawTitle.trim().replace(/^["']+|["']+$/g, '').replace(/\.+$/, '').trim();
      title = cleaned || fallbackTitle(messages);
    } catch (err) {
      title = fallbackTitle(messages);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('anon_conversations')
      .upsert({ id: conversationId, session_token: sessionToken, title, messages, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);

    return Response.json({ saved: true, title });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
