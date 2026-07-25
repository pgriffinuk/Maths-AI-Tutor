export default function Logo({ size = 'md', withWordmark = true }) {
  const px = size === 'sm' ? 22 : size === 'lg' ? 40 : 28;
  const fontSize = size === 'sm' ? 16 : size === 'lg' ? 28 : 20;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 12 : 8 }}>
      <svg width={px} height={px} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="26" width="11" height="12" rx="1.5" fill="var(--red)" />
        <rect x="14.5" y="16" width="11" height="22" rx="1.5" fill="var(--gold)" />
        <rect x="27" y="4" width="11" height="34" rx="1.5" fill="var(--green)" />
      </svg>
      {withWordmark && (
        <span style={{
          fontFamily: 'var(--font-zilla-slab), serif',
          fontWeight: 700,
          fontSize,
          color: 'var(--ink)',
          letterSpacing: '-0.01em'
        }}>
          Stepwise
        </span>
      )}
    </div>
  );
}
