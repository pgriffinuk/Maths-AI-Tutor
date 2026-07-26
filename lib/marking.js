// Server-side only (imports callClaude, which uses the secret
// ANTHROPIC_API_KEY). Shared marking logic used by both /api/mark-working
// (one question, marked immediately during live practice) and
// /api/mark-mock-exam (a whole paper marked together at the end) - same
// prompt and result shape either way, just invoked at a different point in
// each flow.

import { callClaude } from './claude';
import { getLevelContext } from './levels';

export async function markQuestion({ question, workedSolution, keyMarkingPoints, studentWorking, history, course, board, difficulty }) {
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

  return callClaude({ system, userText, expectJson: true });
}

// A question the student never got to (ran out of time in a Mock Exam) -
// synthesized locally, no AI call, since there's no working to mark. Scored
// as fully incorrect for the paper's overallScorePercent (see
// scorePercentFromResults below), but worded as "not attempted" everywhere,
// never as "wrong" - a real exam blank isn't a demonstrated misunderstanding.
export function notAttemptedResult() {
  return {
    lines: [{ text: '(No working submitted)', verdict: 'error', comment: 'Not attempted' }],
    overallScore: 'Not attempted',
    studentFeedback: "You didn't get to this one before time was up - that's a pacing thing, not a sign you don't know it. Worth a look in regular practice.",
    parentFeedback: "This question wasn't reached before time ran out, most likely a pacing issue rather than a gap in understanding.",
    coachingMessage: ''
  };
}

// Each marked line contributes 1 (correct), 0.5 (method credit) or 0
// (error/not attempted) - a Mock Exam's overallScorePercent is the credit
// earned over all lines across every question in the paper, not a parse of
// each question's free-text overallScore string (deliberately informal,
// e.g. "3/4 marks", and not uniform enough to sum reliably across
// differently-sized questions).
export function scorePercentFromResults(results) {
  const allLines = results.flatMap((r) => r.lines || []);
  if (allLines.length === 0) return 0;
  const earned = allLines.reduce((sum, l) => sum + (l.verdict === 'correct' ? 1 : l.verdict === 'method' ? 0.5 : 0), 0);
  return Math.round((earned / allLines.length) * 100);
}
