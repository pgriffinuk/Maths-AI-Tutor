'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';
import { computeStreak } from '../../lib/rewards';

export default function TeacherDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [students, setStudents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [feedbackRows, setFeedbackRows] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_teacher')
        .eq('id', data.session.user.id)
        .single();
      if (!profile?.is_teacher) { router.replace('/dashboard'); return; }
      setSession(data.session);
      setChecked(true);
    });
  }, [router]);

  useEffect(() => {
    if (!checked) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  async function loadData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const [profilesRes, attemptsRes, feedbackRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, is_teacher').order('full_name'),
        supabase.from('attempts').select('student_id, topic, points, overall_score, student_feedback, created_at').order('created_at', { ascending: false }),
        supabase.from('feedback').select('id, message, created_at, profiles(full_name)').order('created_at', { ascending: false })
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (attemptsRes.error) throw attemptsRes.error;
      if (feedbackRes.error) throw feedbackRes.error;

      const attemptsByStudent = {};
      for (const a of attemptsRes.data || []) {
        (attemptsByStudent[a.student_id] = attemptsByStudent[a.student_id] || []).push(a);
      }

      const list = (profilesRes.data || [])
        .filter((p) => !p.is_teacher)
        .map((p) => {
          const theirAttempts = attemptsByStudent[p.id] || [];
          const mostRecent = theirAttempts[0];
          return {
            id: p.id,
            fullName: p.full_name || 'Unnamed student',
            totalPoints: theirAttempts.reduce((sum, a) => sum + (a.points || 0), 0),
            streak: computeStreak(theirAttempts),
            lastTopic: mostRecent?.topic || null,
            lastDate: mostRecent?.created_at || null,
            attempts: theirAttempts.slice(0, 10)
          };
        });

      setStudents(list);
      setFeedbackRows(feedbackRes.data || []);
    } catch (err) {
      setErrorMsg(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
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

      <div className="eyebrow section-gap">Edexcel IGCSE · Foundation Tier</div>
      <h1>Teacher Dashboard</h1>

      {errorMsg && <div className="alert-error">{errorMsg}</div>}

      {loading && (
        <div className="card">
          <div className="skeleton-line" style={{ width: '95%' }}></div>
          <div className="skeleton-line"></div>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="card empty-state">
          <p>No students yet.</p>
        </div>
      )}

      {!loading && students.map((s) => (
        <div className="card" key={s.id}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
          >
            <div>
              <div className="q-label">{s.fullName}</div>
              <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
                {s.lastTopic ? `Last: ${s.lastTopic} · ${new Date(s.lastDate).toLocaleDateString()}` : 'No attempts yet'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="rewards-stat-num" style={{ fontSize: 22 }}>{s.totalPoints}</div>
                <div className="rewards-stat-label">Points</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="rewards-stat-num" style={{ fontSize: 22 }}>{s.streak}</div>
                <div className="rewards-stat-label">Streak</div>
              </div>
              <span style={{ fontSize: 20, color: 'var(--ink-soft)' }}>{expandedId === s.id ? '−' : '+'}</span>
            </div>
          </div>

          {expandedId === s.id && (
            <div style={{ marginTop: 16, borderTop: '1px dashed var(--paper-line)', paddingTop: 14 }}>
              {s.attempts.length === 0 && (
                <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: 0 }}>No attempts yet.</p>
              )}
              {s.attempts.map((a, i) => (
                <div key={i} style={{ marginBottom: i === s.attempts.length - 1 ? 0 : 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--ink-soft)' }}>
                    <span>{a.topic}</span>
                    <span style={{ flexShrink: 0 }}>{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span className="score-tag">{a.overall_score || 'n/a'}</span>
                  </div>
                  {a.student_feedback && (
                    <p style={{ fontSize: 14, marginTop: 6, marginBottom: 0 }}>{a.student_feedback}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="eyebrow section-gap">Feedback inbox</div>
      <h1 style={{ fontSize: 24 }}>Student feedback</h1>

      {!loading && feedbackRows.length === 0 && (
        <div className="card empty-state">
          <p>No feedback yet.</p>
        </div>
      )}

      {!loading && feedbackRows.map((f) => (
        <div className="card" key={f.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>
            <span>{f.profiles?.full_name || 'Unknown student'}</span>
            <span style={{ flexShrink: 0 }}>{new Date(f.created_at).toLocaleDateString()}</span>
          </div>
          <p style={{ margin: 0 }}>{f.message}</p>
        </div>
      ))}
    </div>
  );
}
