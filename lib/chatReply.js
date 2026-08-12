// Normalizes an AI chat-reply payload into the { messages: [{ text,
// diagram, highlightMap }] } shape both /api/chat and /api/anon-chat
// return to their clients - tolerant of the model occasionally drifting
// from the exact requested shape (a bare { text, diagram } object instead
// of a one-item array, a "reply" string field left over from the old
// plain-text response format, "messages" as a bare string, a malformed or
// missing highlightMap, ...). Each of these is still valid parsed JSON, so
// callClaude's own retry-on-invalid-JSON never catches it - this is a
// second, cheaper line of defence against shape drift, alongside the
// raw-text fallback the routes use when the JSON doesn't parse at all.
// Returns null if nothing usable could be found at all.
export function normalizeChatReply(result) {
  if (Array.isArray(result?.messages)) {
    const messages = result.messages.map(normalizeSegment).filter((seg) => seg.text);
    return messages.length > 0 ? { messages } : null;
  }
  if (typeof result?.messages === 'string' && result.messages.trim()) {
    return { messages: [{ text: result.messages, diagram: null, highlightMap: null }] };
  }
  if (typeof result?.text === 'string' && result.text.trim()) {
    return {
      messages: [{
        text: result.text,
        diagram: typeof result.diagram === 'string' ? result.diagram : null,
        highlightMap: normalizeHighlightMap(result.highlightMap)
      }]
    };
  }
  if (typeof result?.reply === 'string' && result.reply.trim()) {
    return { messages: [{ text: result.reply, diagram: null, highlightMap: null }] };
  }
  if (result && typeof result === 'object') {
    const anyString = Object.values(result).find((v) => typeof v === 'string' && v.trim());
    if (anyString) return { messages: [{ text: anyString, diagram: null, highlightMap: null }] };
  }
  return null;
}

function normalizeSegment(seg) {
  if (typeof seg === 'string') return { text: seg, diagram: null, highlightMap: null };
  return {
    text: typeof seg?.text === 'string' ? seg.text : '',
    diagram: typeof seg?.diagram === 'string' ? seg.diagram : null,
    highlightMap: normalizeHighlightMap(seg?.highlightMap)
  };
}

// A message's highlightMap is entirely optional, AI-supplied, and never
// load-bearing - anything that isn't cleanly an array of
// { sentenceIndex: number, elementId: string } entries just becomes null
// (no highlighting for that message) rather than being partially trusted
// or throwing. sentenceIndex/elementId values that turn out not to match
// anything real (a sentence that doesn't exist, an id not present in the
// diagram) are handled defensively later, where they're actually used
// (see app/components/DiagramPanel.js and lib/latestDiagram.js) - this
// pass only checks the shape.
function normalizeHighlightMap(highlightMap) {
  if (!Array.isArray(highlightMap)) return null;
  const cleaned = highlightMap.filter(
    (entry) => entry && typeof entry.sentenceIndex === 'number' && typeof entry.elementId === 'string' && entry.elementId
  );
  return cleaned.length > 0 ? cleaned : null;
}
