import { callClaude, getLevelContext, claudeErrorResponse } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

export async function POST(req) {
  try {
    const { question, studentWorking, course, board, difficulty, accessToken } = await req.json();

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    const { courseInfo, boardInfo, difficultyInfo, specCode, furtherMathsNote } = getLevelContext(course, board, difficulty);
    const system =
      `You are a supportive maths tutor for ${boardInfo.label} (${specCode}). ${courseInfo.levelDescription} This question was set at the following difficulty: ${difficultyInfo.promptHint}${furtherMathsNote} Give a Socratic hint. NEVER give the final answer or the next full step. Give one short nudge (max 2 sentences) that helps the student see what to do next. Keep it encouraging and plain-English. Return plain text, not JSON.`;
    const userText = `Question: ${question}\nStudent's working so far (may be blank):\n${studentWorking || '(nothing written yet)'}\nGive one hint.`;

    const hint = await callClaude({ system, userText, expectJson: false });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'hint');
    return Response.json({ hint });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
