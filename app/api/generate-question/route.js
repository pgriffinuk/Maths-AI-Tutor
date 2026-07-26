import { callClaude, getLevelContext, claudeErrorResponse } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

// workedSolution is a step array that can carry a full SVG diagram per step
// - same truncation-on-default-token-budget risk as generate-primer, so
// the same higher token budget and explicit maxDuration apply here too.
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { topic, history, course, board, difficulty, accessToken } = await req.json();

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    const { courseInfo, boardInfo, difficultyInfo, specCode, furtherMathsNote } = getLevelContext(course, board, difficulty);
    const system =
      `You write exam-style maths questions for ${boardInfo.label} (${specCode}). ${courseInfo.levelDescription} ${difficultyInfo.promptHint}${furtherMathsNote} If the student has recent history on this topic, use it to calibrate: repeat a similar difficulty if they're still making the same error, step up if they're consistently correct, and specifically target the kind of error they've been making if one is mentioned. Return ONLY valid JSON, no markdown fences, no preamble, with exactly these fields: question (string), workedSolution (array of step objects, each { text: string, diagram: string|null } - break the worked solution into clear steps. For steps involving geometry, graphs, trigonometry, vectors, or data (charts/bar models), include a simple SVG diagram as the 'diagram' field - raw SVG markup only, viewBox="0 0 300 200", using only these elements: svg, g, path, circle, rect, line, polyline, polygon, text, ellipse. No script tags, no external references, no event handler attributes. Keep diagrams simple and clean - basic shapes, axes, labelled points - not attempting photorealistic or highly detailed drawings. For steps that are purely algebraic/arithmetic with no natural visual, leave diagram as null.), keyMarkingPoints (string, 2-4 short bullet-style points describing what a marker should check for).`;
    const historyNote = history && history.trim()
      ? `\nStudent's recent history on this topic:\n${history}`
      : '\nNo recent history on this topic yet — this is their first attempt.';
    const userText = `Topic: ${topic}. Write one question appropriate to the level and difficulty described above.${historyNote}`;

    const result = await callClaude({ system, userText, expectJson: true, maxTokens: 2000 });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'generate-question');
    return Response.json(result);
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
