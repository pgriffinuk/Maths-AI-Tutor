'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="wrap">
        <div className="card auth-card">
          <div className="auth-eyebrow"><Logo /></div>
          <h1 style={{ textAlign: 'center' }}>Check your email</h1>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
            If an account exists for {email}, a password reset link is on its way.
            Click it to choose a new password.
          </p>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <a href="/login">Back to login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card auth-card">
        <div className="auth-eyebrow"><Logo /></div>
        <h1 style={{ textAlign: 'center' }}>Reset your password</h1>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        {error && <div className="error-msg">{error}</div>}
        <div style={{ marginTop: 14 }}>
          <a href="/login">Back to login</a>
        </div>
      </div>
    </div>
  );
}
