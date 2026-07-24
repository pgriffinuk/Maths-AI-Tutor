import { callClaude } from '../../../lib/claude';

export async function POST(req) {
  try {
    const { question, studentWorking, markingResult, history, message } = await req.json();

    const system =
      "You are a warm, patient Edexcel IGCSE Foundation maths tutor. The student has just received marked feedback on a question and is asking follow-up questions to understand it better - explain in plain English, use small worked examples if helpful, and check for understanding rather than lecturing. Keep replies fairly short (a few sentences) unless a fuller explanation is clearly needed. Do not just repeat the original feedback verbatim - actually explain the underlying idea. Return plain text, not JSON.";

    const context =
      `Original question: ${question}\nStudent's working:\n${studentWorking}\n` +
      `Marking result: ${JSON.stringify(markingResult)}\n\n` +
      `Conversation so far:\n${(history || []).map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')}\n` +
      `Student's new message: ${message}`;

    const reply = await callClaude({ system, userText: context, expectJson: false });
    return Response.json({ reply });
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500 });
  }
}
