'use client';
import { useEffect, useState } from 'react';
import { speak, stopSpeaking, isSpeechSupported } from '../../lib/speech';

// onSentenceChange(sentenceIndex | null), if provided, fires as speech
// reaches each sentence in `text` and with null when reading stops or
// finishes - callers use this to sync a text highlight (and, alongside a
// message's highlightMap, a diagram region highlight) to what's currently
// being read. Entirely optional and best-effort: see lib/speech.js for
// how a browser/voice with no reliable 'boundary' event support is
// detected and gracefully skipped, with speech itself unaffected either
// way.
export default function SpeakButton({ text, label, onSentenceChange }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Checked on mount rather than inline so server and first client render
  // match (window/speechSynthesis don't exist during SSR).
  useEffect(() => {
    setSupported(isSpeechSupported());
  }, []);

  if (!supported) return null;

  function handleClick() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      if (onSentenceChange) onSentenceChange(null);
      return;
    }
    setSpeaking(true);
    speak(text, {
      onEnd: () => {
        setSpeaking(false);
        if (onSentenceChange) onSentenceChange(null);
      },
      onSentenceBoundary: onSentenceChange
    });
  }

  const actionLabel = label || 'Read aloud';

  return (
    <button
      type="button"
      className={`speak-btn${speaking ? ' speaking' : ''}`}
      onClick={handleClick}
      disabled={!text}
      aria-label={speaking ? `Stop reading — ${actionLabel}` : actionLabel}
      title={speaking ? 'Stop reading' : actionLabel}
    >
      {speaking ? (
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="3,9 3,15 8,15 13,20 13,4 8,9" fill="currentColor" stroke="none" />
          <path d="M16 8a5 5 0 0 1 0 8" />
          <path d="M19 5a9 9 0 0 1 0 14" />
        </svg>
      )}
    </button>
  );
}
