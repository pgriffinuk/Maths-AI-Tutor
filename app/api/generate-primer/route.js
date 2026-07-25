import { callClaude, claudeErrorResponse, EXAM_BOARDS, SPEC_CODES, COURSES } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { board, course, topic, accessToken } = await req.json();
    if (!board || !course || !topic) {
      return Response.json({ error: 'Missing board, course, or topic.' }, { status: 400 });
    }

    // Auth check happens for every request, cached or not, so this can't be
    // hammered anonymously - but a cache hit costs nothing, so it shouldn't
    // be blocked by the daily practice limit (that's only checked below,
    // right before an actual AI call would happen).
    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('topic_primers')
      .select('content')
      .eq('board', board)
      .eq('course', course)
      .eq('topic', topic)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (existing) {
      return Response.json({ content: existing.content });
    }

    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    const boardInfo = EXAM_BOARDS.find((b) => b.key === board);
    const courseInfo = COURSES.find((c) => c.key === course);
    if (!boardInfo || !courseInfo) {
      return Response.json({ error: 'Unknown board or course.' }, { status: 400 });
    }
    const specCode = (SPEC_CODES[boardInfo.key] && SPEC_CODES[boardInfo.key][courseInfo.key]) || '';

    const system =
      "You write short, clear topic primers for maths students, to read before starting practice questions. Use plain language, a warm and encouraging tone (not textbook-dry), and keep it genuinely short - aim for 150-250 words. Structure: 1) a one-sentence plain-English explanation of what this topic is about, 2) the 2-3 key ideas or formulae they need to know, 3) one short worked example, 4) one common mistake to watch out for. Do not use markdown headers or bullet symbols - write it as natural prose with clear paragraph breaks, since this will also be read aloud by text-to-speech.";
    const userText =
      `Exam board: ${boardInfo.label}${specCode ? ` (${specCode})` : ''}\nCourse: ${courseInfo.levelDescription}\nTopic: ${topic}\n\nWrite the primer for this topic.`;

    const content = await callClaude({ system, userText, expectJson: false });

    const { error: insertError } = await supabaseAdmin
      .from('topic_primers')
      .insert({ board, course, topic, content });
    if (insertError) console.error('Could not cache topic primer:', insertError.message);

    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'generate-primer');
    return Response.json({ content });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
