import { callClaude, claudeErrorResponse } from '../../../lib/claude';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { SOCRATIC_TUTOR_RULES, CHAT_REPLY_STYLE_RULES } from '../../../lib/socraticTutor';

// No authentication at all - this is the free, public /chatbot page, rate
// limited purely by a random client-generated sessionToken (see
// lib/anonChatToken.js), never by anything tied to an account.
export const maxDuration = 60;

const DAILY_ANON_LIMIT = 15;
const LIMIT_MESSAGE = "You've used up today's free chat messages - sign up for unlimited help, or come back tomorrow!";

export async function POST(req) {
  try {
    const { sessionToken, message, history, accessCode, image } = await req.json();

    // Checked before anything else - no rate-limit lookup, no usage
    // counted, no AI call - a shared password gate is what actually keeps
    // random internet visitors from running up API costs here; the
    // client-side "Enter access code" form on /chatbot is just the
    // friendly UI for it, not the real enforcement. Fails closed if the
    // env var itself isn't set, rather than treating a missing password as
    // "anything goes".
    if (!process.env.CHATBOT_ACCESS_PASSWORD || accessCode !== process.env.CHATBOT_ACCESS_PASSWORD) {
      return Response.json({ error: 'Incorrect or missing access code.', code: 'invalid_access_code' }, { status: 401 });
    }

    if (!sessionToken || typeof sessionToken !== 'string') {
      return Response.json({ error: 'Missing session.' }, { status: 400 });
    }
    if ((!message || !String(message).trim()) && !image) {
      return Response.json({ error: 'Message is required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    // Calendar-day reset (not a rolling 24h window like the logged-in daily
    // limit) - matches the friendly "...or come back tomorrow!" wording.
    const today = new Date().toISOString().slice(0, 10);

    // anon_chat_usage has no separate id column - session_token + usage_date
    // together are the actual primary key (see supabase/schema.sql), so
    // every lookup/update targets that composite pair, never an id.
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('anon_chat_usage')
      .select('message_count')
      .eq('session_token', sessionToken)
      .eq('usage_date', today)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);

    if (existing && existing.message_count >= DAILY_ANON_LIMIT) {
      return Response.json({ error: LIMIT_MESSAGE, code: 'anon_rate_limit' }, { status: 429 });
    }

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from('anon_chat_usage')
        .update({ message_count: existing.message_count + 1 })
        .eq('session_token', sessionToken)
        .eq('usage_date', today);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('anon_chat_usage')
        .insert({ session_token: sessionToken, usage_date: today, message_count: 1 });
      if (insertError) throw new Error(insertError.message);
    }

    // No board/course context at all here (there's no selector on this
    // page, just a problem the visitor types in cold) - the shared
    // Socratic rules are the same ones /api/chat uses for any problem that
    // hasn't been marked yet, just with a generic opening framing instead
    // of board/course-specific calibration. The upsell mention below
    // replaces what used to be a persistent UI banner on the page itself -
    // now it's the model's own judgement call, not a fixed element shown to
    // everyone regardless of context.
    // Only added to the prompt when a photo is actually attached, so the
    // vast majority of text-only messages don't carry unused boilerplate.
    const imageNote = image
      ? ' The student may attach a photo of their own handwritten or textbook problem - read it carefully, and apply the same rule as always: never just solve it for them, guide them through it.'
      : '';
    // Lets the chat bubble render real typeset maths (see
    // app/components/MathText.js) instead of raw text like x^2 or 3/4.
    const mathNote = ' When writing mathematical expressions, use LaTeX delimiters: wrap inline maths in single dollar signs (e.g. $x^2$) and standalone/display equations in double dollar signs (e.g. $$\\frac{a}{b}$$) - keep regular sentence text outside these delimiters as normal plain English.';
    const system = `You are a patient maths tutor helping a visitor work through a maths problem they've typed in - it could be from their homework, a textbook, or an exam paper, at any level from GCSE to A Level (or an international equivalent). ${SOCRATIC_TUTOR_RULES}${imageNote}${mathNote} You're part of a free public demo of Stepwise. Occasionally - not on every message, use good judgement - when it genuinely fits the flow of conversation (for example: after you've helped resolve a problem, if the student mentions wanting more practice, tracking their progress, or preparing seriously for an exam), you can naturally mention that the full Stepwise tool offers a free diagnostic test, exam-board-specific marked practice, and progress tracking over time. Keep this brief (one sentence) and conversational, like a helpful aside, not a sales pitch. Never mention it more than once in the same conversation, and never mention it at all if the conversation is short or the student seems mid-problem and not yet at a natural pause. ${CHAT_REPLY_STYLE_RULES}`;
    const context =
      `Conversation so far:\n${(history || []).map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')}\n\n` +
      `Student's new message: ${message || '(sent a photo, no typed message)'}`;

    // When a photo is attached, the message sent to Claude becomes a
    // content array (image block + text block) instead of a plain string.
    const userText = image
      ? [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
          { type: 'text', text: context }
        ]
      : context;

    const result = await callClaude({ system, userText, expectJson: true, maxTokens: 2000 });
    return Response.json(result);
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
