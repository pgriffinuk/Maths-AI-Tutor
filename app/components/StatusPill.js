const STATUS_CONFIG = {
  solid: { label: 'Solid', color: 'var(--green)' },
  shaky: { label: 'Shaky', color: 'var(--gold)' },
  gap: { label: 'Gap', color: 'var(--red)' }
};

export default function StatusPill({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return <span className="score-tag" style={{ background: config.color }}>{config.label}</span>;
}
