'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';
import { COURSES, EXAM_BOARDS, BOARD_COURSES, courseDisplayLabel } from '../../lib/levels';
import { pointsForLines } from '../../lib/rewards';
import { buildExamPlan, formatEstimate, SECONDS_PER_QUESTION } from '../../lib/mockExam';
import { saveMockExamProgress, loadMockExamProgress, clearMockExamProgress } from '../../lib/mockExamStorage';
import { friendlyApiError } from '../../lib/apiError';

const PAPER_LENGTHS = [5, 10, 15];

// Rotated while the whole paper is being marked - the same "make a longer
// wait feel less like nothing is happening" treatment as the topic
// primer's worked-example loading messages, since marking several
// questions together genuinely takes a while.
const MARKING_LOADING_MESSAGES = [
  'Marking your paper...',
  'Adding up the score...',
  'Writing your feedback...',
  'Nearly there...'
];

export default function MockExam() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState('setup'); // 'setup' | 'running' | 'marking' | 'results'
  const [markingMessageIndex, setMarkingMessageIndex] = useState(0);

  const [board, setBoard] = useState('edexcel');
  const [course, setCourse] = useState(COURSES[0].key);
  const [numQuestions, setNumQuestions] = useState(5);

  const [examPlan, setExamPlan] = useState([]); // [{ mainTopicName, topic }]
  const [answers, setAnswers] = useState([]); // parallel to examPlan - null until saved, else { topic, question, workedSolution, keyMarkingPoints, studentWorking }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null); // { question, workedSolution, keyMarkingPoints }
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [working, setWorking] = useState('');
  const [examStartedAt, setExamStartedAt] = useState(null); // epoch ms
  const [secondsRemaining, setSecondsRemaining] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState(null); // { perQuestionResults, overallScorePercent, overallCoachingMessage }
  const [expandedResults, setExpandedResults] = useState({});

  const selectedBoard = EXAM_BOARDS.find((b) => b.key === board) || EXAM_BOARDS[0];
  const availableCourses = COURSES.filter((c) => (BOARD_COURSES[selectedBoard.key] || []).includes(c.key));
  const selectedCourse = availableCourses.find((c) => c.key === course) || availableCourses[0] || COURSES[0];

  // Signs in, then checks for an in-progress paper (see
  // lib/mockExamStorage.js) and resumes it directly - a refresh or an
  // accidental tab close mid-exam shouldn't lose the student's progress.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);
      const saved = loadMockExamProgress(data.session.user.id);
      if (saved && Array.isArray(saved.examPlan) && saved.examPlan.length > 0 && saved.examStartedAt) {
        setBoard(saved.board);
        setCourse(saved.course);
        setNumQuestions(saved.examPlan.length);
        setExamPlan(saved.examPlan);
        setAnswers(saved.answers || new Array(saved.examPlan.length).fill(null));
        setCurrentIndex(saved.currentIndex || 0);
        setCurrentQuestion(saved.currentQuestion || null);
        setWorking(saved.working || '');
        setExamStartedAt(saved.examStartedAt);
        setPhase('running');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Countdown - recomputed from the wall clock against examStartedAt every
  // tick, rather than just decrementing a counter, so it's correct even
  // straight after a resume (an in-memory-only countdown would have reset).
  useEffect(() => {
    if (phase !== 'running' || !examStartedAt || examPlan.length === 0) return;
    const totalSeconds = examPlan.length * SECONDS_PER_QUESTION;
    function tick() {
      const elapsed = Math.floor((Date.now() - examStartedAt) / 1000);
      setSecondsRemaining(Math.max(0, totalSeconds - elapsed));
    }
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [phase, examStartedAt, examPlan.length]);

  // Time's up - move straight to marking, same as clicking "Finish early".
  useEffect(() => {
    if (phase === 'running' && secondsRemaining === 0) finishExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsRemaining, phase]);

  // Rotates the marking-in-progress message, purely cosmetic - resets to
  // the first message each time a fresh marking pass starts.
  useEffect(() => {
    if (phase !== 'marking') {
      setMarkingMessageIndex(0);
      return;
    }
    const intervalId = setInterval(() => {
      setMarkingMessageIndex((i) => (i + 1) % MARKING_LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(intervalId);
  }, [phase]);

  // Autosave while the exam is running, so a refresh or closed tab doesn't
  // lose progress (see lib/mockExamStorage.js).
  useEffect(() => {
    if (phase !== 'running' || !session || !examStartedAt || examPlan.length === 0) return;
    saveMockExamProgress(session.user.id, { board, course, examPlan, answers, currentIndex, currentQuestion, working, examStartedAt });
  }, [phase, session, board, course, examPlan, answers, currentIndex, currentQuestion, working, examStartedAt]);

  async function loadQuestionAt(plan, index) {
    if (index >= plan.length) return;
    setLoadingQuestion(true);
    setCurrentQuestion(null);
    setErrorMsg('');
    try {
      const res = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: plan[index].topic, history: '', course, board, difficulty: 'exam-standard', accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(friendlyApiError(data));
        return;
      }
      setCurrentQuestion(data);
    } catch (err) {
      setErrorMsg(friendlyApiError({ code: 'network' }));
    } finally {
      setLoadingQuestion(false);
    }
  }

  function startExam() {
    const plan = buildExamPlan(selectedCourse, numQuestions);
    setExamPlan(plan);
    setAnswers(new Array(plan.length).fill(null));
    setCurrentIndex(0);
    setCurrentQuestion(null);
    setWorking('');
    setResults(null);
    setErrorMsg('');
    setExamStartedAt(Date.now());
    setSecondsRemaining(plan.length * SECONDS_PER_QUESTION);
    setPhase('running');
    loadQuestionAt(plan, 0);
  }

  // Stores this question's text/solution/working into the local answers
  // array and moves on - deliberately does NOT call any marking route yet,
  // matching how a real exam withholds feedback until the whole paper is
  // handed in.
  function saveAndNext() {
    const entry = {
      topic: examPlan[currentIndex].topic,
      question: currentQuestion?.question || '',
      workedSolution: currentQuestion?.workedSolution || [],
      keyMarkingPoints: currentQuestion?.keyMarkingPoints || '',
      studentWorking: working
    };
    const updatedAnswers = answers.map((a, i) => (i === currentIndex ? entry : a));
    setAnswers(updatedAnswers);
    setWorking('');
    if (currentIndex + 1 >= examPlan.length) {
      finishExam(updatedAnswers);
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      loadQuestionAt(examPlan, nextIndex);
    }
  }

  async function finishExam(answersOverride) {
    let finalAnswers = answersOverride || answers;
    // Capture whatever's on the page right now even if "Save & next" was
    // never clicked for the CURRENT question (time ran out mid-question, or
    // "Finish early" was clicked) - a real exam counts whatever's written
    // down when time's called, rather than discarding it.
    if (!answersOverride && currentQuestion && !finalAnswers[currentIndex]) {
      finalAnswers = finalAnswers.map((a, i) => (i === currentIndex ? {
        topic: examPlan[currentIndex].topic,
        question: currentQuestion.question,
        workedSolution: currentQuestion.workedSolution,
        keyMarkingPoints: currentQuestion.keyMarkingPoints,
        studentWorking: working
      } : a));
    }
    // Anything never even reached is a genuine blank - synthesized locally
    // rather than generated, since there's no point spending an AI call on
    // a question's text when it's just going to be marked "not attempted"
    // regardless of content.
    finalAnswers = finalAnswers.map((a, i) => a || {
      topic: examPlan[i].topic,
      question: "This question wasn't reached before time ran out.",
      workedSolution: [],
      keyMarkingPoints: '',
      studentWorking: ''
    });

    setAnswers(finalAnswers);
    setPhase('marking');
    setErrorMsg('');
    try {
      const res = await fetch('/api/mark-mock-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, course, difficulty: 'exam-standard', answers: finalAnswers, accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(friendlyApiError(data));
        return;
      }
      await saveMockExamResults(finalAnswers, data);
      setResults(data);
      if (session) clearMockExamProgress(session.user.id);
      setPhase('results');
    } catch (err) {
      setErrorMsg(friendlyApiError({ code: 'network' }));
    }
  }

  // One mock_exams row for the paper, one attempts row per question (linked
  // via mock_exam_id) - same shape and same points formula as a regular
  // practice attempt, so this contributes to rewards/mastery/Guided Path
  // exactly like normal practice would.
  async function saveMockExamResults(finalAnswers, data) {
    if (!session) return;
    const { data: examRow, error: examError } = await supabase
      .from('mock_exams')
      .insert({
        student_id: session.user.id,
        board,
        course,
        num_questions: finalAnswers.length,
        overall_score_percent: data.overallScorePercent
      })
      .select('id')
      .single();
    if (examError) { console.error('Could not save mock exam:', examError.message); return; }

    const attemptRows = data.perQuestionResults.map((r, i) => ({
      student_id: session.user.id,
      course,
      board,
      difficulty: 'exam-standard',
      topic: r.topic,
      question: r.question,
      student_working: finalAnswers[i].studentWorking,
      overall_score: r.overallScore,
      student_feedback: r.studentFeedback,
      parent_feedback: r.parentFeedback,
      marked_lines: r.lines,
      points: pointsForLines(r.lines),
      mock_exam_id: examRow?.id ?? null
    }));
    const { error: attemptsError } = await supabase.from('attempts').insert(attemptRows);
    if (attemptsError) console.error('Could not save mock exam attempts:', attemptsError.message);
  }

  if (!session) return null;

  if (phase === 'setup') {
    return (
      <div className="wrap">
        <div className="topnav"><Logo size="sm" /></div>
        <div className="eyebrow section-gap">Mock Exam</div>
        <h1>Set up your mock exam</h1>
        <div className="card">
          <p>
            A full paper spread across your course's topics, marked all together at the
            end once you've handed it in - no feedback until then, just like the real thing.
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
            {PAPER_LENGTHS.map((n) => (
              <button
                key={n}
                type="button"
                className={numQuestions === n ? 'primary' : ''}
                onClick={() => setNumQuestions(n)}
              >
                {n} questions ({formatEstimate(n)})
              </button>
            ))}
          </div>
          <div className="row">
            <button className="primary" onClick={startExam}>Start mock exam</button>
            <button onClick={() => router.push('/dashboard')}>Back to dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'running') {
    const minutes = secondsRemaining === null ? null : Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining === null ? null : secondsRemaining % 60;
    const timeLabel = secondsRemaining === null ? '--:--' : `${minutes}:${String(seconds).padStart(2, '0')}`;
    const isLastQuestion = currentIndex + 1 >= examPlan.length;
    return (
      <div className="wrap">
        <div className="topnav">
          <Logo size="sm" />
          <span
            className="score-tag"
            style={{ background: secondsRemaining !== null && secondsRemaining < 60 ? 'var(--red)' : 'var(--ink)' }}
          >
            {timeLabel}
          </span>
        </div>
        <div className="eyebrow section-gap">{selectedBoard.label} · {selectedCourse.label}</div>
        <h1>Question {currentIndex + 1} of {examPlan.length}</h1>
        <div className="q-label" style={{ marginBottom: 10 }}>{examPlan[currentIndex]?.mainTopicName}</div>

        {errorMsg && (
          <div className="alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{errorMsg}</span>
            <button onClick={() => loadQuestionAt(examPlan, currentIndex)} style={{ fontSize: 12, padding: '5px 10px' }}>
              Try again
            </button>
          </div>
        )}

        {loadingQuestion && (
          <div className="card">
            <div className="q-label">Question</div>
            <div className="skeleton-line" style={{ width: '95%' }}></div>
            <div className="skeleton-line"></div>
          </div>
        )}

        {currentQuestion && !loadingQuestion && (
          <div className="card">
            <div className="q-label">Question</div>
            <div className="q-text">{currentQuestion.question}</div>
          </div>
        )}

        {currentQuestion && !loadingQuestion && (
          <div className="card">
            <div className="q-label">Show your working</div>
            <textarea
              className="workbook-paper"
              value={working}
              onChange={(e) => setWorking(e.target.value)}
              placeholder={'Write each step on its own line, e.g.\n3/4 + 1/8\n= 6/8 + 1/8\n= 7/8'}
            />
            <div className="row">
              <button className="primary" onClick={saveAndNext}>
                {isLastQuestion ? 'Save & finish' : 'Save & next'}
              </button>
              <button onClick={() => finishExam()}>Finish early</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'marking') {
    return (
      <div className="wrap">
        <div className="topnav"><Logo size="sm" /></div>
        <div className="eyebrow section-gap">Mock Exam</div>
        <h1>Marking your paper...</h1>
        <div className="card">
          <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
            <span className="spinner"></span>
            {MARKING_LOADING_MESSAGES[markingMessageIndex]}
          </p>
          <p style={{ margin: '8px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>
            This can take a little while for a full paper - please don&apos;t close this tab.
          </p>
        </div>
        {errorMsg && (
          <div className="alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{errorMsg}</span>
            <button onClick={() => finishExam(answers)} style={{ fontSize: 12, padding: '5px 10px' }}>
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  // phase === 'results'
  if (!results) return null;
  return (
    <div className="wrap">
      <div className="topnav"><Logo size="sm" /></div>
      <div className="eyebrow section-gap">{selectedBoard.label} · {selectedCourse.label}</div>
      <h1>Your mock exam results</h1>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-zilla-slab), serif', fontSize: 44, fontWeight: 700 }}>
          {results.overallScorePercent}%
        </div>
        <p style={{ margin: '10px 0 0' }}>{results.overallCoachingMessage}</p>
      </div>

      {results.perQuestionResults.map((r, i) => {
        const isExpanded = !!expandedResults[i];
        const hasError = (r.lines || []).some((l) => l.verdict === 'error');
        return (
          <div className="card" key={i}>
            <button
              type="button"
              onClick={() => setExpandedResults((prev) => ({ ...prev, [i]: !isExpanded }))}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, fontWeight: 400 }}
            >
              <span><strong>Question {i + 1}</strong> · {r.topic}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="score-tag" style={{ background: hasError ? 'var(--red)' : 'var(--green)' }}>{r.overallScore}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{isExpanded ? 'Hide' : 'Show'}</span>
              </span>
            </button>
            {isExpanded && (
              <div style={{ marginTop: 14 }}>
                <div className="q-text" style={{ marginBottom: 12 }}>{r.question}</div>
                {(r.lines || []).map((line, li) => (
                  <div className={`marked-line ${line.verdict}`} key={li}>
                    <span className={`mark-icon ${line.verdict}`}>
                      {line.verdict === 'correct' ? '✓' : line.verdict === 'error' ? '✗' : '~'}
                    </span>
                    <div>
                      <div>{line.text}</div>
                      <span className={`comment ${line.verdict}`}>{line.comment}</span>
                    </div>
                  </div>
                ))}
                <div className="summary-grid">
                  <div className="summary-box student-box">
                    <h3>For the student <span className="score-tag">{r.overallScore}</span></h3>
                    {r.studentFeedback}
                  </div>
                  <div className="summary-box parent-box">
                    <h3>For parents</h3>
                    {r.parentFeedback}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="row">
        <button className="primary" onClick={() => router.push('/dashboard')}>Back to dashboard</button>
      </div>
    </div>
  );
}
