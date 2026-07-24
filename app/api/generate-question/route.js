import { callClaude, getLevelContext } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

export async function POST(req) {
  try {
    const { topic, history, course, board, difficulty, accessToken } = await req.json();

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });

    const { courseInfo, boardInfo, difficultyInfo, specCode, furtherMathsNote } = getLevelContext(course, board, difficulty);
    const system =
      `You write exam-style maths questions for ${boardInfo.label} (${specCode}). ${courseInfo.levelDescription} ${difficultyInfo.promptHint}${furtherMathsNote} If the student has recent history on this topic, use it to calibrate: repeat a similar difficulty if they're still making the same error, step up if they're consistently correct, and specifically target the kind of error they've been making if one is mentioned. Return ONLY valid JSON, no markdown fences, no preamble, with exactly these fields: question (string), workedSolution (string, step-by-step correct solution in the same line-by-line style a student would write), keyMarkingPoints (string, 2-4 short bullet-style points describing what a marker should check for).`;
    const historyNote = history && history.trim()
      ? `\nStudent's recent history on this topic:\n${history}`
      : '\nNo recent history on this topic yet — this is their first attempt.';
    const userText = `Topic: ${topic}. Write one question appropriate to the level and difficulty described above.${historyNote}`;

    const result = await callClaude({ system, userText, expectJson: true });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'generate-question');
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
