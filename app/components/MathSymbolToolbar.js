'use client';

const SYMBOLS = ['/', '^', '√', 'π', 'θ', '≤', '≥', '≠', '°'];

// A small row of common maths symbols/templates shown above the chat input -
// purely a shortcut for characters that are awkward to type, never the only
// way to compose a message. onMouseDown prevents the input the toolbar sits
// next to from ever losing focus, so its cursor position stays valid for
// the caller's insertAtCursor call in onInsert.
export default function MathSymbolToolbar({ onInsert, disabled }) {
  return (
    <div className="symbol-toolbar">
      {SYMBOLS.map((symbol) => (
        <button
          key={symbol}
          type="button"
          className="symbol-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(symbol)}
          disabled={disabled}
          aria-label={`Insert ${symbol}`}
        >
          {symbol}
        </button>
      ))}
    </div>
  );
}
