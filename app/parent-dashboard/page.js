'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';
import { computeStreak } from '../../lib/rewards';
import { downloadProgressReport } from '../../lib/downloadProgressReport';
import { useToast } from '../components/Toast';

export default function ParentDashboard() {
  const router = useRouter();
  const showToast = useToast();
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [children, setChildren] = useState([]);
  const [downloadingReportFor, setDownloadingReportFor] = useState(null); // child id currently generating a report, or null
  const [reportError, setReportError] = useState('');

  const [childName, setChildName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [addingChild, setAddingChild] = useState(false);
  const [addChildError, setAddChildError] = useState('');

  // Same gate pattern as /teacher: only ever renders for an account whose
  // profile actually has is_parent set, checked server-side via the
  // authenticated client, not just inferred from anything client-supplied.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_parent')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (profileError) console.error('Could not load profile.is_parent:', profileError.message);
      if (!profile?.is_parent) { router.replace('/dashboard'); return; }
      setSession(data.session);
      setChecked(true);
    });
  }, [router]);

  useEffect(() => {
    if (!checked) return;
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  async function loadChildren() {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: childProfiles, error: childrenError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('parent_id', session.user.id)
        .order('full_name');
      if (childrenError) throw childrenError;

      const childIds = (childProfiles || []).map((c) => c.id);
      const attemptsByChild = {};
      if (childIds.length > 0) {
        // Explicitly scoped to linked children's ids (not just left to RLS)
        // so this never mixes in the parent's OWN attempts, if they also
        // practice from this same account.
        const { data: attempts, error: attemptsError } = await supabase
          .from('attempts')
          .select('student_id, topic, points, created_at')
          .in('student_id', childIds)
          .order('created_at', { ascending: false });
        if (attemptsError) throw attemptsError;
        for (const a of attempts || []) {
          (attemptsByChild[a.student_id] = attemptsByChild[a.student_id] || []).push(a);
        }
      }

      const list = (childProfiles || []).map((c) => {
        const theirAttempts = attemptsByChild[c.id] || [];
        const mostRecent = theirAttempts[0];
        return {
          id: c.id,
          fullName: c.full_name || 'Unnamed child',
          totalPoints: theirAttempts.reduce((sum, a) => sum + (a.points || 0), 0),
          streak: computeStreak(theirAttempts),
          lastTopic: mostRecent?.topic || null,
          lastDate: mostRecent?.created_at || null
        };
      });
      setChildren(list);
    } catch (err) {
      setErrorMsg(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddChild(e) {
    e.preventDefault();
    setAddingChild(true);
    setAddChildError('');
    try {
      const res = await fetch('/api/create-child-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childName, childEmail, childPassword, accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setAddChildError(data.error);
        return;
      }
      // The refreshed children list below already shows the new child -
      // this toast is just the momentary "it worked" confirmation, not the
      // lasting record of it.
      showToast({ type: 'success', message: `${childName}'s account is ready - they can log in with the email and password you just set.` });
      setChildName('');
      setChildEmail('');
      setChildPassword('');
      loadChildren();
    } catch (err) {
      setAddChildError('Something went wrong - check your connection and try again.');
    } finally {
      setAddingChild(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  async function handleDownloadReport(child) {
    setDownloadingReportFor(child.id);
    setReportError('');
    try {
      await downloadProgressReport({ studentId: child.id, accessToken: session?.access_token });
    } catch (err) {
      setReportError(err.message || 'Could not generate the report - please try again.');
    } finally {
      setDownloadingReportFor(null);
    }
  }

  if (!checked) return null;

  return (
    <div className="wrap">
      <div className="topnav">
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/dashboard')} style={{ fontSize: 12, padding: '5px 10px' }}>My practice</button>
          <button onClick={handleLogout} style={{ fontSize: 12, padding: '5px 10px' }}>Log out</button>
        </div>
      </div>

      <div className="eyebrow section-gap">Family</div>
      <h1>Parent Dashboard</h1>

      {errorMsg && <div className="alert-error">{errorMsg}</div>}

      {loading && [0, 1].map((i) => (
        // Shaped like a real child row below (name/subtitle on the left,
        // points/streak/report-button on the right) rather than one
        // generic loading block, so it doesn't jump around once the
        // actual rows appear.
        <div className="card" key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div className="skeleton-line" style={{ width: '45%' }}></div>
            <div className="skeleton-line" style={{ width: '70%', margin: 0 }}></div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexShrink: 0 }}>
            <div className="skeleton-line" style={{ width: 32, height: 28, margin: 0 }}></div>
            <div className="skeleton-line" style={{ width: 32, height: 28, margin: 0 }}></div>
            <div className="skeleton-line" style={{ width: 100, height: 30, margin: 0, borderRadius: 6 }}></div>
          </div>
        </div>
      ))}

      {!loading && children.length === 0 && (
        <div className="card empty-state">
          <p>No linked children yet - add one below.</p>
        </div>
      )}

      {!loading && children.map((c) => (
        <div className="card" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="q-label">{c.fullName}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
              {c.lastTopic ? `Last: ${c.lastTopic} · ${new Date(c.lastDate).toLocaleDateString()}` : 'No attempts yet'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="rewards-stat-num" style={{ fontSize: 22 }}>{c.totalPoints}</div>
              <div className="rewards-stat-label">Points</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="rewards-stat-num" style={{ fontSize: 22 }}>{c.streak}</div>
              <div className="rewards-stat-label">Streak</div>
            </div>
            <button
              onClick={() => handleDownloadReport(c)}
              disabled={downloadingReportFor === c.id}
              style={{ fontSize: 12, padding: '5px 10px' }}
            >
              {downloadingReportFor === c.id ? (<><span className="spinner"></span>Generating report...</>) : 'Download report'}
            </button>
          </div>
        </div>
      ))}

      {reportError && <div className="alert-error">{reportError}</div>}

      <div className="eyebrow section-gap">Add a child</div>
      <div className="card">
        <form onSubmit={handleAddChild} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Child's full name" value={childName} onChange={(e) => setChildName(e.target.value)} style={{ width: '100%' }} required />
          <input type="email" placeholder="Child's email" value={childEmail} onChange={(e) => setChildEmail(e.target.value)} style={{ width: '100%' }} required />
          <input type="password" placeholder="Password (min 6 characters)" minLength={6} value={childPassword} onChange={(e) => setChildPassword(e.target.value)} style={{ width: '100%' }} required />
          <div className="row" style={{ marginTop: 0 }}>
            <button className="primary" type="submit" disabled={addingChild}>
              {addingChild ? 'Creating account...' : 'Add child'}
            </button>
          </div>
        </form>
        {addChildError && <div className="error-msg">{addChildError}</div>}
      </div>

      <div className="eyebrow section-gap">Billing</div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span>Your subscription covers every child linked to this account - they never need to manage billing themselves.</span>
        <button onClick={() => router.push('/billing')} style={{ fontSize: 12, padding: '5px 10px' }}>Manage billing</button>
      </div>
    </div>
  );
}
