import Logo from '../components/Logo';

export const metadata = {
  title: 'Privacy Policy — Stepwise'
};

export default function PrivacyPage() {
  return (
    <div className="wrap draft-page">
      <div className="auth-eyebrow"><Logo /></div>
      <h1>Privacy Policy</h1>
      <div className="draft-notice">
        [DRAFT - this page needs proper legal content before the site goes live
        publicly. It should cover: what data is collected (account details, maths
        working, marking history, diagnostic results), why (to provide tutoring
        and track progress), who it&apos;s shared with (Supabase for storage, Anthropic
        to generate questions and marking), how long it&apos;s kept, and how a parent
        can request deletion. Consider getting this reviewed properly before
        launch.]
      </div>
      <p style={{ marginTop: 20 }}><a href="/">Back to home</a></p>
    </div>
  );
}
