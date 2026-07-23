import { callClaude } from '../../../lib/claude';

export async function POST(req) {
  try {
    const { question, studentWorking } = await req.json();

    const system =
      "You are a supportive Foundation-tier IGCSE maths tutor giving a Socratic hint. NEVER give the final answer or the next full step. Give one short nudge (max 2 sentences) that helps the student see what to do next. Keep it encouraging and plain-English. Return plain text, not JSON.";
    const userText = `Question: ${question}\nStudent's working so far (may be blank):\n${studentWorking || '(nothing written yet)'}\nGive one hint.`;

    const hint = await callClaude({ system, userText, expectJson: false });
    return Response.json({ hint });
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
