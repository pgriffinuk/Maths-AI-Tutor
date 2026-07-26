import { callClaude, claudeErrorResponse, EXAM_BOARDS, SPEC_CODES, COURSES } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

// A primer's prose sections plus a multi-step worked example (each step
// potentially carrying an SVG diagram) is easily the richest output of any
// AI route here. 2500 tokens still wasn't enough headroom for a near-every-
// step-has-a-diagram worked example, so this is bumped again to 4000 and
// the prompt below now caps how many steps actually get a diagram (see
// below) rather than just leaning on a bigger budget alone. maxDuration is
// bumped alongside it so our own retry logic always has room to finish and
// return a clean response, rather than the platform killing the function
// first (which no amount of try/catch can catch, since it isn't a JS error).
export const maxDuration = 90;

// content is stored as jsonb (see supabase/schema.sql), so a cached row is
// always syntactically valid JSON - but rows cached before this structure
// changed (plainExplanation/keyIdeas[]/workedExample/commonMistake, versus
// the older intro/keyIdeas-string/workedExample/commonMistake shape) won't
// match what the dashboard now expects. Treat a shape mismatch as a cache
// miss and regenerate, rather than handing the client something it can't
// render.
function isValidPrimerContent(content) {
  return !!content
    && typeof content.plainExplanation === 'string'
    && Array.isArray(content.keyIdeas)
    && Array.isArray(content.workedExample)
    && typeof content.commonMistake === 'string';
}

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

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('topic_primers')
      .select('content')
      .eq('board', board)
      .eq('course', course)
      .eq('topic', topic)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (existing && isValidPrimerContent(existing.content)) {
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
      `You write short, clear topic primers for maths students, to read before starting practice questions - broken into small chunks a student steps through, not one wall of text. Use plain language, a warm and encouraging tone (not textbook-dry). Return ONLY valid JSON, no markdown fences, no preamble, with exactly these fields: plainExplanation (string, one short sentence in plain English explaining what this topic is about), keyIdeas (array of 2-3 very short bullet-style phrases, NOT full sentences - e.g. "Multiply the fraction by 100", not "To convert a fraction to a percentage, you multiply it by 100"), workedExample (array of step objects, each { text: string, diagram: string|null } - keep each step's text under 10 words. Pick 3-4 of the steps where a picture would help most (a number line, a bar model for fractions or percentages, a simple grid for area or multiplication, a graph or geometric figure, etc) and give those a diagram - leave every other step's diagram as null rather than attempting one for every single step, so the response stays a reasonable size. Diagrams are raw SVG markup only, viewBox="0 0 300 200", using only these elements: svg, g, path, circle, rect, line, polyline, polygon, text, ellipse. No script tags, no external references, no event handler attributes. Keep diagrams simple and clean - basic shapes, axes, labelled points - not attempting photorealistic or highly detailed drawings.), commonMistake (string, one short sentence naming a common mistake to watch out for). Favour diagrams over prose on the steps that do get one - a student should be able to follow the method mostly from the pictures on those steps, with the short text captions as support rather than the main explanation.`;
    const userText =
      `Exam board: ${boardInfo.label}${specCode ? ` (${specCode})` : ''}\nCourse: ${courseInfo.levelDescription}\nTopic: ${topic}\n\nWrite the primer for this topic.`;

    const content = await callClaude({ system, userText, expectJson: true, maxTokens: 4000 });

    const { error: upsertError } = await supabaseAdmin
      .from('topic_primers')
      .upsert({ board, course, topic, content }, { onConflict: 'board,course,topic' });
    if (upsertError) console.error('Could not cache topic primer:', upsertError.message);

    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'generate-primer');
    return Response.json({ content });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
