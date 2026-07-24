import { callClaude, COURSES } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

export async function POST(req) {
  try {
    const { question, studentWorking, course, accessToken } = await req.json();

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });

    const courseInfo = COURSES.find((c) => c.key === course) || COURSES[0];
    const system =
      `You are a supportive maths tutor for the following level: ${courseInfo.levelDescription} Give a Socratic hint. NEVER give the final answer or the next full step. Give one short nudge (max 2 sentences) that helps the student see what to do next. Keep it encouraging and plain-English. Return plain text, not JSON.`;
    const userText = `Question: ${question}\nStudent's working so far (may be blank):\n${studentWorking || '(nothing written yet)'}\nGive one hint.`;

    const hint = await callClaude({ system, userText, expectJson: false });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'hint');
    return Response.json({ hint });
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
