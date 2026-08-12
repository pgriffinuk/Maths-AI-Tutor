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

// Symbol-for-word swaps for toSpeechText's step 4. Case-sensitive, whole
// (single-character) symbol matches - no ambiguity since each is a distinct
// Unicode character rather than something that could appear as a substring
// of other text.
const SYMBOL_WORDS = {
  '×': 'times',
  '÷': 'divided by',
  '±': 'plus or minus',
  '≤': 'less than or equal to',
  '≥': 'greater than or equal to',
  '≠': 'not equal to',
  '°': ' degrees',
  'π': 'pi',
  'θ': 'theta',
  '∞': 'infinity',
  '∑': 'the sum of',
  '∫': 'the integral of'
};
const SYMBOL_PATTERN = new RegExp(Object.keys(SYMBOL_WORDS).join('|'), 'g');

// Backslash-prefixed LaTeX macros -> words. Longer names first within each
// alternation isn't needed here since split()/join() below matches each
// one independently, but \le/\leq (and \ge/\geq, \ne/\neq) do need the
// longer form checked first or "\le" would eat the front of "\leq" and
// leave a stray "q" behind.
const LATEX_MACRO_WORDS = [
  ['\\times', 'times'],
  ['\\cdot', 'times'],
  ['\\div', 'divided by'],
  ['\\pm', 'plus or minus'],
  ['\\leq', 'less than or equal to'],
  ['\\le', 'less than or equal to'],
  ['\\geq', 'greater than or equal to'],
  ['\\ge', 'greater than or equal to'],
  ['\\neq', 'not equal to'],
  ['\\ne', 'not equal to'],
  ['\\pi', 'pi'],
  ['\\theta', 'theta'],
  ['\\infty', 'infinity'],
  ['\\degree', 'degrees']
];

// Unwraps $...$/$$...$$ KaTeX delimiters and converts the real LaTeX the
// chat routes now ask the AI to write inside them (see lib/socraticTutor.js
// and app/components/MathText.js) into words - the plain-notation handling
// further down in toSpeechText predates LaTeX delimiters and only
// understands shorthand like "x^2" or "sqrt(x)", not "\frac{a}{b}" or
// "\theta". Runs first so its output (plain words, or unwrapped shorthand
// like "x^2") still gets picked up by the existing steps below.
function convertLatexToSpeech(text) {
  let result = text;

  // The delimiters are just markers for KaTeX, never meant to be spoken.
  result = result.replace(/\$\$?/g, '');

  // \frac{a}{b} -> "a over b". Every fraction these routes generate is a
  // single, unnested {..}{..} pair, so one non-greedy pass is enough.
  result = result.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 over $2');

  // \sqrt{x} / \sqrt x -> "the square root of x".
  result = result.replace(/\\sqrt\{([^{}]+)\}/g, 'the square root of $1');
  result = result.replace(/\\sqrt(\w+)/g, 'the square root of $1');

  for (const [macro, word] of LATEX_MACRO_WORDS) {
    result = result.split(macro).join(word);
  }

  // ^{12} / _{n} -> unwrap the braces so the plain "x^12"/"x_n" handling
  // below (or a simple "sub n" reading for subscripts) can take it from
  // here, rather than reading the braces themselves aloud.
  result = result.replace(/\^\{(-?\w+)\}/g, '^$1');
  result = result.replace(/_\{(\w+)\}/g, ' sub $1');
  result = result.replace(/_(\w)/g, ' sub $1');

  // Any leftover LaTeX grouping braces are structural, not spoken.
  result = result.replace(/[{}]/g, '');

  return result;
}

// Converts common maths notation into words a speech synth voice reads
// naturally - e.g. "3/4" becomes "3 over 4", "x^2" becomes "x squared" -
// instead of it spelling out or skipping the raw symbols. Kept as a pure
// string transform (no DOM/speechSynthesis dependency) so it's easy to unit
// test and extend on its own; speak() below calls it on every utterance so
// SpeakButton and the dashboard's auto-read both get it for free without
// either needing to know it exists.
export function toSpeechText(text) {
  if (!text) return text;
  let result = convertLatexToSpeech(text);

  // 1. Square roots - sqrt(x) / √(x), or sqrt x / √x without brackets. Runs
  // first so whatever's inside gets a chance to go through the later steps
  // (e.g. "sqrt(x^2)") rather than being frozen as raw symbols.
  result = result.replace(/√\s*\(([^)]+)\)/g, 'the square root of $1');
  result = result.replace(/sqrt\s*\(([^)]+)\)/gi, 'the square root of $1');
  result = result.replace(/√\s*([a-zA-Z0-9.]+)/g, 'the square root of $1');
  result = result.replace(/sqrt\s*([a-zA-Z0-9.]+)/gi, 'the square root of $1');

  // 2. Exponents - x^2 -> "x squared", x^3 -> "x cubed", x^n -> "x to the
  // power of n". Also runs before the general symbol pass since it needs
  // the raw "^" character to still be there to spot.
  result = result.replace(/([a-zA-Z0-9)\]]+)\^(-?\w+)/g, (match, base, exp) => {
    if (exp === '2') return `${base} squared`;
    if (exp === '3') return `${base} cubed`;
    return `${base} to the power of ${exp}`;
  });

  // 3. Simple numeric fractions - "3/4" -> "3 over 4". Only matches when
  // both sides are plain numbers, and only when neither side is itself
  // flanked by another digit or slash, so this doesn't fire on a piece of a
  // date (25/12/2026) or a URL/path segment.
  result = result.replace(/(?<![\d/])(\d+)\/(\d+)(?![\d/])/g, '$1 over $2');

  // 4. Symbol replacements (case-sensitive, whole-symbol matches).
  result = result.replace(SYMBOL_PATTERN, (match) => SYMBOL_WORDS[match]);

  // 5. A lone "*" used as multiplication (flanked by a digit or whitespace
  // on each side) -> "times". Excludes markdown emphasis (**bold** or
  // *italic*), which is never flanked by digits/whitespace on both sides.
  result = result.replace(/(?<!\*)(?<=[\d\s])\*(?!\*)(?=[\d\s])/g, ' times ');

  // Tidy up any doubled-up spacing the replacements above introduced.
  return result.replace(/ {2,}/g, ' ');
}

// Speaks `text`, cancelling any utterance already in progress first so only
// one ever plays at a time. onEnd fires both when speech finishes naturally
// and when it's interrupted (cancelled, or errors out) so callers can reset
// UI state either way.
export function speak(text, { onStart, onEnd } = {}) {
  if (!isSpeechSupported() || !text) return null;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(toSpeechText(text));
  utterance.onstart = () => onStart && onStart();
  utterance.onend = () => onEnd && onEnd();
  utterance.onerror = () => onEnd && onEnd();
  window.speechSynthesis.speak(utterance);
  return utterance;
}
