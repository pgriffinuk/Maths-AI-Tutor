import { callClaude, getLevelContext, claudeErrorResponse } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

// Same retry/timeout architecture as every other AI route - explicit
// maxDuration so a worst-case double-timeout retry always has room to
// finish and return a clean error response instead of Vercel's own
// function-duration limit killing it first.
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { question, studentWorking, markingResult, history, message, course, board, difficulty, accessToken } = await req.json();

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    const { courseInfo, boardInfo, difficultyInfo, specCode, furtherMathsNote } = getLevelContext(course, board, difficulty);
    const system =
      `You are a warm, patient maths tutor for ${boardInfo.label} (${specCode}). ${courseInfo.levelDescription} This question was set at the following difficulty: ${difficultyInfo.promptHint}${furtherMathsNote} The student has just received marked feedback on a question and is asking follow-up questions to understand it better - explain in plain English, use small worked examples if helpful, and check for understanding rather than lecturing. Keep replies fairly short (a few sentences) unless a fuller explanation is clearly needed. Do not just repeat the original feedback verbatim - actually explain the underlying idea. Return plain text, not JSON.`;

    const context =
      `Original question: ${question}\nStudent's working:\n${studentWorking}\n` +
      `Marking result: ${JSON.stringify(markingResult)}\n\n` +
      `Conversation so far:\n${(history || []).map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')}\n` +
      `Student's new message: ${message}`;

    const reply = await callClaude({ system, userText: context, expectJson: false });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'chat');
    return Response.json({ reply });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
