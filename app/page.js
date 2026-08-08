'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Logo from './components/Logo';
import Footer from './components/Footer';

// A hub, not a landing page for either product specifically - briefly
// introduces both the free chatbot and the full (account-gated) coaching
// tool and links out to their own dedicated pages, which each carry their
// own complete heading/subtext/illustration/CTA independent of this page
// (see app/chatbot/page.js and app/coaching-tool/page.js).
export default function Home() {
  const router = useRouter();

  // Renders the page immediately for everyone; this only redirects
  // logged-in visitors to /dashboard once the session check resolves,
  // rather than blocking first render on it.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  return (
    <div>
      <div className="marketing-viewport">
        <header className="marketing-topbar" style={{ justifyContent: 'center' }}>
          <Logo />
        </header>

        <main>
          <div className="wrap wide marketing-hero" style={{ textAlign: 'center' }}>
            <h1>An AI maths tutor that helps you think it through, not just gives you the answer.</h1>

            <div className="hub-options">
              <div className="card hub-option">
                <h2>Free Maths Chatbot</h2>
                <p style={{ color: 'var(--ink-soft)' }}>Ask about any problem or topic, no account needed.</p>
                <button className="primary" onClick={() => router.push('/chatbot')}>
                  Try the free chatbot
                </button>
              </div>
              <div className="card hub-option">
                <h2>Full Coaching Tool</h2>
                <p style={{ color: 'var(--ink-soft)' }}>
                  Diagnostic testing, exam-board-specific practice, and progress tracking -
                  for existing account holders.
                </p>
                <button className="primary" onClick={() => router.push('/coaching-tool')}>
                  View the coaching tool
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
