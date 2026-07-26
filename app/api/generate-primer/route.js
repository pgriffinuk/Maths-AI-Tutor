import { callClaude, claudeErrorResponse, EXAM_BOARDS, SPEC_CODES, COURSES } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

// A primer's prose sections plus a multi-step worked example (each step
// potentially carrying a full SVG diagram) is easily the richest output of
// any AI route here - the default token budget was truncating it mid-JSON
// on anything but the shortest topics, forcing a slow extra retry that
// could push the whole request past Vercel's function duration limit.
// Explicit maxDuration gives our own retry logic room to always finish and
// return a clean response, rather than the platform killing the function
// first (which no amount of try/catch can catch, since it isn't a JS error).
export const maxDuration = 60;

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
      `You write short, clear topic primers for maths students, to read before starting practice questions. Use plain language, a warm and encouraging tone (not textbook-dry). Return ONLY valid JSON, no markdown fences, no preamble, with exactly these fields: intro (string, a one-sentence plain-English explanation of what this topic is about), keyIdeas (string, the 2-3 key ideas or formulae they need to know, as natural prose with clear paragraph breaks - no markdown headers or bullet symbols, since this will also be read aloud by text-to-speech), workedExample (array of step objects, each { text: string, diagram: string|null } - break the worked example into clear steps. For steps involving geometry, graphs, trigonometry, vectors, or data (charts/bar models), include a simple SVG diagram as the 'diagram' field - raw SVG markup only, viewBox="0 0 300 200", using only these elements: svg, g, path, circle, rect, line, polyline, polygon, text, ellipse. No script tags, no external references, no event handler attributes. Keep diagrams simple and clean - basic shapes, axes, labelled points - not attempting photorealistic or highly detailed drawings. For steps that are purely algebraic/arithmetic with no natural visual, leave diagram as null.), commonMistake (string, one common mistake to watch out for, as natural prose). Aim for roughly 150-250 words combined across intro, keyIdeas and commonMistake - the worked example's length is separate, driven by however many steps it genuinely needs.`;
    const userText =
      `Exam board: ${boardInfo.label}${specCode ? ` (${specCode})` : ''}\nCourse: ${courseInfo.levelDescription}\nTopic: ${topic}\n\nWrite the primer for this topic.`;

    const content = await callClaude({ system, userText, expectJson: true, maxTokens: 2000 });

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
