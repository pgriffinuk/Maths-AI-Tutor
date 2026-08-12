// Thin wrapper around the browser's built-in Web Speech API
// (window.speechSynthesis) - no external service, client-side only. Shared
// by SpeakButton (manual read-aloud clicks) and the dashboard's auto-read
// effects, so there's one place that owns "cancel anything already playing
// before starting the next utterance."
import { splitMessageIntoSentences, flattenSentences } from './messageSentences';

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

// How long to wait after speech genuinely starts before giving up on this
// browser/voice ever firing a 'boundary' event - some combinations
// (notably several mobile/OS voices) never fire one at all, and sentence
// highlighting should just silently do nothing there rather than leave
// callers waiting forever for a callback that's never coming.
const BOUNDARY_FALLBACK_MS = 900;

// Builds the actual spoken text as the concatenation of each sentence's
// own toSpeechText() output, rather than running toSpeechText() once over
// the whole message - this way the char-offset range for each sentence
// within the spoken text is exactly known (it's just where we placed it
// while joining), instead of having to reverse-engineer offsets out of a
// single whole-text transform. toSpeechText()'s replacements are all
// local (no cross-sentence lookaround), so this produces the same spoken
// audio either way.
function buildSpokenTextWithRanges(text) {
  const { blocks } = splitMessageIntoSentences(text);
  const sentences = flattenSentences({ blocks });
  const ranges = [];
  let cursor = 0;
  const parts = sentences.map((sentence, i) => {
    const spoken = toSpeechText(sentence.text) || '';
    const start = cursor;
    const end = start + spoken.length;
    ranges.push({ start, end, sentenceIndex: sentence.index });
    cursor = end + 1; // +1 for the joining space below
    return spoken;
  });
  return { spokenText: parts.join(' '), ranges };
}

// Speaks `text`, cancelling any utterance already in progress first so only
// one ever plays at a time. onEnd fires both when speech finishes naturally
// and when it's interrupted (cancelled, or errors out) so callers can reset
// UI state either way.
//
// onSentenceBoundary(sentenceIndex | null), if provided, is called as
// speech reaches each sentence (see lib/messageSentences.js for what a
// "sentence index" means here) and with null when speech ends or is
// stopped. This is entirely best-effort: if sentence splitting finds
// nothing usable, or this browser/voice never fires a 'boundary' event
// (detected via BOUNDARY_FALLBACK_MS above), it's simply never called
// again for this utterance - speech itself always still plays normally.
export function speak(text, { onStart, onEnd, onSentenceBoundary } = {}) {
  if (!isSpeechSupported() || !text) return null;
  window.speechSynthesis.cancel();

  let spokenText = '';
  let ranges = [];
  try {
    const built = buildSpokenTextWithRanges(text);
    spokenText = built.spokenText;
    ranges = built.ranges;
  } catch (err) {
    // Sentence splitting is a pure enhancement - if it ever throws for an
    // unforeseen input shape, fall back to the previous whole-text
    // behaviour rather than losing speech entirely.
    spokenText = '';
    ranges = [];
  }
  if (!spokenText) spokenText = toSpeechText(text);

  const utterance = new SpeechSynthesisUtterance(spokenText);
  let lastReportedIndex = null;
  let boundaryTimer = null;

  function reportSentence(index) {
    if (!onSentenceBoundary || index === lastReportedIndex) return;
    lastReportedIndex = index;
    onSentenceBoundary(index);
  }

  if (onSentenceBoundary && ranges.length > 0) {
    utterance.onboundary = (e) => {
      if (boundaryTimer) { clearTimeout(boundaryTimer); boundaryTimer = null; }
      if (typeof e.charIndex !== 'number') return;
      const match = ranges.find((r) => e.charIndex >= r.start && e.charIndex < r.end);
      if (match) reportSentence(match.sentenceIndex);
    };
  }

  utterance.onstart = () => {
    if (onStart) onStart();
    if (onSentenceBoundary && ranges.length > 0) {
      boundaryTimer = setTimeout(() => {
        boundaryTimer = null;
        // No 'boundary' event within a reasonable time of speech starting
        // - this browser/voice doesn't support it reliably. Stop trying
        // rather than leaving a dangling listener that never fires.
        utterance.onboundary = null;
      }, BOUNDARY_FALLBACK_MS);
    }
  };
  utterance.onend = () => {
    if (boundaryTimer) clearTimeout(boundaryTimer);
    reportSentence(null);
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    if (boundaryTimer) clearTimeout(boundaryTimer);
    reportSentence(null);
    if (onEnd) onEnd();
  };
  window.speechSynthesis.speak(utterance);
  return utterance;
}
