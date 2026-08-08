'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Logo from './components/Logo';
import HeroIllustration from './components/HeroIllustration';
import Footer from './components/Footer';

// Deliberately minimal for now: the full paid product isn't public yet, so
// this page's only real job is pointing visitors at the free chatbot - no
// pricing, exam boards, or feature list here. The "full coaching tool" pill
// below points existing account holders at /coaching-tool (where "Log in"
// actually lives); the Privacy/Terms Footer underneath it is the standard
// legal footer shared with /chatbot and /coaching-tool.
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
            <p style={{ fontWeight: 700, marginTop: 10 }}>
              Whether you&apos;re stuck on a specific problem or just want help understanding
              a topic, ask away.
            </p>
            <div style={{ maxWidth: 400, margin: '24px auto 0' }}>
              <HeroIllustration />
            </div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 24 }}>
              <button className="primary" onClick={() => router.push('/chatbot')}>
                Try the free Maths Chatbot
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="marketing-footer">
        <div className="marketing-footer-inner" style={{ justifyContent: 'center' }}>
          <a href="/coaching-tool" className="pill-btn">Looking for the full coaching tool?</a>
        </div>
      </footer>

      <Footer />
    </div>
  );
}
