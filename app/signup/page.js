'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';
import { SIGNUPS_OPEN } from '../../lib/config';

export default function SignupPage() {
  if (!SIGNUPS_OPEN) {
    return (
      <div className="wrap">
        <div className="card auth-card">
          <div className="auth-eyebrow"><Logo /></div>
          <h1 style={{ textAlign: 'center' }}>Sign-ups aren&apos;t open yet</h1>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
            Stepwise is currently in private trials. If you&apos;ve been given
            login details, head to the login page instead.
          </p>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <a href="/login">Go to login</a>
          </div>
        </div>
      </div>
    );
  }

  return <SignupForm />;
}

function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isParent, setIsParent] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [autoLoggedIn, setAutoLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    // is_parent travels as auth metadata (same as full_name) rather than a
    // follow-up authenticated profile update - handle_new_user's trigger
    // reads it straight from here, which also works when email confirmation
    // is pending and there's no session yet to authenticate an update with.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, is_parent: isParent },
        emailRedirectTo: `${window.location.origin}/login`
      }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    // If email confirmation is off, Supabase signs the student in immediately
    setAutoLoggedIn(!!data.session);
    setDone(true);
  }

  if (done) {
    return (
      <div className="wrap">
        <div className="card auth-card">
          <div className="auth-eyebrow"><Logo /></div>
          {autoLoggedIn ? (
            <>
              <h1 style={{ textAlign: 'center' }}>You're all set</h1>
              <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>Your account is ready to go.</p>
            </>
          ) : (
            <>
              <h1 style={{ textAlign: 'center' }}>Check your email</h1>
              <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
                We've sent a confirmation link to {email}. Click it, then come back and log in.
              </p>
            </>
          )}
          {autoLoggedIn && isParent ? (
            <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px' }}>
                Head to your Parent Dashboard to add your child's own login - they'll
                practice under their own account, and you'll be able to see their progress from yours.
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="primary" onClick={() => router.push('/parent-dashboard')}>Set up a child account</button>
                <button onClick={() => router.push('/dashboard')}>Skip for now</button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px' }}>Want to take a quick diagnostic to find your starting point?</p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="primary" onClick={() => router.push('/diagnostic')}>Take the diagnostic</button>
                <button onClick={() => router.push('/dashboard')}>Skip for now</button>
              </div>
            </div>
          )}
          {!autoLoggedIn && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <a href="/login">Go to login</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card auth-card">
        <div className="auth-eyebrow"><Logo /></div>
        <h1 style={{ textAlign: 'center' }}>Sign up</h1>
        <form onSubmit={handleSignup}>
          <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password (min 6 characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <label className="auto-read-toggle" style={{ fontSize: 14, margin: '4px 0 14px' }}>
            <input type="checkbox" checked={isParent} onChange={(e) => setIsParent(e.target.checked)} />
            I'm a parent setting this up for my child
          </label>
          <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        {error && <div className="error-msg">{error}</div>}
        <div style={{ marginTop: 14 }}>
          <a href="/login">Already have an account? Log in</a>
        </div>
      </div>
    </div>
  );
}
