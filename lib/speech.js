// Thin wrapper around the browser's built-in Web Speech API
// (window.speechSynthesis) - no external service, client-side only. Shared
// by SpeakButton (manual read-aloud clicks) and the dashboard's auto-read
// effects, so there's one place that owns "cancel anything already playing
// before starting the next utterance."

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

// Speaks `text`, cancelling any utterance already in progress first so only
// one ever plays at a time. onEnd fires both when speech finishes naturally
// and when it's interrupted (cancelled, or errors out) so callers can reset
// UI state either way.
export function speak(text, { onStart, onEnd } = {}) {
  if (!isSpeechSupported() || !text) return null;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onstart = () => onStart && onStart();
  utterance.onend = () => onEnd && onEnd();
  utterance.onerror = () => onEnd && onEnd();
  window.speechSynthesis.speak(utterance);
  return utterance;
}
