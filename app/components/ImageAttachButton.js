'use client';
import { useRef } from 'react';

// Opens the device's photo/file picker (accept=image/*, capture=environment
// as a hint to prefer the camera on mobile) so a student can photograph a
// homework problem instead of typing it out. Purely triggers file
// selection - the caller decides what to do with the chosen file.
export default function ImageAttachButton({ onSelect, disabled }) {
  const inputRef = useRef(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          e.target.value = ''; // allow picking the same file again later
          if (file) onSelect(file);
        }}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Attach a photo"
        title="Attach a photo"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
    </>
  );
}
