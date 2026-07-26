import { callClaude, claudeErrorResponse } from '../../../lib/claude';
import { markQuestion, notAttemptedResult, scorePercentFromResults } from '../../../lib/marking';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

// Marks every question in a Mock Exam paper in one request. Per-question
// marking runs in parallel (see Promise.all below) rather than one at a
// time, so a 15-question paper doesn't take 15x as long as a single
// mark-working call - but even in parallel, a single slow/retried Claude
// call can still take close to its own worst case (see lib/claude.js's
// REQUEST_TIMEOUT_MS) before the final whole-paper coaching call even
// starts, so this gets a much more generous maxDuration than a normal
// single-question route.
export const maxDuration = 120;

export async function POST(req) {
  try {
    const { board, course, difficulty, answers, accessToken } = await req.json();
    if (!Array.isArray(answers) || answers.length === 0) {
      return Response.json({ error: 'No answers to mark.' }, { status: 400 });
    }

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    // Blank (not-attempted) answers are scored locally with no AI call -
    // there's no working to mark, so nothing worth asking Claude about.
    const perQuestionResults = await Promise.all(answers.map(async (a) => {
      const hasAttempt = !!(a.studentWorking && a.studentWorking.trim());
      const markingResult = hasAttempt
        ? await markQuestion({
            question: a.question,
            workedSolution: a.workedSolution,
            keyMarkingPoints: a.keyMarkingPoints,
            studentWorking: a.studentWorking,
            course,
            board,
            difficulty
          })
        : notAttemptedResult();
      if (hasAttempt) await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'mark-mock-exam');
      return { topic: a.topic, question: a.question, ...markingResult };
    }));

    const overallScorePercent = scorePercentFromResults(perQuestionResults);

    // One more call summarising the whole paper - deliberately NOT a
    // concatenation of the per-question studentFeedback strings, which
    // would just repeat what's already shown per-question. This asks for a
    // single view across every result: which topics held up, which didn't,
    // and a grade-boundary-style sense of overall performance.
    const summaryLines = perQuestionResults
      .map((r, i) => `Q${i + 1} (topic: ${r.topic}): ${r.overallScore}${(r.lines || []).some((l) => l.verdict === 'error') ? ', had errors' : ''}`)
      .join('\n');
    const overallSystem =
      'You are an experienced maths teacher who has just finished marking a full mock exam paper, question by question. Given the overall percent score and a per-question summary, write ONE overall coaching message for the student covering the whole paper. Return ONLY valid JSON, no markdown fences, with exactly this field: overallCoachingMessage (2-3 sentences - identify which topics were strongest and which need work, and give a grade-boundary-style sense of overall performance; do not just restate individual question feedback).';
    const overallUserText = `Overall score: ${overallScorePercent}%\n\n${summaryLines}`;
    const { overallCoachingMessage } = await callClaude({ system: overallSystem, userText: overallUserText, expectJson: true });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'mark-mock-exam');

    return Response.json({ perQuestionResults, overallScorePercent, overallCoachingMessage });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
