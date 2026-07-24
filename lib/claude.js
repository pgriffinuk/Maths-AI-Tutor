// Server-side only. Never import this file from a client component -
// it uses the secret ANTHROPIC_API_KEY, which must never reach the browser.

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

export const TOPICS = [
  'Fractions (add, subtract, multiply, divide)',
  'Percentages (including percentage change)',
  'Ratio and proportion, including inverse proportion',
  'Solving linear equations, including with brackets and fractions',
  'Angles in parallel lines and polygons',
  'Perimeter, area and volume of standard 2D/3D shapes',
  'Probability, including combined events',
  'Averages and range from lists and frequency tables',
  'Standard form calculations',
  'Sequences, including finding the nth term'
];
