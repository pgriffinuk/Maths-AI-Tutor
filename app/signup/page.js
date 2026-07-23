'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="wrap">
        <div className="card auth-card">
          <h1>Check your email</h1>
          <p>We've sent a confirmation link. Click it, then log in.</p>
          <a href="/login">Go to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card auth-card">
        <div className="eyebrow">Foundation Maths</div>
        <h1>Sign up</h1>
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
