'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';

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
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);
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
          marked_lines: data.lines
        });
      }
      setProgress((p) => ({ count: (p?.count || 0) + 1 }));
    } catch (err) {
      setErrorMsg(String(err.message || err));
    } finally {
      setMarking(false);
    }
  }

  if (!session) return null;

  return (
    <div className="wrap">
      <div className="topnav">
        <Logo size="sm" />
        <button onClick={handleLogout} style={{ fontSize: 12, padding: '5px 10px' }}>Log out</button>
      </div>
      <div className="eyebrow" style={{ marginTop: 18 }}>Edexcel IGCSE · Foundation Tier</div>
      <h1>Marked Practice</h1>

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

      {errorMsg && <div className="error-msg">{errorMsg}</div>}

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
              <h3>For the student <span className="score-tag">{result.overallScore}</span></h3>
              {result.studentFeedback}
            </div>
            <div className="summary-box parent-box">
              <h3>For parents</h3>
              {result.parentFeedback}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
