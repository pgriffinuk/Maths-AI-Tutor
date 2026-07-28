// The AI's consistent "face" wherever it's speaking - hints, chat replies
// (both the post-marking "ask about it" thread and the general floating
// chat), and the coaching message - reusing the same red/gold/green
// ascending-rectangles mark as the wordmark logo (see Logo.js), just as a
// small circular badge instead of the full logo lockup.
export default function BotAvatar({ size = 26 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--card)',
        border: '1.5px solid var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="26" width="11" height="12" rx="1.5" fill="var(--red)" />
        <rect x="14.5" y="16" width="11" height="22" rx="1.5" fill="var(--gold)" />
        <rect x="27" y="4" width="11" height="34" rx="1.5" fill="var(--green)" />
      </svg>
    </div>
  );
}
