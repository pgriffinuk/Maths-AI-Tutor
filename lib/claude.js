// Server-side only. Never import this file from a client component -
// it uses the secret ANTHROPIC_API_KEY, which must never reach the browser.
// Course/board/difficulty data lives in lib/levels.js (no secrets, safe for
// client components) and is re-exported here for the API routes' convenience.

export { COURSES, EXAM_BOARDS, SPEC_CODES, DIFFICULTY_LEVELS, BOARD_COURSES, getLevelContext } from './levels';

// Max AI-marking API calls (generate-question, mark-working, hint, chat
// combined) a single student can make in a rolling 24 hours. Set high enough
// to cover one full /diagnostic run on the largest course (A Level Pure: 13
// topics x up to 6 calls each = 78) plus a normal day of practice on top.
export const DAILY_CALL_LIMIT = 120;

// Worst case for a single fetchClaudeResponse() call (one retry on
// network/timeout/5xx) is REQUEST_TIMEOUT_MS*2 + RETRY_DELAY_MS - kept
// comfortably under the 60s maxDuration set on every AI route, so a
// double-timeout is handled by our own try/catch and returned as a clean
// response instead of Vercel killing the function first (which can't be
// caught no matter how careful the JS-level error handling is).
const REQUEST_TIMEOUT_MS = 25000;
const RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_TOKENS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function claudeError(message, code) {
  return Object.assign(new Error(message), { code });
}

// A hung connection throws AbortError (our own timeout); anything else fetch
// throws (DNS failure, connection refused, offline, etc.) is a network
// failure - distinguish the two so the client can show an accurate message.
function classifyFetchFailure(err) {
  if (err.name === 'AbortError') {
    return claudeError('The AI provider took too long to respond.', 'timeout');
  }
  return claudeError('Could not reach the AI provider.', 'network');
}

async function requestOnce({ system, userText, maxTokens }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userText }]
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fetches a response from Anthropic, retrying once (after a short delay) on
// a network/timeout failure or a 429/5xx from Anthropic itself - a single
// retry covers the vast majority of transient blips without leaving the
// user waiting indefinitely. Throws a classified error (see claudeError
// above) once both attempts are exhausted.
async function fetchClaudeResponse({ system, userText, maxTokens }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await requestOnce({ system, userText, maxTokens });
    } catch (err) {
      if (attempt === 0) { await sleep(RETRY_DELAY_MS); continue; }
      throw classifyFetchFailure(err);
    }

    if (response.ok) return response;

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt === 0) { await sleep(RETRY_DELAY_MS); continue; }

    const errText = await response.text();
    if (response.status === 429) {
      throw claudeError(`Anthropic rate limit (429): ${errText}`, 'anthropic_rate_limit');
    }
    throw claudeError(`Claude API error (${response.status}): ${errText}`, 'server_error');
  }
  // Unreachable - the loop above always returns or throws - but keeps the
  // function's return type honest for any future refactor.
  throw claudeError('Could not reach the AI provider.', 'network');
}

async function extractCompletionText(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw claudeError('The AI returned a response in an unexpected format.', 'invalid_response');
  }
  return (data.content || []).map((b) => b.text || '').join('\n').trim();
}

// Turns a classified error from callClaude (or anything else an API route's
// try block throws) into a { body, status } pair the route can hand to
// Response.json - kept here so all four AI routes map error codes to HTTP
// statuses the same way instead of repeating the logic four times.
export function claudeErrorResponse(err) {
  const code = err.code || 'unknown';
  const status = {
    anthropic_rate_limit: 429,
    timeout: 504,
    network: 502,
    invalid_response: 502
  }[code] || 500;
  return { body: { error: String(err.message || err), code }, status };
}

// maxTokens defaults to DEFAULT_MAX_TOKENS (1000), which is plenty for the
// compact JSON these routes normally return (per-line marking verdicts, a
// short hint, a chat reply). Callers whose expected output is much richer -
// generate-question and generate-primer's step-based workedSolution, which
// can include several full SVG diagrams - should pass a higher value, since
// otherwise a real response gets silently truncated mid-JSON, which then
// fails to parse and forces a full extra retry (slower, and closer to
// hitting the platform's own function-duration limit) for something a
// bigger token budget would have avoided in the first place.
export async function callClaude({ system, userText, expectJson, maxTokens = DEFAULT_MAX_TOKENS }) {
  // Two attempts total: a fresh generation is often clean JSON even when the
  // first one wasn't, so a full retry (not just a re-parse) is worthwhile.
  for (let parseAttempt = 0; parseAttempt < 2; parseAttempt++) {
    const response = await fetchClaudeResponse({ system, userText, maxTokens });
    const text = await extractCompletionText(response);

    if (!expectJson) return text;

    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      if (parseAttempt === 0) continue;
      throw claudeError('The AI returned a response in an unexpected format.', 'invalid_response');
    }
  }
}
