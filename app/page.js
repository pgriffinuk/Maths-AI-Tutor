'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Logo from './components/Logo';

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/dashboard');
      } else {
        setChecked(true);
      }
    });
  }, [router]);

  if (!checked) return null;

  return (
    <div className="wrap">
      <div className="landing-hero">
        <Logo size="lg" />
        <p className="landing-tagline">
          Foundation-tier maths practice, marked step by step — with feedback that
          remembers where you left off.
        </p>
        <p className="landing-subline">Built for Stepwise students.</p>
        <div className="row" style={{ marginTop: 22 }}>
          <button className="primary" onClick={() => router.push('/login')}>Log in</button>
          <button onClick={() => router.push('/signup')}>Sign up</button>
        </div>
      </div>

      <div className="landing-features">
        <div className="feature-card">
          <div className="q-label">Practice</div>
          <p>Foundation-tier questions generated for the topic you're working on, calibrated to what you've done before.</p>
        </div>
        <div className="feature-card">
          <div className="q-label">Marking</div>
          <p>Every line of working checked and commented on, the way it's marked in an exercise book.</p>
        </div>
        <div className="feature-card">
          <div className="q-label">Coaching</div>
          <p>Feedback that looks across attempts, not just the last one — so patterns get caught, not just mistakes.</p>
        </div>
      </div>
    </div>
  );
}
