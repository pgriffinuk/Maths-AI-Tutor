'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';
import StatusPill from '../components/StatusPill';
import { COURSES, EXAM_BOARDS, BOARD_COURSES, courseDisplayLabel } from '../../lib/levels';
import { friendlyApiError } from '../../lib/apiError';

export default function Diagnostic() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState('start'); // 'start' | 'running' | 'results'
  const [board, setBoard] = useState('edexcel');
  const [course, setCourse] = useState(COURSES[0].key);

  const [topicIndex, setTopicIndex] = useState(0);
  const [slot, setSlot] = useState('standard1'); // 'standard1' | 'standard2' | 'ceiling'
  const [currentStandardResults, setCurrentStandardResults] = useState([]);
  const [topicResults, setTopicResults] = useState([]);

  const [question, setQuestion] = useState(null);
  const [working, setWorking] = useState('');
  const [loadingQ, setLoadingQ] = useState(false);
  const [marking, setMarking] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryAction, setRetryAction] = useState(null); // () => void, or null

  const selectedBoard = EXAM_BOARDS.find((b) => b.key === board) || EXAM_BOARDS[0];
  const availableCourses = COURSES.filter((c) => (BOARD_COURSES[selectedBoard.key] || []).includes(c.key));
  const selectedCourse = availableCourses.find((c) => c.key === course) || availableCourses[0] || COURSES[0];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);
    });
  }, [router]);

  // Pick up board/course pre-selected from the dashboard's diagnostic banner
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qBoard = params.get('board');
    const qCourse = params.get('course');
    if (qBoard) setBoard(qBoard);
    if (qCourse) setCourse(qCourse);
  }, []);

  async function generateQuestionForSlot() {
    setLoadingQ(true);
    setErrorMsg('');
    setRetryAction(null);
    setQuestion(null);
    setWorking('');
    try {
      const currentTopic = selectedCourse.topics[topicIndex];
      const difficulty = slot === 'ceiling' ? 'stretch' : 'exam-standard';
      const res = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: currentTopic, history: '', course, board, difficulty, accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(friendlyApiError(data));
        setRetryAction(() => generateQuestionForSlot);
        return;
      }
      setQuestion(data);
    } catch (err) {
      setErrorMsg(friendlyApiError({ code: 'network' }));
      setRetryAction(() => generateQuestionForSlot);
    } finally {
      setLoadingQ(false);
    }
  }

  useEffect(() => {
    if (phase === 'running' && session) generateQuestionForSlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, topicIndex, slot, session]);

  function startDiagnostic() {
    setTopicIndex(0);
    setSlot('standard1');
    setCurrentStandardResults([]);
    setTopicResults([]);
    setPhase('running');
  }

  function finalizeTopic(standardResults, ceilingAttempted, ceilingCorrect) {
    const correctCount = standardResults.filter(Boolean).length;
    const status = correctCount === 2 ? 'solid' : correctCount === 1 ? 'shaky' : 'gap';
    const newResult = {
      topic: selectedCourse.topics[topicIndex],
      standardCorrectCount: correctCount,
      standardTotalCount: standardResults.length,
      ceilingAttempted,
      ceilingCorrect,
      status
    };
    const updatedResults = [...topicResults, newResult];
    setTopicResults(updatedResults);
    setCurrentStandardResults([]);

    if (topicIndex + 1 >= selectedCourse.topics.length) {
      finishDiagnostic(updatedResults);
    } else {
      setTopicIndex((i) => i + 1);
      setSlot('standard1');
    }
  }

  function handleSlotOutcome(correct) {
    if (slot === 'standard1') {
      setCurrentStandardResults([correct]);
      setSlot('standard2');
    } else if (slot === 'standard2') {
      const results = [...currentStandardResults, correct];
      if (results[0] && results[1]) {
        setCurrentStandardResults(results);
        setSlot('ceiling');
      } else {
        finalizeTopic(results, false, null);
      }
    } else if (slot === 'ceiling') {
      finalizeTopic(currentStandardResults, true, correct);
    }
  }

  async function submitWorking() {
    if (!question || !working.trim()) return;
    setMarking(true);
    setErrorMsg('');
    setRetryAction(null);
    try {
      const difficulty = slot === 'ceiling' ? 'stretch' : 'exam-standard';
      const res = await fetch('/api/mark-working', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          workedSolution: question.workedSolution,
          keyMarkingPoints: question.keyMarkingPoints,
          studentWorking: working,
          history: '',
          course,
          board,
          difficulty,
          accessToken: session?.access_token
        })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(friendlyApiError(data));
        setRetryAction(() => submitWorking);
        return;
      }
      const lines = data.lines || [];
      const correct = lines.length > 0 && lines.every((l) => l.verdict !== 'error');
      handleSlotOutcome(correct);
    } catch (err) {
      setErrorMsg(friendlyApiError({ code: 'network' }));
      setRetryAction(() => submitWorking);
    } finally {
      setMarking(false);
    }
  }

  async function finishDiagnostic(results) {
    setSavingResults(true);
    try {
      await supabase.from('diagnostic_results').insert(
        results.map((r) => ({
          student_id: session.user.id,
          board,
          course,
          topic: r.topic,
          standard_correct_count: r.standardCorrectCount,
          standard_total_count: r.standardTotalCount,
          ceiling_attempted: r.ceilingAttempted,
          ceiling_correct: r.ceilingCorrect,
          status: r.status
        }))
      );
    } catch (err) {
      setErrorMsg(String(err.message || err));
    } finally {
      setSavingResults(false);
      setPhase('results');
    }
  }

  function goToPractice() {
    const weakest = topicResults.find((r) => r.status === 'gap')
      || topicResults.find((r) => r.status === 'shaky')
      || topicResults[0];
    const params = new URLSearchParams({ board, course, topic: weakest.topic });
    router.push(`/dashboard?${params.toString()}`);
  }

  if (!session) return null;

  if (phase === 'start') {
    return (
      <div className="wrap">
        <div className="topnav"><Logo size="sm" /></div>
        <div className="eyebrow section-gap">Diagnostic</div>
        <h1>Find your starting point</h1>
        <div className="card">
          <p>
            This asks a couple of questions on every topic in your course to see where
            you're solid and where you need work. It takes about 20-25 minutes - you
            can skip it now and take it later from your dashboard.
          </p>
          <div className="controls">
            <select
              value={board}
              onChange={(e) => {
                const newBoard = e.target.value;
                const newCourse = COURSES.find((c) => (BOARD_COURSES[newBoard] || []).includes(c.key));
                setBoard(newBoard);
                if (newCourse) setCourse(newCourse.key);
              }}
            >
              {EXAM_BOARDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              {availableCourses.map((c) => <option key={c.key} value={c.key}>{courseDisplayLabel(c, board)}</option>)}
            </select>
          </div>
          <div className="row">
            <button className="primary" onClick={startDiagnostic}>Start diagnostic</button>
            <button onClick={() => router.push('/dashboard')}>Skip for now</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'running') {
    const currentTopic = selectedCourse.topics[topicIndex];
    return (
      <div className="wrap">
        <div className="topnav"><Logo size="sm" /></div>
        <div className="eyebrow section-gap">{selectedBoard.label} · {selectedCourse.label}</div>
        <h1>Topic {topicIndex + 1} of {selectedCourse.topics.length}</h1>
        <div className="q-label" style={{ marginBottom: 10 }}>
          {currentTopic}{slot === 'ceiling' ? ' · Stretch check' : ''}
        </div>

        {errorMsg && (
          <div className="alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{errorMsg}</span>
            {retryAction && (
              <button onClick={() => retryAction()} style={{ fontSize: 12, padding: '5px 10px' }}>
                Try again
              </button>
            )}
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
              <button className="primary" onClick={submitWorking} disabled={marking || !working.trim()}>
                {marking ? 'Marking...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="topnav"><Logo size="sm" /></div>
      <div className="eyebrow section-gap">{selectedBoard.label} · {selectedCourse.label}</div>
      <h1>Your diagnostic results</h1>
      {topicResults.map((r) => (
        <div className="card" key={r.topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>{r.topic}</span>
          <StatusPill status={r.status} />
        </div>
      ))}
      <div className="row">
        <button className="primary" onClick={goToPractice} disabled={savingResults}>
          {savingResults ? 'Saving...' : 'Start practising'}
        </button>
      </div>
    </div>
  );
}
