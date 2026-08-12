// Splits a chat message's raw text (the same markdown-ish text
// app/components/MathText.js renders: $...$/$$...$$ maths, **bold**, "- "
// bullets) into an ordered list of sentences, each carrying a stable
// global index - the same indexing scheme an AI reply's highlightMap
// field refers to (sentenceIndex), and the one lib/speech.js uses to know
// which sentence is currently being read aloud. Kept as one shared module
// so rendering (MathText) and TTS boundary-mapping (speech.js) can never
// silently disagree about where one sentence ends and the next begins.

const MATH_SPAN_REGEX = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

// A math span found in the line is temporarily swapped for
// PLACEHOLDER_PREFIX + its index + PLACEHOLDER_SUFFIX before sentence
// splitting, then restored afterwards - these markers use characters that
// can never legitimately occur in normal chat text, so a restore can
// never misfire against real content (unlike, say, a plain digit
// surrounded by spaces, which a genuine number in the text could match).
const PLACEHOLDER_PREFIX = 'MATH';
const PLACEHOLDER_SUFFIX = '';
const PLACEHOLDER_REGEX = /MATH(\d+)/g;

// Splits one line into sentences: a run of ./!/? followed by whitespace
// and then an uppercase letter, a digit, or the end of the line counts as
// a sentence boundary - deliberately NOT split inside $...$ maths
// (protected via the placeholder swap above), so "$3.14$" or an ellipsis
// inside a formula doesn't get cut mid-expression. Written as a manual
// character scan rather than a regex lookbehind so this can never throw a
// SyntaxError in a browser that doesn't support that regex feature - this
// whole module exists to enhance the experience and must never be able to
// break the page it's imported into.
function splitLineIntoSentences(line) {
  if (!line || !line.trim()) return [];

  const mathSpans = [];
  const masked = line.replace(MATH_SPAN_REGEX, (match) => {
    const token = PLACEHOLDER_PREFIX + mathSpans.length + PLACEHOLDER_SUFFIX;
    mathSpans.push(match);
    return token;
  });

  const sentences = [];
  let start = 0;
  for (let i = 0; i < masked.length; i++) {
    const ch = masked[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    let j = i + 1;
    while (j < masked.length && /\s/.test(masked[j])) j++;
    const hasWhitespaceAfter = j > i + 1;
    const followedByBoundaryChar = j === masked.length || /[A-Z0-9]/.test(masked[j]);
    if (hasWhitespaceAfter && followedByBoundaryChar) {
      const piece = masked.slice(start, i + 1).trim();
      if (piece) sentences.push(piece);
      start = j;
      i = j - 1;
    }
  }
  const rest = masked.slice(start).trim();
  if (rest) sentences.push(rest);

  return sentences.map((s) => s.replace(PLACEHOLDER_REGEX, (whole, i) => {
    // If the placeholder pattern happens to occur in real text with no
    // corresponding recorded span (astronomically unlikely, but checked
    // anyway per this module's "never corrupt real content" rule), leave
    // the original text untouched rather than risk splicing in the
    // literal string "undefined".
    const span = mathSpans[Number(i)];
    return span !== undefined ? span : whole;
  }));
}

// Returns { blocks, sentenceCount }. blocks mirror MathText's own
// paragraph/bullet grouping (one entry per paragraph or per consecutive
// run of "- " lines), but each block carries its text pre-split into
// { text, index } sentence objects instead of one raw string. A line with
// no recognisable sentence-ending punctuation still becomes exactly one
// sentence (the whole line), rather than being dropped.
export function splitMessageIntoSentences(text) {
  const blocks = [];
  let sentenceIndex = 0;

  if (typeof text !== 'string' || !text.trim()) return { blocks, sentenceCount: 0 };

  function toSentenceObjects(raw) {
    const found = splitLineIntoSentences(raw);
    const pieces = found.length > 0 ? found : [raw.trim()];
    return pieces.filter(Boolean).map((s) => ({ text: s, index: sentenceIndex++ }));
  }

  const lines = text.split('\n');
  let paragraphSentences = [];
  let bulletItems = null;

  function flushParagraph() {
    if (paragraphSentences.length > 0) {
      blocks.push({ type: 'paragraph', sentences: paragraphSentences });
      paragraphSentences = [];
    }
  }
  function flushBullets() {
    if (bulletItems && bulletItems.length > 0) {
      blocks.push({ type: 'bullets', items: bulletItems });
    }
    bulletItems = null;
  }

  for (const line of lines) {
    if (line.startsWith('- ')) {
      flushParagraph();
      if (!bulletItems) bulletItems = [];
      bulletItems.push(toSentenceObjects(line.slice(2)));
    } else {
      flushBullets();
      if (line.trim() === '') {
        flushParagraph();
      } else {
        paragraphSentences.push(...toSentenceObjects(line));
      }
    }
  }
  flushParagraph();
  flushBullets();

  return { blocks, sentenceCount: sentenceIndex };
}

// Flattens the block structure above into one ordered array of
// { text, index } sentence objects across the whole message - what
// lib/speech.js needs to build the spoken utterance and its char-offset
// ranges.
export function flattenSentences({ blocks }) {
  const flat = [];
  for (const block of blocks || []) {
    if (block.type === 'bullets') {
      for (const item of block.items) flat.push(...item);
    } else {
      flat.push(...block.sentences);
    }
  }
  return flat;
}
