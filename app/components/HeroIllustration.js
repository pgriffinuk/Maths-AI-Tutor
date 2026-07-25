export default function HeroIllustration() {
  return (
    <svg viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: 480 }}>
      <circle cx="480" cy="120" r="140" fill="var(--gold-bg)" opacity="0.6" />
      <circle cx="120" cy="380" r="120" fill="var(--green-bg)" opacity="0.5" />
      <g transform="rotate(-4 320 300)">
        <rect x="140" y="160" width="360" height="260" rx="14" fill="#FFFFFF" stroke="var(--ink)" strokeWidth="2" />
        <line x1="140" y1="210" x2="500" y2="210" stroke="var(--paper-line)" strokeWidth="2" />
        <line x1="140" y1="260" x2="500" y2="260" stroke="var(--paper-line)" strokeWidth="2" />
        <line x1="140" y1="310" x2="500" y2="310" stroke="var(--paper-line)" strokeWidth="2" />
        <line x1="140" y1="360" x2="500" y2="360" stroke="var(--paper-line)" strokeWidth="2" />
        <line x1="220" y1="160" x2="220" y2="420" stroke="var(--paper-line)" strokeWidth="2" />
        <line x1="320" y1="160" x2="320" y2="420" stroke="var(--paper-line)" strokeWidth="2" />
        <line x1="420" y1="160" x2="420" y2="420" stroke="var(--paper-line)" strokeWidth="2" />
      </g>
      <rect x="260" y="330" width="50" height="90" rx="6" fill="var(--red)" />
      <rect x="320" y="280" width="50" height="140" rx="6" fill="var(--gold)" />
      <rect x="380" y="210" width="50" height="210" rx="6" fill="var(--green)" />
      <path d="M395 190 L410 205 L440 170" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="520" cy="340" r="6" fill="var(--gold)" opacity="0.6" />
      <circle cx="160" cy="140" r="5" fill="var(--red)" opacity="0.5" />
      <circle cx="540" cy="220" r="4" fill="var(--green)" opacity="0.6" />
    </svg>
  );
}
