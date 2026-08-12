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

// Renders one line/paragraph's worth of text: $...$/$$...$$ maths typeset
// via KaTeX (as before), plus **bold** turned into <strong> within any
// plain-text segment in between - math segments are never touched by the
// bold pass, so a literal "**" a model might put inside maths is never
// misread as emphasis.
function renderInline(text, keyPrefix) {
  const segments = splitMathSegments(text);
  return segments.map((segment, i) => {
    const key = `${keyPrefix}-${i}`;
    if (segment.type === 'block') {
      return <BlockMath key={key} errorColor="inherit">{segment.value}</BlockMath>;
    }
    if (segment.type === 'inline') {
      return <InlineMath key={key} errorColor="inherit">{segment.value}</InlineMath>;
    }
    return segment.value.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={`${key}-${j}`}>{part.slice(2, -2)}</strong>;
      }
      return part ? <span key={`${key}-${j}`}>{part}</span> : null;
    });
  });
}

// Groups lines into paragraph and bullet-list blocks so replies with
// multiple parts/steps (see lib/socraticTutor.js's formatting guidance)
// render as real visual structure instead of literal "- " glyphs. Runs
// before the maths/bold handling above since bullets and paragraph breaks
// are a line-level, block-level concern - if the text has none of this
// structure, it comes back as a single paragraph block, same as before.
function splitBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let paragraphLines = [];
  let bulletItems = null;

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', value: paragraphLines.join('\n') });
      paragraphLines = [];
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
      bulletItems.push(line.slice(2));
    } else {
      flushBullets();
      if (line.trim() === '') {
        flushParagraph();
      } else {
        paragraphLines.push(line);
      }
    }
  }
  flushParagraph();
  flushBullets();
  return blocks;
}

// Renders a string with $...$/$$...$$ LaTeX maths typeset via KaTeX,
// **bold** turned into <strong>, and lines starting with "- " turned into a
// real bullet list - everything else left as plain text. If the AI forgets
// all of this (no $, no **, no "- "), this just renders a single paragraph
// with the text unchanged, same as rendering the string directly - never
// throws. A malformed expression INSIDE delimiters is caught by react-katex
// itself rather than crashing the page.
export default function MathText({ text }) {
  if (!text) return null;
  const blocks = splitBlocks(String(text));
  return blocks.map((block, i) => {
    if (block.type === 'bullets') {
      return (
        <ul className="math-text-bullets" key={i}>
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
          ))}
        </ul>
      );
    }
    return <p className="math-text-paragraph" key={i}>{renderInline(block.value, `${i}`)}</p>;
  });
}
