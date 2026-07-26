import { claudeErrorResponse } from '../../../lib/claude';
import { markQuestion } from '../../../lib/marking';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';

// Same retry/timeout architecture as every other AI route - explicit
// maxDuration so a worst-case double-timeout retry always has room to
// finish and return a clean error response instead of Vercel's own
// function-duration limit killing it first.
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { question, workedSolution, keyMarkingPoints, studentWorking, history, course, board, difficulty, accessToken } = await req.json();

    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });

    const result = await markQuestion({ question, workedSolution, keyMarkingPoints, studentWorking, history, course, board, difficulty });
    await recordApiUsage(rateCheck.supabase, rateCheck.userId, 'mark-working');
    return Response.json(result);
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
