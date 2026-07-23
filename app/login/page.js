'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/dashboard');
  }

  return (
    <div className="wrap">
      <div className="card auth-card">
        <div className="eyebrow">Foundation Maths</div>
        <h1>Log in</h1>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        {error && <div className="error-msg">{error}</div>}
        <div style={{ marginTop: 14 }}>
          <a href="/signup">No account yet? Sign up</a>
        </div>
      </div>
    </div>
  );
}
