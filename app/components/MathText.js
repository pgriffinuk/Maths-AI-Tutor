'use client';
import { InlineMath, BlockMath } from 'react-katex';

// Matches $$...$$ (display) before $...$ (inline) at each position, so a
// display block's own delimiters are never mistaken for two empty inline
// ones - inline maths can't contain a literal $ or a newline.
const MATH_SEGMENT_REGEX = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function splitMathSegments(text) {
  const segments = [];
  let lastIndex = 0;
  let match;
  MATH_SEGMENT_REGEX.lastIndex = 0;
  while ((match = MATH_SEGMENT_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'block', value: match[1] });
    } else {
      segments.push({ type: 'inline', value: match[2] });
    }
    lastIndex = MATH_SEGMENT_REGEX.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}

// Renders a string with $...$ (inline) and $$...$$ (display) LaTeX
// delimiters typeset via KaTeX, everything else left as plain text. If the
// AI forgets delimiters entirely (no $ anywhere), splitMathSegments just
// returns a single text segment - same as rendering the string directly,
// no errors. A malformed expression INSIDE delimiters is caught by
// react-katex itself rather than crashing the page.
export default function MathText({ text }) {
  if (!text) return null;
  const segments = splitMathSegments(String(text));
  return segments.map((segment, i) => {
    if (segment.type === 'block') {
      return <BlockMath key={i} errorColor="inherit">{segment.value}</BlockMath>;
    }
    if (segment.type === 'inline') {
      return <InlineMath key={i} errorColor="inherit">{segment.value}</InlineMath>;
    }
    return segment.value;
  });
}
