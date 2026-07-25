// Strips AI-generated SVG markup down to a small safe subset before it is
// ever rendered via dangerouslySetInnerHTML (worked-solution diagrams,
// topic primer worked examples). This is a genuine safety requirement, not
// a formality - this content is shown to children. Regex-based rather than
// a DOM parser so it behaves the same on the server and in the browser
// with no extra dependency; the diagrams this sanitizes are always simple,
// AI-generated basic shapes, not arbitrary third-party SVG.
//
// MUST be called on any AI-generated SVG string before it is rendered
// anywhere in the app.

const ALLOWED_TAGS = ['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'tspan', 'ellipse', 'defs', 'marker'];
const EXPLICITLY_STRIPPED_TAGS = ['script', 'foreignObject', 'use', 'image'];

function stripTagAndContents(input, tagName) {
  const selfClosing = new RegExp(`<${tagName}\\b[^>]*/>`, 'gi');
  const paired = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`, 'gi');
  return input.replace(paired, '').replace(selfClosing, '');
}

function stripDisallowedTags(input) {
  let out = input;
  // Self-closing tags: <tagname .../>
  out = out.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/>/g, (match, tag) => (
    ALLOWED_TAGS.includes(tag.toLowerCase()) ? match : ''
  ));
  // Paired tags: <tagname ...>...</tagname>
  out = out.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>[\s\S]*?<\/\1\s*>/g, (match, tag) => (
    ALLOWED_TAGS.includes(tag.toLowerCase()) ? match : ''
  ));
  return out;
}

export function sanitizeSvg(svgString) {
  if (typeof svgString !== 'string' || !svgString.trim().startsWith('<svg')) {
    return '';
  }

  let svg = svgString;

  // Explicitly-named risk tags first (script contents shouldn't be treated
  // as nested markup at all, just removed wholesale).
  for (const tag of EXPLICITLY_STRIPPED_TAGS) {
    svg = stripTagAndContents(svg, tag);
  }

  // Allow-list pass, repeated to a fixed point so nested disallowed tags
  // (of differing names) are fully removed rather than just the outermost.
  let previous;
  do {
    previous = svg;
    svg = stripDisallowedTags(svg);
  } while (svg !== previous);

  // Strip event handler attributes (onclick, onload, onerror, ...).
  svg = svg.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Strip href/xlink:href attributes that point at a javascript: URL.
  svg = svg.replace(/\s(?:xlink:)?href\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '');

  return svg;
}
