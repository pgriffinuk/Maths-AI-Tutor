import { callClaude, getLevelContext, claudeErrorResponse } from '../../../lib/claude';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

// Same retry/timeout architecture as every other AI route - explicit
// maxDuration so a worst-case double-timeout retry always has room to
// finish and return a clean error response instead of Vercel's own
// function-duration limit killing it first.
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { question, studentWorking, markingResult, topic, history, message, course, board, difficulty, accessToken } = await req.json();

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    const { courseInfo, boardInfo, difficultyInfo, specCode, furtherMathsNote } = getLevelContext(course, board, difficulty);
    // This route now serves two callers: the post-marking "ask about it"
    // thread (always has a question + markingResult) and the general
    // floating chat launcher, reachable any time and often with neither -
    // the system prompt and context below adapt to whichever applies
    // rather than assuming a just-marked result always exists.
    const system = question
      ? `You are a warm, patient maths tutor for ${boardInfo.label} (${specCode}). ${courseInfo.levelDescription} This question was set at the following difficulty: ${difficultyInfo.promptHint}${furtherMathsNote} The student has an active question in front of them (and may have just received marked feedback on it) and is asking a follow-up - explain in plain English, use small worked examples if helpful, and check for understanding rather than lecturing. Keep replies fairly short (a few sentences) unless a fuller explanation is clearly needed. Do not just repeat any feedback already given verbatim - actually explain the underlying idea. Return plain text, not JSON.`
      : `You are a warm, patient maths tutor for ${boardInfo.label} (${specCode}). ${courseInfo.levelDescription}${furtherMathsNote} The student is asking a general question${topic ? ` about "${topic}"` : ''}, not tied to any specific question currently in front of them - explain in plain English, use small worked examples if helpful, and check for understanding rather than lecturing. Keep replies fairly short (a few sentences) unless a fuller explanation is clearly needed. Return plain text, not JSON.`;

    const contextLines = [];
    if (question) contextLines.push(`Original question: ${question}`);
    if (studentWorking) contextLines.push(`Student's working so far:\n${studentWorking}`);
    if (markingResult) contextLines.push(`Marking result: ${JSON.stringify(markingResult)}`);
    if (!question && topic) contextLines.push(`Topic: ${topic}`);
    contextLines.push(`Conversation so far:\n${(history || []).map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')}`);
    contextLines.push(`Student's new message: ${message}`);
    const context = contextLines.join('\n\n');

    const reply = await callClaude({ system, userText: context, expectJson: false });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'chat');
    return Response.json({ reply });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
