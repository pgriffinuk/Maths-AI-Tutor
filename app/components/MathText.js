'use client';
import { InlineMath, BlockMath } from 'react-katex';
import { splitMessageIntoSentences } from '../../lib/messageSentences';

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

// Renders one sentence's worth of text: $...$/$$...$$ maths typeset via
// KaTeX (as before), plus **bold** turned into <strong> within any
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

// Renders one sentence, wrapped in its own span carrying a stable global
// sentence index - what lets SpeakButton (see app/components/SpeakButton.js
// and lib/speech.js) toggle a highlight on exactly this element as speech
// reaches it. A no-op wrapper (no extra class, no data attribute cost
// beyond the index) when nothing is currently being read.
function renderSentence(sentence, highlightedSentenceIndex) {
  const isActive = highlightedSentenceIndex === sentence.index;
  return (
    <span key={sentence.index} className={isActive ? 'sentence-highlight' : undefined}>
      {renderInline(sentence.text, `s${sentence.index}`)}
      {' '}
    </span>
  );
}

// Renders a string with $...$/$$...$$ LaTeX maths typeset via KaTeX,
// **bold** turned into <strong>, and lines starting with "- " turned into a
// real bullet list - everything else left as plain text. If the AI forgets
// all of this (no $, no **, no "- "), this just renders a single paragraph
// with the text unchanged, same as rendering the string directly - never
// throws. A malformed expression INSIDE delimiters is caught by react-katex
// itself rather than crashing the page.
//
// highlightedSentenceIndex (optional): the sentence index currently being
// read aloud, if any - see lib/messageSentences.js for how sentences are
// numbered. Passing null/undefined (the default) renders with no
// highlight, exactly as before this prop existed.
export default function MathText({ text, highlightedSentenceIndex = null }) {
  if (!text) return null;
  const { blocks } = splitMessageIntoSentences(String(text));
  return blocks.map((block, i) => {
    if (block.type === 'bullets') {
      return (
        <ul className="math-text-bullets" key={i}>
          {block.items.map((item, j) => (
            <li key={j}>{item.map((s) => renderSentence(s, highlightedSentenceIndex))}</li>
          ))}
        </ul>
      );
    }
    return (
      <p className="math-text-paragraph" key={i}>
        {block.sentences.map((s) => renderSentence(s, highlightedSentenceIndex))}
      </p>
    );
  });
}
