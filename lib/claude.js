// Server-side only. Never import this file from a client component -
// it uses the secret ANTHROPIC_API_KEY, which must never reach the browser.
// Course/board/difficulty data lives in lib/levels.js (no secrets, safe for
// client components) and is re-exported here for the API routes' convenience.

export { COURSES, EXAM_BOARDS, SPEC_CODES, DIFFICULTY_LEVELS, getLevelContext } from './levels';

// Max AI-marking API calls (generate-question, mark-working, hint, chat
// combined) a single student can make in a rolling 24 hours.
export const DAILY_CALL_LIMIT = 40;

export async function callClaude({ system, userText, expectJson }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: userText }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = (data.content || []).map((b) => b.text || '').join('\n').trim();

  if (expectJson) {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
  return text;
}
