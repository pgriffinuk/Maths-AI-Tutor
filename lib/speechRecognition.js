// Thin wrapper around the browser's built-in Web Speech API for voice
// input (SpeechRecognition / webkitSpeechRecognition - speech-to-text).
// This is a different part of the Web Speech API from lib/speech.js, which
// wraps speechSynthesis (text-to-speech, used for read-aloud) - the two
// APIs are unrelated and this file has no overlap with that one.

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Returns a { start, stop } handle, or null if unsupported. onResult is
// called with the full transcript recognised so far (interim + final)
// each time it updates, so a caller can just set its input field to it
// directly. Recognition stops on its own once the browser detects a pause
// in speech (continuous: false), or when stop() is called explicitly -
// either way onEnd fires so the caller can drop its "listening" state.
export function createSpeechRecognizer({ onResult, onEnd }) {
  if (!isSpeechRecognitionSupported()) return null;
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionImpl();
  recognition.lang = 'en-GB';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    onResult(transcript);
  };
  recognition.onend = () => onEnd && onEnd();
  recognition.onerror = () => onEnd && onEnd();

  recognition.start();
  return {
    stop: () => recognition.stop()
  };
}
