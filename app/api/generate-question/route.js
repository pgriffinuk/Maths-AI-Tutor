import { callClaude } from '../../../lib/claude';

export async function POST(req) {
  try {
    const { topic } = await req.json();

    const system =
      "You write single exam-style maths questions for Edexcel IGCSE Foundation tier students (age 14-16, grades 1-5 target). Foundation tier means no algebraic fractions, no calculus, no higher-tier trigonometry (SOHCAHTOA only, no sine/cosine rule), numbers should be manageable without a calculator unless stated. Return ONLY valid JSON, no markdown fences, no preamble, with exactly these fields: question (string), workedSolution (string, step-by-step correct solution in the same line-by-line style a student would write), keyMarkingPoints (string, 2-4 short bullet-style points describing what a marker should check for).";
    const userText = `Topic: ${topic}. Write one Foundation-tier question of medium difficulty (worth roughly 3-4 marks).`;

    const result = await callClaude({ system, userText, expectJson: true });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
