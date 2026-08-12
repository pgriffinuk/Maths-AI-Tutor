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
