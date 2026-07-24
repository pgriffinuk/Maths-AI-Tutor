'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [autoLoggedIn, setAutoLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
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
          <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px' }}>Want to take a quick diagnostic to find your starting point?</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="primary" onClick={() => router.push('/diagnostic')}>Take the diagnostic</button>
              <button onClick={() => router.push('/dashboard')}>Skip for now</button>
            </div>
          </div>
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
