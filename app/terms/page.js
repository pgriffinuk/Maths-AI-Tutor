import Logo from '../components/Logo';

export const metadata = {
  title: 'Terms of Service — Stepwise'
};

export default function TermsPage() {
  return (
    <div className="wrap draft-page">
      <div className="auth-eyebrow"><Logo /></div>
      <h1>Terms of Service</h1>
      <div className="draft-notice">
        [DRAFT - needs proper terms before launch, covering payment terms once
        pricing is added, cancellation, and acceptable use.]
      </div>
      <p style={{ marginTop: 20 }}><a href="/">Back to home</a></p>
    </div>
  );
}
