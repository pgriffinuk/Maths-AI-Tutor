import { callClaude, getLevelContext, claudeErrorResponse } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

// Same retry/timeout architecture as every other AI route - explicit
// maxDuration so a worst-case double-timeout retry always has room to
// finish and return a clean error response instead of Vercel's own
// function-duration limit killing it first.
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { question, workedSolution, keyMarkingPoints, studentWorking, history, course, board, difficulty, accessToken } = await req.json();

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    const { courseInfo, boardInfo, difficultyInfo, specCode, furtherMathsNote } = getLevelContext(course, board, difficulty);
    const system =
      `You are an experienced maths teacher marking a student's handwritten working for ${boardInfo.label} (${specCode}). ${courseInfo.levelDescription} This question was set at the following difficulty: ${difficultyInfo.promptHint}${furtherMathsNote} Mark line by line, the way a teacher marks homework in a book (ticks, crosses, and short margin comments). Be encouraging but honest and specific about errors. Return ONLY valid JSON, no markdown fences, with exactly these fields: lines (array of objects, one per line of the student's working, each with: text, verdict ('correct'|'error'|'method'), comment (max ~12 words)), overallScore (string like '3/4 marks'), studentFeedback (2-3 encouraging sentences aimed at the student), parentFeedback (2-3 sentences, professional teacher-to-parent tone, no jargon, naming a specific focus area), coachingMessage (1-2 sentences that speak to the TREND across recent attempts on this topic, not just this one question - e.g. noting a repeated error pattern, an improvement, or a new milestone; if there's no history yet, give a short first-attempt encouragement instead).`;
    const historyNote = history && history.trim()
      ? `\nStudent's recent history on this topic (use this for the coachingMessage):\n${history}`
      : '\nNo recent history on this topic yet - this is their first attempt.';
    // workedSolution is an array of { text, diagram } step objects (see
    // /api/generate-question) - only the text is relevant as marking
    // context, diagrams aren't needed here. Falls back gracefully if it
    // ever arrives as a plain string instead.
    const workedSolutionText = Array.isArray(workedSolution)
      ? workedSolution.map((step) => step.text).join('\n')
      : (workedSolution || '');
    const userText =
      `Question: ${question}\nModel worked solution (reference only, do not reveal verbatim to student): ${workedSolutionText}\nKey marking points: ${keyMarkingPoints}\nStudent's working (one attempted step per line):\n${studentWorking}${historyNote}`;

    const result = await callClaude({ system, userText, expectJson: true });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'mark-working');
    return Response.json(result);
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
