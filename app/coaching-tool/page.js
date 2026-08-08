'use client';
import { useRouter } from 'next/navigation';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

// Where the "Log in" link and Privacy/Terms footer links now live, since
// the main landing page (app/page.js) was trimmed down to just the free
// chatbot CTA - this is the one quiet link at the bottom of that page for
// visitors who already have (or want) a full account. The prominent
// centered "Log in" button below is the only login entry point on this
// page (Footer still carries the legal links) - the header is just a
// bare, centered Logo, matching app/page.js's composition.
export default function CoachingToolPage() {
  const router = useRouter();

  return (
    <div>
      <div className="marketing-viewport">
        <header className="marketing-topbar" style={{ justifyContent: 'center' }}>
          <Logo />
        </header>

        <main>
          <div className="wrap wide marketing-hero" style={{ textAlign: 'center' }}>
            <h1>The full Stepwise coaching tool</h1>
            <p style={{ color: 'var(--ink-soft)', maxWidth: 480, margin: '0 auto' }}>
              Stepwise&apos;s full coaching tool includes a diagnostic test, exam-board-specific
              marked practice, and progress tracking over time - currently available to
              existing account holders.
            </p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 24 }}>
              <button className="primary" onClick={() => router.push('/login')}>
                Log in
              </button>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
