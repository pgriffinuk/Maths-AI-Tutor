'use client';
import { useEffect, useRef } from 'react';
import { sanitizeSvg } from '../../lib/sanitizeSvg';

// Persistent panel showing the latest diagram from the conversation,
// alongside the chat rather than inline inside each bubble - so a worked
// diagram stays visible while the conversation continues instead of
// scrolling away. sanitizeSvg() is still applied here, same requirement as
// every other diagram render in the app.
//
// Keyed by the diagram string itself: whenever it changes (including the
// very first time one appears), React remounts this element fresh, which
// is what makes the CSS entrance animations below (fade/scale-up on
// .diagram-panel-content, border glow via .diagram-panel-glow) replay on
// every new diagram with no JS timers or state needed. The glow class is
// only added once a diagram actually exists, so nothing animates on the
// page's very first, diagram-less render. Hidden entirely below the
// 860px breakpoint when there's nothing to show yet (see globals.css),
// rather than wasting mobile vertical space on an empty box.
//
// highlightedElementId (optional): the id of a specific SVG element to
// highlight, synced to speech playback via a message's highlightMap (see
// lib/socraticTutor.js's diagram-id instructions and lib/latestDiagram.js's
// resolveHighlightedElementId). This is AI-supplied and may not match any
// element actually present in the current diagram - the lookup below is a
// plain DOM search with an exact-match comparison, so a miss just means
// nothing highlights, never an error.
export default function DiagramPanel({ diagram, highlightedElementId = null }) {
  const contentRef = useRef(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const candidates = container.querySelectorAll('[id]');
    candidates.forEach((el) => {
      if (highlightedElementId && el.id === highlightedElementId) {
        el.classList.add('diagram-region-highlight');
      } else {
        el.classList.remove('diagram-region-highlight');
      }
    });
  }, [diagram, highlightedElementId]);

  return (
    <div
      key={diagram || 'empty'}
      className={`diagram-panel${diagram ? ' diagram-panel-glow' : ' diagram-panel-hide-mobile'}`}
    >
      {diagram ? (
        <div ref={contentRef} className="diagram-panel-content" dangerouslySetInnerHTML={{ __html: sanitizeSvg(diagram) }} />
      ) : (
        <p className="diagram-panel-empty">Diagrams will appear here when helpful.</p>
      )}
    </div>
  );
}
