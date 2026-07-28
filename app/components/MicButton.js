'use client';
import { useEffect, useRef, useState } from 'react';
import { isSpeechRecognitionSupported, createSpeechRecognizer } from '../../lib/speechRecognition';

// Voice input for composing a chat message - transcribes speech straight
// into the caller's text input via onResult, using the browser's built-in
// SpeechRecognition (not SpeechSynthesis - that's SpeakButton, for
// read-aloud). Hidden entirely when the browser doesn't support it, same
// "check on mount, render null" pattern as SpeakButton.
export default function MicButton({ onResult, disabled }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef(null);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  // Stop any in-flight recognition if the component unmounts mid-listen.
  useEffect(() => {
    return () => recognizerRef.current?.stop();
  }, []);

  if (!supported) return null;

  function handleClick() {
    if (listening) {
      recognizerRef.current?.stop();
      return;
    }
    const recognizer = createSpeechRecognizer({
      onResult,
      onEnd: () => { setListening(false); recognizerRef.current = null; }
    });
    if (!recognizer) return;
    recognizerRef.current = recognizer;
    setListening(true);
  }

  return (
    <button
      type="button"
      className={`icon-btn mic-btn${listening ? ' listening' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={listening ? 'Stop voice input' : 'Speak your message'}
      title={listening ? 'Stop voice input' : 'Speak your message'}
    >
      {listening ? (
        <span className="mic-dot" aria-hidden="true" />
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )}
    </button>
  );
}
