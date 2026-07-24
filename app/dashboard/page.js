'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';
import { pointsForLines, computeStreak, computeBadges } from '../../lib/rewards';

const TOPICS = [
  'Fractions (add, subtract, multiply, divide)',
  'Percentages (including percentage change)',
  'Ratio and proportion, including inverse proportion',
  'Solving linear equations, including with brackets and fractions',
  'Angles in parallel lines and polygons',
  'Perimeter, area and volume of standard 2D/3D shapes',
  'Probability, including combined events',
  'Averages and range from lists and frequency tables',
  'Standard form calculations',
  'Sequences, including finding the nth term'
];

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [question, setQuestion] = useState(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [working, setWorking] = useState('');
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState(null);
  const [hints, setHints] = useState([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(null); // { count, correctCount, recentSummary }
  const [rewards, setRewards] = useState(null); // { totalPoints, streak, badges }
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  async function loadRewards() {
    if (!session) return;
    const { data } = await supabase
      .from('attempts')
      .select('topic, points, marked_lines, created_at')
      .eq('student_id', session.user.id)
      .order('created_at', { ascending: false });

    const attempts = data || [];
    const totalPoints = attempts.reduce((sum, a) => sum + (a.points || 0), 0);
    setRewards({
      totalPoints,
      streak: computeStreak(attempts),
      badges: computeBadges(attempts)
    });
  }

  useEffect(() => {
    if (session) loadRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadProgress(forTopic) {
    if (!session) return '';
    const { data } = await supabase
      .from('attempts')
      .select('overall_score, student_feedback, created_at')
      .eq('student_id', session.user.id)
      .eq('topic', forTopic)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!data || data.length === 0) {
      setProgress({ count: 0 });
      return '';
    }
    setProgress({ count: data.length });
    return data
      .map((a, i) => `Attempt ${i + 1} (most recent first) - score: ${a.overall_score || 'n/a'}. Feedback given: ${a.student_feedback || 'n/a'}`)
      .join('\n');
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_teacher')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (profileError) console.error('Could not load profile.is_teacher:', profileError.message);
      setIsTeacher(!!profile?.is_teacher);
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function newQuestion() {
    setLoadingQ(true);
    setErrorMsg('');
    setQuestion(null);
    setResult(null);
    setHints([]);
    setWorking('');
    setChatMessages([]);
    try {
      const history = await loadProgress(topic);
      const res = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, history })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestion(data);
    } catch (err) {
      setErrorMsg(String(err.message || err));
    } finally {
      setLoadingQ(false);
    }
  }

  async function askHint() {
    if (!question) return;
    setHintLoading(true);
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.question, studentWorking: working })
      });
      const data = await res.json();
      setHints((h) => [...h, data.hint || data.error]);
    } catch (err) {
      setHints((h) => [...h, 'Could not get a hint right now.']);
    } finally {
      setHintLoading(false);
    }
  }

  async function submitWorking() {
    if (!question || !working.trim()) return;
    setMarking(true);
    setErrorMsg('');
    try {
      const history = await loadProgress(topic);
      const res = await fetch('/api/mark-working', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          workedSolution: question.workedSolution,
          keyMarkingPoints: question.keyMarkingPoints,
          studentWorking: working,
          history
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      const earnedPoints = pointsForLines(data.lines);

      // Save this attempt so it feeds into future progress/reports
      if (session) {
        await supabase.from('attempts').insert({
          student_id: session.user.id,
          topic,
          question: question.question,
          student_working: working,
          overall_score: data.overallScore,
          student_feedback: data.studentFeedback,
          parent_feedback: data.parentFeedback,
          marked_lines: data.lines,
          points: earnedPoints
        });
        loadRewards();
      }
      setProgress((p) => ({ count: (p?.count || 0) + 1 }));
    } catch (err) {
      setErrorMsg(String(err.message || err));
    } finally {
      setMarking(false);
    }
  }

  async function sendChatMessage() {
    const message = chatInput.trim();
    if (!message || !question || !result) return;
    const newHistory = [...chatMessages, { role: 'user', content: message }];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          studentWorking: working,
          markingResult: result,
          history: chatMessages,
          message
        })
      });
      const data = await res.json();
      setChatMessages((h) => [...h, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.' }]);
    } catch (err) {
      setChatMessages((h) => [...h, { role: 'assistant', content: 'Could not reply right now - try again in a moment.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function submitFeedback() {
    const message = feedbackText.trim();
    if (!message || !session) return;
    await supabase.from('feedback').insert({ student_id: session.user.id, message });
    setFeedbackText('');
    setFeedbackSent(true);
    setTimeout(() => { setFeedbackSent(false); setShowFeedback(false); }, 2500);
  }

  if (!session) return null;

  return (
    <div className="wrap">
      <div className="topnav">
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 8 }}>
          {isTeacher && (
            <button onClick={() => router.push('/teacher')} style={{ fontSize: 12, padding: '5px 10px' }}>
              Teacher view
            </button>
          )}
          <button onClick={() => setShowFeedback((s) => !s)} style={{ fontSize: 12, padding: '5px 10px' }}>
            Feedback
          </button>
          <button onClick={handleLogout} style={{ fontSize: 12, padding: '5px 10px' }}>Log out</button>
        </div>
      </div>

      {showFeedback && (
        <div className="card feedback-card">
          <div className="q-label">Tell us what's working or not</div>
          {feedbackSent ? (
            <p style={{ color: 'var(--green)', fontWeight: 600 }}>Thanks — that's been sent.</p>
          ) : (
            <>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Anything confusing, broken, or that you'd like to see added..."
              />
              <div className="row">
                <button className="primary" onClick={submitFeedback} disabled={!feedbackText.trim()}>Send feedback</button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="eyebrow section-gap">Edexcel IGCSE · Foundation Tier</div>
      <h1>Marked Practice</h1>

      {rewards && (
        <div className="card rewards-card">
          <div className="rewards-stats">
            <div className="rewards-stat">
              <div className="rewards-stat-num">{rewards.totalPoints}</div>
              <div className="rewards-stat-label">Points</div>
            </div>
            <div className="rewards-stat">
              <div className="rewards-stat-num">{rewards.streak}</div>
              <div className="rewards-stat-label">Day streak</div>
            </div>
          </div>
          <div className="badge-row">
            {rewards.badges.map((b) => (
              <div className={`badge ${b.unlocked ? 'unlocked' : 'locked'}`} key={b.id} title={b.description}>
                <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                  <path d="M2 2h16v14l-8 6-8-6V2z" stroke={b.unlocked ? 'var(--gold)' : '#B9C2CB'} strokeWidth="2" fill={b.unlocked ? 'var(--gold-bg)' : '#F1F3F5'} />
                </svg>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="controls">
        <select value={topic} onChange={(e) => { setTopic(e.target.value); setProgress(null); }}>
          {TOPICS.map((t) => <option key={t} value={t}>{t.split(' (')[0].split(',')[0]}</option>)}
        </select>
        <button className="primary" onClick={newQuestion} disabled={loadingQ}>
          {loadingQ ? 'Generating...' : 'New question'}
        </button>
        {progress && progress.count > 0 && (
          <span className="score-tag" style={{ background: 'var(--gold)' }}>
            {progress.count} attempt{progress.count === 1 ? '' : 's'} on this topic
          </span>
        )}
      </div>

      {errorMsg && <div className="alert-error">{errorMsg}</div>}

      {!question && !loadingQ && (
        <div className="card empty-state">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="2" y="26" width="11" height="12" rx="1.5" fill="var(--red)" opacity="0.5" />
            <rect x="14.5" y="16" width="11" height="22" rx="1.5" fill="var(--gold)" opacity="0.5" />
            <rect x="27" y="4" width="11" height="34" rx="1.5" fill="var(--green)" opacity="0.5" />
          </svg>
          <p>Pick a topic above and click <strong>New question</strong> to get your first Foundation-tier question.</p>
        </div>
      )}

      {loadingQ && (
        <div className="card">
          <div className="q-label">Question</div>
          <div className="skeleton-line" style={{ width: '95%' }}></div>
          <div className="skeleton-line"></div>
        </div>
      )}

      {question && (
        <div className="card">
          <div className="q-label">Question</div>
          <div className="q-text">{question.question}</div>
        </div>
      )}

      {question && (
        <div className="card">
          <div className="q-label">Show your working</div>
          <textarea
            className="workbook-paper"
            value={working}
            onChange={(e) => setWorking(e.target.value)}
            placeholder={'Write each step on its own line, e.g.\n3/4 + 1/8\n= 6/8 + 1/8\n= 7/8'}
          />
          <div className="row">
            <button className="primary" onClick={submitWorking} disabled={marking}>
              {marking ? 'Marking...' : 'Mark my working'}
            </button>
            <button onClick={askHint} disabled={hintLoading}>
              {hintLoading ? 'Thinking...' : 'Ask for a hint instead'}
            </button>
          </div>
          {hints.length > 0 && (
            <div className="hint-log">
              {hints.map((h, i) => <div className="hint-bubble" key={i}>{h}</div>)}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="card">
          <div className="q-label">Marking</div>
          {(result.lines || []).map((line, i) => (
            <div className={`marked-line ${line.verdict}`} key={i}>
              <span className={`mark-icon ${line.verdict}`}>
                {line.verdict === 'correct' ? '✓' : line.verdict === 'error' ? '✗' : '~'}
              </span>
              <div>
                <div>{line.text}</div>
                <span className={`comment ${line.verdict}`}>{line.comment}</span>
              </div>
            </div>
          ))}
          {result.coachingMessage && (
            <div className="hint-bubble" style={{ marginBottom: 14 }}>
              <strong>Coach:</strong> {result.coachingMessage}
            </div>
          )}
          <div className="summary-grid">
            <div className="summary-box student-box">
              <h3>
                For the student{' '}
                <span className="score-tag">{result.overallScore}</span>{' '}
                <span className="score-tag" style={{ background: 'var(--gold)' }}>+{pointsForLines(result.lines)} pts</span>
              </h3>
              {result.studentFeedback}
            </div>
            <div className="summary-box parent-box">
              <h3>For parents</h3>
              {result.parentFeedback}
            </div>
          </div>

          <div className="chat-section">
            <div className="q-label" style={{ marginTop: 18 }}>Still not sure? Ask about it</div>
            {chatMessages.length > 0 && (
              <div className="chat-log">
                {chatMessages.map((m, i) => (
                  <div className={`chat-bubble ${m.role}`} key={i}>{m.content}</div>
                ))}
                {chatLoading && <div className="chat-bubble assistant"><span className="spinner"></span>thinking...</div>}
              </div>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <input
                type="text"
                placeholder="e.g. why did I lose a mark on line 2?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                style={{ flex: 1, minWidth: 180 }}
              />
              <button className="primary" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
