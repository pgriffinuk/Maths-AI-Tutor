import { callClaude } from '../../../lib/claude';

export async function POST(req) {
  try {
    const { question, workedSolution, keyMarkingPoints, studentWorking, history } = await req.json();

    const system =
      "You are an experienced Edexcel IGCSE Foundation maths teacher marking a student's handwritten working, line by line, the way a teacher marks homework in a book (ticks, crosses, and short margin comments). Be encouraging but honest and specific about errors. Return ONLY valid JSON, no markdown fences, with exactly these fields: lines (array of objects, one per line of the student's working, each with: text, verdict ('correct'|'error'|'method'), comment (max ~12 words)), overallScore (string like '3/4 marks'), studentFeedback (2-3 encouraging sentences aimed at the student), parentFeedback (2-3 sentences, professional teacher-to-parent tone, no jargon, naming a specific focus area), coachingMessage (1-2 sentences that speak to the TREND across recent attempts on this topic, not just this one question - e.g. noting a repeated error pattern, an improvement, or a new milestone; if there's no history yet, give a short first-attempt encouragement instead).";
    const historyNote = history && history.trim()
      ? `\nStudent's recent history on this topic (use this for the coachingMessage):\n${history}`
      : '\nNo recent history on this topic yet - this is their first attempt.';
    const userText =
      `Question: ${question}\nModel worked solution (reference only, do not reveal verbatim to student): ${workedSolution}\nKey marking points: ${keyMarkingPoints}\nStudent's working (one attempted step per line):\n${studentWorking}${historyNote}`;

    const result = await callClaude({ system, userText, expectJson: true });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
