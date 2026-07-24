import { callClaude } from '../../../lib/claude';

export async function POST(req) {
  try {
    const { topic, history } = await req.json();

    const system =
      "You write single exam-style maths questions for Edexcel IGCSE Foundation tier students (age 14-16, grades 1-5 target). Foundation tier means no algebraic fractions, no calculus, no higher-tier trigonometry (SOHCAHTOA only, no sine/cosine rule), numbers should be manageable without a calculator unless stated. If the student has recent history on this topic, use it to calibrate: repeat a similar difficulty if they're still making the same error, step up if they're consistently correct, and specifically target the kind of error they've been making if one is mentioned. Return ONLY valid JSON, no markdown fences, no preamble, with exactly these fields: question (string), workedSolution (string, step-by-step correct solution in the same line-by-line style a student would write), keyMarkingPoints (string, 2-4 short bullet-style points describing what a marker should check for).";
    const historyNote = history && history.trim()
      ? `\nStudent's recent history on this topic:\n${history}`
      : '\nNo recent history on this topic yet — this is their first attempt.';
    const userText = `Topic: ${topic}. Write one Foundation-tier question of medium difficulty (worth roughly 3-4 marks).${historyNote}`;

    const result = await callClaude({ system, userText, expectJson: true });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
