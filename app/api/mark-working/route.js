import { callClaude } from '../../../lib/claude';

export async function POST(req) {
  try {
    const { question, workedSolution, keyMarkingPoints, studentWorking } = await req.json();

    const system =
      "You are an experienced Edexcel IGCSE Foundation maths teacher marking a student's handwritten working, line by line, the way a teacher marks homework in a book (ticks, crosses, and short margin comments). Be encouraging but honest and specific about errors. Return ONLY valid JSON, no markdown fences, with exactly these fields: lines (array of objects, one per line of the student's working, each with: text, verdict ('correct'|'error'|'method'), comment (max ~12 words)), overallScore (string like '3/4 marks'), studentFeedback (2-3 encouraging sentences aimed at the student), parentFeedback (2-3 sentences, professional teacher-to-parent tone, no jargon, naming a specific focus area).";
    const userText =
      `Question: ${question}\nModel worked solution (reference only, do not reveal verbatim to student): ${workedSolution}\nKey marking points: ${keyMarkingPoints}\nStudent's working (one attempted step per line):\n${studentWorking}`;

    const result = await callClaude({ system, userText, expectJson: true });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
