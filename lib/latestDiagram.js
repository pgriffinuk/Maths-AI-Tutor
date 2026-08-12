// Finds the most recent diagram to show in the persistent DiagramPanel -
// the last message that actually included one, scanning from the end
// since only the newest diagram is ever shown (see
// app/components/DiagramPanel.js). Only assistant chat replies ever set
// a diagram field, so no role/kind check is needed here.
export function getLatestDiagram(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].diagram) return messages[i].diagram;
  }
  return null;
}

// Resolves which SVG element (if any) should be highlighted in the
// DiagramPanel right now, from the message currently being read aloud
// (activeMessage), the sentence speech has reached within it
// (activeSentenceIndex), and whatever diagram the panel is actually
// showing (latestDiagram, from getLatestDiagram above). Deliberately only
// returns an id when activeMessage's OWN diagram is the one currently
// displayed - a message being replayed after the panel has since moved on
// to a newer diagram (or one with no diagram of its own at all) should
// never highlight a region on the wrong diagram. Every step here is
// defensive: a missing/malformed highlightMap, an out-of-range
// sentenceIndex, or no match at all all just fall through to null, never
// throw.
export function resolveHighlightedElementId(activeMessage, activeSentenceIndex, latestDiagram) {
  if (!activeMessage || !activeMessage.diagram || activeMessage.diagram !== latestDiagram) return null;
  if (!Array.isArray(activeMessage.highlightMap)) return null;
  const entry = activeMessage.highlightMap.find((h) => h && h.sentenceIndex === activeSentenceIndex);
  return (entry && entry.elementId) || null;
}
