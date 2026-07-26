import { callClaude, claudeErrorResponse, EXAM_BOARDS, SPEC_CODES, COURSES } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

// Two-phase loading: 'explanation' (plainExplanation + keyIdeas) is short
// and prose-only, so it generates fast and the dashboard shows it
// immediately. 'example' (workedExample + commonMistake) is the heavier,
// diagram-heavy content and is fetched separately in the background - this
// maxDuration/token budget only really matters for that phase, but applies
// to the whole route either way.
export const maxDuration = 90;

// content is jsonb (see supabase/schema.sql), so a cached row is always
// syntactically valid JSON - but a row cached under an older shape (before
// this two-phase split, or before the structure changed at all) won't have
// the fields this phase expects. Treat a shape mismatch as a cache miss and
// regenerate, rather than handing the client something it can't render.
function isValidExplanationContent(content) {
  return !!content && typeof content.plainExplanation === 'string' && Array.isArray(content.keyIdeas);
}
function isValidExampleContent(content) {
  return !!content && Array.isArray(content.workedExample) && typeof content.commonMistake === 'string';
}

const EXPLANATION_SYSTEM =
  'You write the short opening explanation for a maths topic primer, to read before starting practice questions - just this one part, not a full primer. Use plain language, a warm and encouraging tone (not textbook-dry). Return ONLY valid JSON, no markdown fences, no preamble, with exactly these fields: plainExplanation (string, one short sentence in plain English explaining what this topic is about), keyIdeas (array of 2-3 very short bullet-style phrases, NOT full sentences - e.g. "Multiply the fraction by 100", not "To convert a fraction to a percentage, you multiply it by 100").';

const EXAMPLE_SYSTEM =
  `You write the worked-example part of a maths topic primer, as a sequence of small steps a student can follow one at a time. Return ONLY valid JSON, no markdown fences, no preamble, with exactly these fields: workedExample (array of step objects, each { text: string, diagram: string|null } - keep each step's text under 10 words. Keep the worked example to at most 4 steps. Include a diagram for the 2-3 steps where it adds the most value, not necessarily every step - prioritise quality and clarity of diagrams over quantity. Diagrams are raw SVG markup only, viewBox="0 0 300 200", using only these elements: svg, g, path, circle, rect, line, polyline, polygon, text, ellipse. No script tags, no external references, no event handler attributes. Keep diagrams simple and clean - basic shapes, axes, labelled points - not attempting photorealistic or highly detailed drawings.), commonMistake (string, one short sentence naming a common mistake to watch out for). Favour diagrams over prose on the steps that do get one - a student should be able to follow the method mostly from the pictures on those steps, with the short text captions as support rather than the main explanation.`;

export async function POST(req) {
  try {
    const { board, course, topic, phase, accessToken } = await req.json();
    if (!board || !course || !topic) {
      return Response.json({ error: 'Missing board, course, or topic.' }, { status: 400 });
    }
    const normalizedPhase = phase === 'example' ? 'example' : 'explanation';
    const isValidContent = normalizedPhase === 'explanation' ? isValidExplanationContent : isValidExampleContent;

    // Auth check happens for every request, cached or not, so this can't be
    // hammered anonymously - but a cache hit costs nothing, so it shouldn't
    // be blocked by the daily practice limit (that's only checked below,
    // right before an actual AI call would happen).
    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('topic_primers')
      .select('content')
      .eq('board', board)
      .eq('course', course)
      .eq('topic', topic)
      .eq('phase', normalizedPhase)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);

    // Logged explicitly (not just inferred from response time) so a repeat
    // request's cache behaviour is directly verifiable in the function logs
    // rather than assumed - "cache hit" should be near-instant, "cache
    // miss" is followed by an actual callClaude call below.
    const cacheKey = `${board}/${course}/${topic} (${normalizedPhase})`;
    if (existing && isValidContent(existing.content)) {
      console.log(`[generate-primer] cache hit: ${cacheKey}`);
      return Response.json({ content: existing.content });
    }
    console.log(`[generate-primer] cache miss, generating: ${cacheKey}`);

    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    const boardInfo = EXAM_BOARDS.find((b) => b.key === board);
    const courseInfo = COURSES.find((c) => c.key === course);
    if (!boardInfo || !courseInfo) {
      return Response.json({ error: 'Unknown board or course.' }, { status: 400 });
    }
    const specCode = (SPEC_CODES[boardInfo.key] && SPEC_CODES[boardInfo.key][courseInfo.key]) || '';
    const userText =
      `Exam board: ${boardInfo.label}${specCode ? ` (${specCode})` : ''}\nCourse: ${courseInfo.levelDescription}\nTopic: ${topic}\n\n` +
      (normalizedPhase === 'explanation' ? 'Write the short explanation for this topic.' : 'Write the worked example for this topic.');

    const content = normalizedPhase === 'explanation'
      ? await callClaude({ system: EXPLANATION_SYSTEM, userText, expectJson: true, maxTokens: 300 })
      : await callClaude({ system: EXAMPLE_SYSTEM, userText, expectJson: true, maxTokens: 4000 });

    const { error: upsertError } = await supabaseAdmin
      .from('topic_primers')
      .upsert({ board, course, topic, phase: normalizedPhase, content }, { onConflict: 'board,course,topic,phase' });
    if (upsertError) console.error('Could not cache topic primer:', upsertError.message);

    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'generate-primer');
    return Response.json({ content });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
