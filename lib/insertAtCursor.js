// Inserts text at an input element's current cursor position (replacing
// any active selection) rather than always appending to the end - used by
// the maths symbol toolbar so a tapped symbol lands where the student was
// actually about to type, not necessarily last.
export function insertAtCursor(el, value, insertText) {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const newValue = value.slice(0, start) + insertText + value.slice(end);
  const newCursorPos = start + insertText.length;
  return { newValue, newCursorPos };
}
