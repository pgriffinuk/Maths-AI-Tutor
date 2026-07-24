'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase's client reads the recovery token from the URL fragment automatically
    // and turns it into a temporary session - we just need to wait a tick for it.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setError('This reset link has expired or is invalid. Request a new one.');
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push('/login'), 2000);
  }

  if (done) {
    return (
      <div className="wrap">
        <div className="card auth-card">
          <div className="auth-eyebrow"><Logo /></div>
          <h1 style={{ textAlign: 'center' }}>Password updated</h1>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>Taking you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card auth-card">
        <div className="auth-eyebrow"><Logo /></div>
        <h1 style={{ textAlign: 'center' }}>Choose a new password</h1>
        {ready ? (
          <form onSubmit={handleSubmit}>
            <input type="password" placeholder="New password (min 6 characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        ) : (
          !error && <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>Checking your reset link...</p>
        )}
        {error && <div className="error-msg">{error}</div>}
        <div style={{ marginTop: 14 }}>
          <a href="/forgot-password">Request a new link</a>
        </div>
      </div>
    </div>
  );
}
