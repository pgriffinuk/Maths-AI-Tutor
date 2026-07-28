'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Logo from './components/Logo';

// Deliberately minimal for now: the full paid product isn't public yet, so
// this page's only real job is pointing visitors at the free chatbot - no
// pricing, exam boards, feature list, login link, or footer legal links
// here (those all live on /coaching-tool instead, the one quiet link at
// the bottom of this page - see app/coaching-tool/page.js).
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
      <header className="marketing-topbar" style={{ justifyContent: 'center' }}>
        <Logo />
      </header>

      <main>
        <div className="wrap wide marketing-hero" style={{ textAlign: 'center' }}>
          <h1>An AI maths tutor that helps you think it through, not just gives you the answer.</h1>
          <div className="row" style={{ justifyContent: 'center', marginTop: 24 }}>
            <button className="primary" onClick={() => router.push('/chatbot')}>
              Try the free Maths Chatbot
            </button>
          </div>
        </div>
      </main>

      <footer className="marketing-footer">
        <div className="marketing-footer-inner" style={{ justifyContent: 'center' }}>
          <a href="/coaching-tool">Looking for the full coaching tool?</a>
        </div>
      </footer>
    </div>
  );
}
