import { sanitizeSvg } from '../../lib/sanitizeSvg';

// Renders an array of { text, diagram } steps - used for both the "Show me
// the full solution" reveal and a topic primer's worked example. Every
// diagram string is run through sanitizeSvg() before being handed to
// dangerouslySetInnerHTML, since this is AI-generated content shown to
// children - never skip that step when reusing this component.
export default function StepList({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {steps.map((step, i) => (
        <div key={i}>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{step.text}</p>
          {step.diagram && (
            <div
              className="card"
              style={{ marginTop: 8, marginBottom: 0, padding: 12, display: 'flex', justifyContent: 'center', overflowX: 'auto' }}
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(step.diagram) }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
