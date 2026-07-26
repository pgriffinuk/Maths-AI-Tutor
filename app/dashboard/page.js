'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';
import { pointsForLines, computeStreak, computeBadges, computeTopicStatus, findDueReviews, TOPIC_STATUS_INFO } from '../../lib/rewards';
import { getUnmetPrerequisites, getRecommendedTopic } from '../../lib/skillTree';
import { COURSES, EXAM_BOARDS, SPEC_CODES, DIFFICULTY_LEVELS, BOARD_COURSES, courseDisplayLabel, flattenTopics } from '../../lib/levels';
import StatusPill from '../components/StatusPill';
import SpeakButton from '../components/SpeakButton';
import StepList from '../components/StepList';
import SearchableSelect from '../components/SearchableSelect';
import { speak } from '../../lib/speech';
import { friendlyApiError } from '../../lib/apiError';
import { saveInProgress, loadInProgress, clearInProgress } from '../../lib/inProgressStorage';
import { isReviewDismissed, dismissReview } from '../../lib/reviewDismissals';
import { sanitizeSvg } from '../../lib/sanitizeSvg';

// Rotated while the primer's 'example' phase is loading - doesn't make it
// any faster, just makes the wait feel less like nothing is happening.
const PRIMER_EXAMPLE_LOADING_MESSAGES = [
  'Working out the steps...',
  'Sketching the diagram...',
  'Nearly there...'
];

// Kept off until Stripe is actually wired up - flip to true once billing is
// ready to enforce, so nobody (including test accounts with no
// subscription_status set) gets locked out before then.
const BILLING_GATE_ENABLED = false;

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [board, setBoard] = useState('edexcel');
  const [course, setCourse] = useState(COURSES[0].key);
  const [topic, setTopic] = useState(COURSES[0].topics[0].subtopics[0]);
  const [difficulty, setDifficulty] = useState('exam-standard');
  const [question, setQuestion] = useState(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [working, setWorking] = useState('');
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState(null);
  const [hints, setHints] = useState([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryAction, setRetryAction] = useState(null); // () => void, or null
  const [progress, setProgress] = useState(null); // { count, correctCount, recentSummary }
  const [rewards, setRewards] = useState(null); // { totalPoints, streak, badges }
  const [recentAttempts, setRecentAttempts] = useState([]); // raw attempts backing rewards - reused for Guided Path topic status
  const [badgeCelebrationQueue, setBadgeCelebrationQueue] = useState([]); // newly-unlocked badges waiting to celebrate
  const [activeBadgeCelebration, setActiveBadgeCelebration] = useState(null); // the one currently showing, or null
  const [mode, setMode] = useState('free'); // 'free' | 'guided' - persisted as profiles.preferred_mode
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0); // submitWorking calls on the CURRENT question, reset per new question
  const [showFullSolution, setShowFullSolution] = useState(false);
  const [lockedNoteTopic, setLockedNoteTopic] = useState(null); // Guided Path: topic whose "practice the prerequisite instead?" note is showing
  const [expandedGuidedTopics, setExpandedGuidedTopics] = useState({}); // Guided Path: { [mainTopicName]: bool } - explicit overrides of the default auto-expand
  const [dueReview, setDueReview] = useState(null); // spaced review nudge: the single most-overdue mastered topic not recently dismissed, or null
  const [attemptId, setAttemptId] = useState(null);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagComment, setFlagComment] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagSubmitted, setFlagSubmitted] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [diagnosticStatuses, setDiagnosticStatuses] = useState({});
  const [diagnosticLoaded, setDiagnosticLoaded] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  // Two-phase primer loading: 'explanation' (plainExplanation + keyIdeas) is
  // small and fast, so it's fetched and shown first; 'example'
  // (workedExample + commonMistake) is the heavier, diagram-heavy content,
  // fetched separately in the background so it never blocks the
  // explanation from appearing. Each phase - only valid while it matches
  // the current topic/board/course selection - tracks its own
  // loading/error state so a slow or failed 'example' phase never affects
  // the already-displayed explanation.
  const [primerExplanation, setPrimerExplanation] = useState(null); // { topic, board, course, content }
  const [primerLoading, setPrimerLoading] = useState(false);
  const [primerError, setPrimerError] = useState('');
  const [primerExample, setPrimerExample] = useState(null); // { topic, board, course, content }
  const [primerExampleLoading, setPrimerExampleLoading] = useState(false);
  const [primerExampleError, setPrimerExampleError] = useState('');
  const [primerExampleLoadingMessageIndex, setPrimerExampleLoadingMessageIndex] = useState(0);
  const [primerVisible, setPrimerVisible] = useState(false);
  const [primerStage, setPrimerStage] = useState('summary'); // 'summary' | step index (number) | 'mistake'
  const [restoredBannerVisible, setRestoredBannerVisible] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null); // () => void, or null - queued nav action awaiting the "leave anyway?" confirm

  const selectedBoard = EXAM_BOARDS.find((b) => b.key === board) || EXAM_BOARDS[0];
  const availableCourses = COURSES.filter((c) => (BOARD_COURSES[selectedBoard.key] || []).includes(c.key));
  const selectedCourse = availableCourses.find((c) => c.key === course) || availableCourses[0] || COURSES[0];
  const specCode = (SPEC_CODES[selectedBoard.key] && SPEC_CODES[selectedBoard.key][selectedCourse.key]) || '';

  // Pick up board/course/topic pre-selected from the diagnostic results screen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qBoard = params.get('board');
    const qCourse = params.get('course');
    const qTopic = params.get('topic');
    if (qBoard) setBoard(qBoard);
    if (qCourse) setCourse(qCourse);
    if (qTopic) setTopic(qTopic);
    if (qBoard || qCourse || qTopic) router.replace('/dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDiagnosticStatuses() {
    if (!session) return;
    setDiagnosticLoaded(false);
    const { data } = await supabase
      .from('diagnostic_results')
      .select('topic, status, created_at')
      .eq('student_id', session.user.id)
      .eq('board', board)
      .eq('course', course)
      .order('created_at', { ascending: false });

    const statuses = {};
    for (const row of data || []) {
      if (!(row.topic in statuses)) statuses[row.topic] = row.status;
    }
    setDiagnosticStatuses(statuses);
    setDiagnosticLoaded(true);
  }

  useEffect(() => {
    if (session) loadDiagnosticStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, board, course]);

  // `checkForNewBadges` is only ever true when called right after an
  // attempt is submitted - never on the initial mount's load, which would
  // otherwise "celebrate" every badge someone already has every time they
  // log in.
  async function loadRewards({ checkForNewBadges = false } = {}) {
    if (!session) return;
    const { data } = await supabase
      .from('attempts')
      .select('topic, points, marked_lines, created_at, course, board')
      .eq('student_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    const attempts = data || [];
    const totalPoints = attempts.reduce((sum, a) => sum + (a.points || 0), 0);
    const badges = computeBadges(attempts);

    if (checkForNewBadges && rewards) {
      const previousBadges = rewards.badges || [];
      const newlyUnlocked = badges.filter((b) => {
        if (!b.unlocked) return false;
        const prev = previousBadges.find((p) => p.id === b.id);
        return !prev || !prev.unlocked;
      });
      if (newlyUnlocked.length > 0) {
        setBadgeCelebrationQueue((q) => [...q, ...newlyUnlocked]);
      }
    }

    setRewards({ totalPoints, streak: computeStreak(attempts), badges });
    setRecentAttempts(attempts);
  }

  useEffect(() => {
    if (session) loadRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Spaced review nudge: recomputed fresh from the same attempts backing
  // rewards/Guided Path every time they reload - take the single most
  // overdue mastered topic, skipping over any the student dismissed within
  // the last few days (see lib/reviewDismissals.js) rather than just taking
  // the global most-overdue one regardless of dismissal.
  useEffect(() => {
    if (recentAttempts.length === 0) { setDueReview(null); return; }
    const due = findDueReviews(recentAttempts);
    setDueReview(due.find((r) => !isReviewDismissed(r.board, r.course, r.topic)) || null);
  }, [recentAttempts]);

  // Queues newly-unlocked badge celebrations one after another rather than
  // overlapping - each shows for its full pop-in/hold/fade-out animation
  // before the next one starts.
  useEffect(() => {
    if (activeBadgeCelebration || badgeCelebrationQueue.length === 0) return;
    const [next, ...rest] = badgeCelebrationQueue;
    setActiveBadgeCelebration(next);
    setBadgeCelebrationQueue(rest);
  }, [activeBadgeCelebration, badgeCelebrationQueue]);

  useEffect(() => {
    if (!activeBadgeCelebration) return;
    const timeoutId = setTimeout(() => setActiveBadgeCelebration(null), 3800);
    return () => clearTimeout(timeoutId);
  }, [activeBadgeCelebration]);

  // Rotates the "Working out the steps... / Sketching the diagram... /
  // Nearly there..." message while the example phase is loading, purely
  // cosmetic - resets to the first message each time a fresh load starts.
  useEffect(() => {
    if (!primerExampleLoading) {
      setPrimerExampleLoadingMessageIndex(0);
      return;
    }
    const intervalId = setInterval(() => {
      setPrimerExampleLoadingMessageIndex((i) => (i + 1) % PRIMER_EXAMPLE_LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(intervalId);
  }, [primerExampleLoading]);

  // Fetches (or re-shows an already-fetched) explanation phase for the
  // CURRENT board/course/topic. Client-side cache check first so re-opening
  // the same topic's primer never re-hits the API.
  async function fetchPrimerExplanation() {
    if (primerExplanation && primerExplanation.topic === topic && primerExplanation.board === board && primerExplanation.course === course) {
      return;
    }
    setPrimerLoading(true);
    setPrimerError('');
    try {
      const res = await fetch('/api/generate-primer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, course, topic, phase: 'explanation', accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setPrimerError(
          data.code === 'response_too_long'
            ? 'That explanation was too long and got cut off - try again'
            : "Couldn't load the explanation"
        );
      } else {
        setPrimerExplanation({ topic, board, course, content: data.content });
        // Only speak the chunk that's actually visible right now (the
        // summary) - the worked example and common mistake get spoken as
        // the student steps into them, not all dumped out upfront.
        if (autoRead) {
          const summary = [data.content.plainExplanation, ...(data.content.keyIdeas || [])].filter(Boolean).join('. ');
          if (summary) speak(summary);
        }
      }
    } catch (err) {
      setPrimerError("Couldn't load the explanation");
    } finally {
      setPrimerLoading(false);
    }
  }

  // Fetches (or re-shows an already-fetched) example phase - the slower,
  // diagram-heavy part - separately from the explanation, so a slow or
  // failed fetch here never blocks or breaks the already-showing
  // explanation.
  async function fetchPrimerExample() {
    if (primerExample && primerExample.topic === topic && primerExample.board === board && primerExample.course === course) {
      return;
    }
    setPrimerExampleLoading(true);
    setPrimerExampleError('');
    try {
      const res = await fetch('/api/generate-primer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, course, topic, phase: 'example', accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setPrimerExampleError(
          data.code === 'response_too_long'
            ? 'That worked example was too long and got cut off - try again'
            : "Couldn't load the worked example"
        );
      } else {
        setPrimerExample({ topic, board, course, content: data.content });
      }
    } catch (err) {
      setPrimerExampleError("Couldn't load the worked example");
    } finally {
      setPrimerExampleLoading(false);
    }
  }

  // Kicks off both phases in parallel - the explanation is small and
  // returns quickly so it appears almost immediately, while the heavier
  // example phase keeps loading in the background (see the "Loading a
  // worked example..." state in the render below) rather than making the
  // student wait for both before seeing anything.
  function fetchPrimer() {
    setPrimerVisible(true);
    setPrimerStage('summary');
    fetchPrimerExplanation();
    fetchPrimerExample();
  }

  // Guided Path pairing: a topic the student hasn't touched yet is exactly
  // when a primer is most useful, so auto-show it (already expanded) rather
  // than waiting for a click - but only for genuinely new topics, not ones
  // already in progress or mastered, and never in Free practice. Hides
  // whatever primer was showing whenever the topic changes, so an old
  // topic's primer never lingers under a new one's heading.
  const rewardsReady = rewards !== null;
  useEffect(() => {
    setPrimerVisible(false);
    setPrimerStage('summary');
    if (mode === 'guided' && rewardsReady) {
      const status = computeTopicStatus(recentAttempts, course, board, topic);
      if (status === 'not-started') fetchPrimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, course, board, mode, rewardsReady]);

  async function loadProgress(forTopic, forCourse = course, forBoard = board) {
    if (!session) return '';
    const { data } = await supabase
      .from('attempts')
      .select('overall_score, student_feedback, created_at')
      .eq('student_id', session.user.id)
      .eq('course', forCourse)
      .eq('board', forBoard)
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
        .select('is_teacher, auto_read, subscription_status, preferred_mode')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (profileError) console.error('Could not load profile.is_teacher:', profileError.message);
      setIsTeacher(!!profile?.is_teacher);
      setAutoRead(!!profile?.auto_read);
      setSubscriptionStatus(profile?.subscription_status ?? null);
      setMode(profile?.preferred_mode === 'guided' ? 'guided' : 'free');

      // Resume an in-progress question after an accidental refresh or tab
      // close - but not when the URL is a deliberate hand-off from the
      // diagnostic results screen (board/course/topic query params), since
      // that's a navigation the student just made on purpose and should win.
      const params = new URLSearchParams(window.location.search);
      const isHandoff = params.get('board') || params.get('course') || params.get('topic');
      if (!isHandoff) {
        const saved = loadInProgress(data.session.user.id);
        if (saved && saved.question) {
          if (saved.board) setBoard(saved.board);
          if (saved.course) setCourse(saved.course);
          if (saved.topic) setTopic(saved.topic);
          if (saved.difficulty) setDifficulty(saved.difficulty);
          setQuestion(saved.question);
          setWorking(saved.working || '');
          setChatMessages(saved.chatMessages || []);
          setHints(saved.hints || []);
          setRestoredBannerVisible(true);
        }
      }
    });
  }, [router]);

  // Debounced autosave of the in-progress question (board/course/topic/
  // difficulty, the question, working, chat, hints) so it survives an
  // accidental refresh/tab close. Waits 500ms after the last change before
  // writing, so it isn't hitting localStorage on every keystroke while
  // typing working-out or a chat message. Nothing to save once there's no
  // active question (e.g. right after "New question" clears it).
  useEffect(() => {
    if (!session || !question) return;
    const timeoutId = setTimeout(() => {
      saveInProgress(session.user.id, { board, course, topic, difficulty, question, working, chatMessages, hints });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [session, board, course, topic, difficulty, question, working, chatMessages, hints]);

  // True exactly while there's typed working that hasn't been marked yet
  // for the current question - submitWorking sets `result` on success, and
  // newQuestion clears both `working` and `result` back to empty/null, so
  // this naturally goes false the moment either of those "don't warn me"
  // triggers happens, with nothing extra to reset by hand.
  const hasUnsubmittedWorking = working.trim() !== '' && !result;

  // Warn before an actual tab close/refresh, native "leave site?" prompt -
  // browsers show their own fixed text for this regardless of what
  // returnValue is set to, so there's no custom message to write here.
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (hasUnsubmittedWorking) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsubmittedWorking]);

  // Routes any in-app navigation (Billing, Progress, Teacher view, Log out,
  // "Take the diagnostic") through a same-styled confirm instead of a
  // native confirm() when there's unsubmitted working - navigates straight
  // through with no interruption otherwise.
  function guardedNavigate(action) {
    if (hasUnsubmittedWorking) {
      setPendingNavigation(() => action);
    } else {
      action();
    }
  }

  async function handleLogout() {
    if (session) clearInProgress(session.user.id);
    await supabase.auth.signOut();
    router.replace('/');
  }

  async function toggleAutoRead() {
    if (!session) return;
    const next = !autoRead;
    setAutoRead(next);
    await supabase.from('profiles').update({ auto_read: next }).eq('id', session.user.id);
  }

  async function updateMode(next) {
    if (!session || next === mode) return;
    setMode(next);
    await supabase.from('profiles').update({ preferred_mode: next }).eq('id', session.user.id);
  }

  // Accepts optional overrides so a caller that just changed board/course/
  // topic/difficulty state (e.g. the spaced-review banner's "Review now")
  // can fetch against the NEW values immediately, rather than the stale
  // values still captured in this render's closure until the next render.
  async function newQuestion(overrides = {}) {
    const effTopic = overrides.topic ?? topic;
    const effCourse = overrides.course ?? course;
    const effBoard = overrides.board ?? board;
    const effDifficulty = overrides.difficulty ?? difficulty;
    if (session) clearInProgress(session.user.id);
    setLoadingQ(true);
    setErrorMsg('');
    setRetryAction(null);
    setRestoredBannerVisible(false);
    setQuestion(null);
    setResult(null);
    setHints([]);
    setWorking('');
    setChatMessages([]);
    setSubmissionCount(0);
    setShowFullSolution(false);
    setAttemptId(null);
    setShowFlagForm(false);
    setFlagComment('');
    setFlagSubmitted(false);
    try {
      const history = await loadProgress(effTopic, effCourse, effBoard);
      const res = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: effTopic, history, course: effCourse, board: effBoard, difficulty: effDifficulty, accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(friendlyApiError(data));
        setRetryAction(() => newQuestion);
        return;
      }
      setQuestion(data);
      if (autoRead) speak(data.question);
    } catch (err) {
      setErrorMsg(friendlyApiError({ code: 'network' }));
      setRetryAction(() => newQuestion);
    } finally {
      setLoadingQ(false);
    }
  }

  // "Review now" on the spaced-review banner - jumps the selectors straight
  // to the overdue topic and fires off a question for it immediately,
  // rather than just selecting it and making the student click "New
  // question" themselves.
  function reviewNow(review) {
    setBoard(review.board);
    setCourse(review.course);
    setTopic(review.topic);
    setDifficulty('exam-standard');
    setProgress(null);
    setLockedNoteTopic(null);
    setDueReview(null);
    newQuestion({ board: review.board, course: review.course, topic: review.topic, difficulty: 'exam-standard' });
  }

  function dismissDueReview() {
    if (!dueReview) return;
    dismissReview(dueReview.board, dueReview.course, dueReview.topic);
    setDueReview(null);
  }

  async function askHint() {
    if (!question) return;
    setHintLoading(true);
    setErrorMsg('');
    setRetryAction(null);
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.question, studentWorking: working, course, board, difficulty, accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(friendlyApiError(data));
        setRetryAction(() => askHint);
      } else {
        setHints((h) => [...h, data.hint]);
        if (autoRead) speak(data.hint);
      }
    } catch (err) {
      setErrorMsg(friendlyApiError({ code: 'network' }));
      setRetryAction(() => askHint);
    } finally {
      setHintLoading(false);
    }
  }

  async function submitWorking() {
    if (!question || !working.trim()) return;
    setMarking(true);
    setErrorMsg('');
    setRetryAction(null);
    setShowFullSolution(false);
    setAttemptId(null);
    setShowFlagForm(false);
    setFlagComment('');
    setFlagSubmitted(false);
    try {
      const progressHistory = await loadProgress(topic);
      // Skill-tree awareness: if this topic depends on a prerequisite the
      // student hasn't mastered yet, flag that as context for the AI's
      // coachingMessage - it decides whether the actual errors shown look
      // prerequisite-related, we don't assume that ourselves.
      const unmetPrereqs = getUnmetPrerequisites(recentAttempts, course, board, topic);
      const prereqNote = unmetPrereqs.length > 0
        ? `\nNote: this topic depends on '${unmetPrereqs[0]}', which this student hasn't yet mastered - if their errors look like they stem from that gap rather than this topic itself, mention that possibility in the coachingMessage.`
        : '';
      const history = progressHistory + prereqNote;
      const res = await fetch('/api/mark-working', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          workedSolution: question.workedSolution,
          keyMarkingPoints: question.keyMarkingPoints,
          studentWorking: working,
          history,
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
      setResult(data);
      // Counts real marked submissions on this specific question - the full
      // solution reveal below is gated on this being their 2nd+ attempt.
      setSubmissionCount((n) => n + 1);
      if (autoRead) {
        const toRead = [data.studentFeedback, data.coachingMessage].filter(Boolean).join('. ');
        if (toRead) speak(toRead);
      }
      const earnedPoints = pointsForLines(data.lines);

      // Save this attempt so it feeds into future progress/reports
      if (session) {
        const { data: savedAttempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            student_id: session.user.id,
            course,
            board,
            difficulty,
            topic,
            question: question.question,
            student_working: working,
            overall_score: data.overallScore,
            student_feedback: data.studentFeedback,
            parent_feedback: data.parentFeedback,
            marked_lines: data.lines,
            points: earnedPoints
          })
          .select('id')
          .single();
        if (attemptError) console.error('Could not save attempt:', attemptError.message);
        setAttemptId(savedAttempt?.id ?? null);
        loadRewards({ checkForNewBadges: true });
      }
      setProgress((p) => ({ count: (p?.count || 0) + 1 }));
    } catch (err) {
      setErrorMsg(friendlyApiError({ code: 'network' }));
      setRetryAction(() => submitWorking);
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
    setErrorMsg('');
    setRetryAction(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          studentWorking: working,
          markingResult: result,
          history: chatMessages,
          message,
          course,
          board,
          difficulty,
          accessToken: session?.access_token
        })
      });
      const data = await res.json();
      if (data.error) {
        // Roll back the optimistic bubble and put the message back in the
        // input so "Try again" can just resend it without retyping.
        setChatMessages((h) => h.slice(0, -1));
        setChatInput(message);
        setErrorMsg(friendlyApiError(data));
        setRetryAction(() => sendChatMessage);
      } else {
        setChatMessages((h) => [...h, { role: 'assistant', content: data.reply }]);
        if (autoRead) speak(data.reply);
      }
    } catch (err) {
      setChatMessages((h) => h.slice(0, -1));
      setChatInput(message);
      setErrorMsg(friendlyApiError({ code: 'network' }));
      setRetryAction(() => sendChatMessage);
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

  async function submitFlag() {
    if (!session || !question || !result) return;
    setFlagSubmitting(true);
    await supabase.from('marking_flags').insert({
      student_id: session.user.id,
      attempt_id: attemptId,
      question: question.question,
      student_working: working,
      marking_result: result,
      student_comment: flagComment.trim() || null
    });
    setFlagSubmitting(false);
    setFlagSubmitted(true);
  }

  if (!session) return null;

  const billingLocked = BILLING_GATE_ENABLED
    && !isTeacher
    && subscriptionStatus !== 'active'
    && subscriptionStatus !== 'trialing';

  if (billingLocked) {
    return (
      <>
        <div className="app-bg-wash" aria-hidden="true" />
        <div className="wrap app-content">
          <div className="topnav">
            <Logo size="sm" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => router.push('/billing')} style={{ fontSize: 12, padding: '5px 10px' }}>
                Billing
              </button>
              <button onClick={handleLogout} style={{ fontSize: 12, padding: '5px 10px' }}>Log out</button>
            </div>
          </div>
          <div className="card empty-state">
            <p>Your trial or subscription isn&apos;t active. <a href="/billing">Go to billing</a> to get access.</p>
          </div>
        </div>
      </>
    );
  }

  // Deliberately gated, not just a UI toggle: the full worked solution is
  // only offered after a genuine second (or later) struggle on THIS
  // question, and only while they still haven't got it right. Showing it
  // after a single attempt - or once they've already succeeded - would
  // undercut the productive struggle that makes practice worth doing, so
  // don't loosen this without weighing that tradeoff.
  const hasUnresolvedError = !!result && (result.lines || []).some((l) => l.verdict === 'error');
  const canRevealFullSolution = hasUnresolvedError && submissionCount >= 2;

  // Guided Path: per-SUBTOPIC status computed live from recentAttempts (no
  // separate table), in the same order the course lists its topics - a main
  // topic name is purely a UI grouping label, mastery is always tracked at
  // the specific-subtopic level. "Recommended next" is skill-tree-aware:
  // it's not just the first subtopic that isn't mastered yet - if that
  // subtopic has an unmet prerequisite, the prerequisite gets recommended
  // instead (see lib/skillTree.js).
  const allSubtopics = flattenTopics(selectedCourse);
  const subtopicStatuses = allSubtopics.map(
    (t) => computeTopicStatus(recentAttempts, course, board, t)
  );
  const masteredCount = subtopicStatuses.filter((s) => s === 'mastered').length;
  const recommendedTopic = getRecommendedTopic(recentAttempts, course, board, allSubtopics);

  // Sub-topics in the CURRENT board/course that are mastered but overdue for
  // a spaced review (same 14-day rule as the dashboard banner) - shown as a
  // small indicator per row rather than recomputed per-row from scratch.
  const dueReviewTopics = new Set(
    findDueReviews(recentAttempts)
      .filter((r) => r.board === board && r.course === course)
      .map((r) => r.topic)
  );

  // diagnostic_results is keyed by MAIN topic name (the diagnostic itself
  // stays at that granularity - see app/diagnostic/page.js), but `topic`
  // here is always a specific subtopic, so the currently-selected
  // subtopic's diagnostic status has to be looked up via its parent's name.
  const currentMainTopicName = selectedCourse.topics.find((t) => t.subtopics.includes(topic))?.name;

  // Shared row renderer for a single practiceable subtopic in Guided Path -
  // used both directly (a main topic with only one subtopic) and nested
  // under an expanded multi-subtopic group.
  function renderGuidedSubtopicRow(t) {
    const status = computeTopicStatus(recentAttempts, course, board, t);
    const info = TOPIC_STATUS_INFO[status];
    const isSelected = t === topic;
    const isRecommended = t === recommendedTopic;
    // Skill-tree awareness: locked is a visual nudge only, never a hard
    // block - clicking still selects the topic like any other.
    const unmetPrereqs = getUnmetPrerequisites(recentAttempts, course, board, t);
    const isLocked = unmetPrereqs.length > 0;
    // Only mastered topics are ever in dueReviewTopics (see findDueReviews),
    // so this can't collide with the in-progress/not-started dot colours.
    const isDueForReview = dueReviewTopics.has(t);
    return (
      <div key={t}>
        <button
          type="button"
          onClick={() => {
            setTopic(t);
            setProgress(null);
            setLockedNoteTopic(isLocked ? t : null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textAlign: 'left',
            padding: '10px 12px',
            borderRadius: 8,
            width: '100%',
            border: isSelected ? '2px solid var(--ink)' : isRecommended ? '2px solid var(--gold)' : '1.5px solid var(--paper-line)',
            background: isSelected ? '#F4F1EA' : 'var(--card)',
            fontWeight: 400
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{t.split(' (')[0].split(',')[0]}</span>
          {isLocked && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-label="Has a prerequisite to work on first">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="#B9C2CB" strokeWidth="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#B9C2CB" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          )}
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{info.label}</span>
          {isDueForReview && (
            <span className="score-tag" style={{ background: 'var(--gold)' }} title="Mastered a while ago - could use a quick refresher">
              Review due
            </span>
          )}
          {isRecommended && (
            <span className="score-tag" style={{ background: 'var(--gold)' }}>Recommended next</span>
          )}
        </button>
        {lockedNoteTopic === t && unmetPrereqs.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', background: 'var(--gold-bg)', border: '1px dashed var(--gold)', borderRadius: 8, padding: '10px 12px', marginTop: 6 }}>
            This usually goes more smoothly once{' '}
            <strong>{unmetPrereqs[0].split(' (')[0].split(',')[0]}</strong> is solid - want to
            practice that first instead?
            <div className="row" style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setTopic(unmetPrereqs[0]);
                  setProgress(null);
                  setLockedNoteTopic(null);
                }}
                style={{ fontSize: 12, padding: '5px 10px' }}
              >
                Practice that instead
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Only treat a fetched phase as valid for display if it actually matches
  // what's currently selected - guards against a stale primer from a
  // previous topic flashing up mid-transition.
  const primerExplanationCurrent = (primerExplanation && primerExplanation.topic === topic && primerExplanation.board === board && primerExplanation.course === course)
    ? primerExplanation
    : null;
  const primerExampleCurrent = (primerExample && primerExample.topic === topic && primerExample.board === board && primerExample.course === course)
    ? primerExample
    : null;

  return (
    <>
      <div className="app-bg-wash" aria-hidden="true" />

      {pendingNavigation && (
        <div className="confirm-overlay">
          <div className="card confirm-dialog">
            <p style={{ marginTop: 0 }}>You have unsubmitted working - leave anyway?</p>
            <div className="row">
              <button onClick={() => setPendingNavigation(null)}>Stay</button>
              <button
                className="primary"
                onClick={() => {
                  const action = pendingNavigation;
                  setPendingNavigation(null);
                  action();
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {activeBadgeCelebration && (
        <div
          className="badge-toast"
          onClick={() => setActiveBadgeCelebration(null)}
          role="status"
          key={activeBadgeCelebration.id}
        >
          <div className="badge-toast-icon-wrap">
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <span
                key={deg}
                className="badge-toast-sparkle"
                style={{
                  background: i % 2 === 0 ? 'var(--gold)' : 'var(--green)',
                  transform: `rotate(${deg}deg) translateY(-24px)`,
                  animationDelay: `${i * 0.04}s`
                }}
              />
            ))}
            <svg width="30" height="36" viewBox="0 0 20 24" fill="none" className="badge-toast-ribbon">
              <path d="M2 2h16v14l-8 6-8-6V2z" fill="var(--gold)" stroke="var(--gold)" strokeWidth="2" />
            </svg>
          </div>
          <div className="badge-toast-text">
            <div className="badge-toast-title">Badge unlocked: {activeBadgeCelebration.label}</div>
            <div className="badge-toast-desc">{activeBadgeCelebration.description}</div>
          </div>
        </div>
      )}

      <div className="wrap app-content">
      <div className="topnav">
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="auto-read-toggle">
            <input type="checkbox" checked={autoRead} onChange={toggleAutoRead} />
            Read aloud automatically
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {isTeacher && (
              <button onClick={() => guardedNavigate(() => router.push('/teacher'))} style={{ fontSize: 12, padding: '5px 10px' }}>
                Teacher view
              </button>
            )}
            <button onClick={() => guardedNavigate(() => router.push('/billing'))} style={{ fontSize: 12, padding: '5px 10px' }}>
              Billing
            </button>
            <button onClick={() => guardedNavigate(() => router.push('/progress'))} style={{ fontSize: 12, padding: '5px 10px' }}>
              Progress
            </button>
            <button onClick={() => setShowFeedback((s) => !s)} style={{ fontSize: 12, padding: '5px 10px' }}>
              Feedback
            </button>
            <button onClick={() => guardedNavigate(handleLogout)} style={{ fontSize: 12, padding: '5px 10px' }}>Log out</button>
          </div>
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
      <div className="eyebrow section-gap">{selectedBoard.label}{specCode ? ` · ${specCode}` : ''}</div>
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

      {dueReview && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>You mastered <strong>{dueReview.topic}</strong> a while back - want a quick review to keep it sharp?</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="primary" onClick={() => reviewNow(dueReview)} style={{ fontSize: 13, padding: '7px 12px' }}>
              Review now
            </button>
            <button
              type="button"
              onClick={dismissDueReview}
              aria-label="Dismiss review reminder"
              style={{ fontSize: 13, padding: '7px 10px' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {diagnosticLoaded && Object.keys(diagnosticStatuses).length === 0 && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>Not sure where to start? Take a quick diagnostic for {selectedCourse.label}.</span>
          <button className="primary" onClick={() => guardedNavigate(() => router.push(`/diagnostic?board=${board}&course=${course}`))}>
            Take the diagnostic
          </button>
        </div>
      )}

      <div className="row" style={{ marginBottom: 4 }}>
        <button
          className={mode === 'free' ? 'primary' : ''}
          onClick={() => updateMode('free')}
          style={{ fontSize: 13, padding: '7px 12px' }}
        >
          Free practice
        </button>
        <button
          className={mode === 'guided' ? 'primary' : ''}
          onClick={() => updateMode('guided')}
          style={{ fontSize: 13, padding: '7px 12px' }}
        >
          Guided Path
        </button>
      </div>

      <div className="controls">
        <select
          value={board}
          onChange={(e) => {
            const newBoard = e.target.value;
            const newCourse = COURSES.find((c) => (BOARD_COURSES[newBoard] || []).includes(c.key));
            setBoard(newBoard);
            if (newCourse) {
              setCourse(newCourse.key);
              setTopic(newCourse.topics[0].subtopics[0]);
            }
            setProgress(null);
            setLockedNoteTopic(null);
          }}
        >
          {EXAM_BOARDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
        <select
          value={course}
          onChange={(e) => {
            const newCourse = availableCourses.find((c) => c.key === e.target.value);
            setCourse(newCourse.key);
            setTopic(newCourse.topics[0].subtopics[0]);
            setProgress(null);
            setLockedNoteTopic(null);
          }}
        >
          {availableCourses.map((c) => <option key={c.key} value={c.key}>{courseDisplayLabel(c, board)}</option>)}
        </select>
        {mode === 'free' && (
          <SearchableSelect
            topics={selectedCourse.topics}
            value={topic}
            onChange={(t) => { setTopic(t); setProgress(null); setLockedNoteTopic(null); }}
          />
        )}
        {diagnosticStatuses[currentMainTopicName] && <StatusPill status={diagnosticStatuses[currentMainTopicName]} />}
        <button
          type="button"
          onClick={() => (primerVisible ? setPrimerVisible(false) : fetchPrimer())}
          disabled={primerLoading}
        >
          {primerLoading ? 'Loading...' : primerVisible ? 'Hide topic primer' : 'What is this topic?'}
        </button>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {DIFFICULTY_LEVELS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
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

      {mode === 'guided' && (
        <div className="card">
          <div className="q-label">Guided Path · {selectedCourse.label}</div>
          <p style={{ margin: '0 0 10px' }}>
            {masteredCount} of {allSubtopics.length} sub-topics mastered
          </p>
          <div style={{ background: 'var(--paper-line)', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: 16 }}>
            <div
              style={{
                width: `${allSubtopics.length ? (masteredCount / allSubtopics.length) * 100 : 0}%`,
                background: 'var(--green)',
                height: '100%'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedCourse.topics.map((mt) => {
              if (mt.subtopics.length === 1) return renderGuidedSubtopicRow(mt.subtopics[0]);

              const groupStatuses = mt.subtopics.map((st) => computeTopicStatus(recentAttempts, course, board, st));
              const masteredInGroup = groupStatuses.filter((s) => s === 'mastered').length;
              const groupColor = masteredInGroup === mt.subtopics.length
                ? 'var(--green)'
                : groupStatuses.some((s) => s !== 'not-started')
                  ? 'var(--gold)'
                  : '#B9C2CB';
              const groupHasRecommended = mt.subtopics.includes(recommendedTopic);
              // Defaults to expanded if the current selection or the
              // recommended sub-topic lives in this group, otherwise
              // collapsed - once the student toggles it manually that
              // explicit choice takes over.
              const isExpanded = expandedGuidedTopics[mt.name] ?? (mt.subtopics.includes(topic) || groupHasRecommended);
              return (
                <div key={mt.name}>
                  <button
                    type="button"
                    onClick={() => setExpandedGuidedTopics((prev) => ({ ...prev, [mt.name]: !isExpanded }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 8,
                      width: '100%',
                      border: groupHasRecommended ? '2px solid var(--gold)' : '1.5px solid var(--paper-line)',
                      background: 'var(--card)',
                      fontWeight: 400
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: groupColor, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{mt.name.split(' (')[0].split(',')[0]}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{masteredInGroup}/{mt.subtopics.length} sub-topics mastered</span>
                    {groupHasRecommended && (
                      <span className="score-tag" style={{ background: 'var(--gold)' }}>Recommended next</span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>›</span>
                  </button>
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, marginLeft: 20 }}>
                      {mt.subtopics.map((st) => renderGuidedSubtopicRow(st))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {!question && !loadingQ && (
        <div className="card empty-state">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="2" y="26" width="11" height="12" rx="1.5" fill="var(--red)" opacity="0.5" />
            <rect x="14.5" y="16" width="11" height="22" rx="1.5" fill="var(--gold)" opacity="0.5" />
            <rect x="27" y="4" width="11" height="34" rx="1.5" fill="var(--green)" opacity="0.5" />
          </svg>
          <p>Pick a course and topic above and click <strong>New question</strong> to get your first question.</p>
        </div>
      )}

      {primerVisible && (
        <div className="card">
          <div className="q-label">What is this topic?</div>
          {primerLoading ? (
            <>
              <div className="skeleton-line" style={{ width: '95%' }}></div>
              <div className="skeleton-line"></div>
            </>
          ) : primerError ? (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span>{primerError}</span>
              <button onClick={fetchPrimerExplanation} style={{ fontSize: 12, padding: '5px 10px' }}>
                Try again
              </button>
            </div>
          ) : primerExplanationCurrent && primerStage === 'summary' ? (
            <>
              <div className="card-header-row">
                <div className="q-text" style={{ fontWeight: 600 }}>{primerExplanationCurrent.content.plainExplanation}</div>
                <SpeakButton text={primerExplanationCurrent.content.plainExplanation} label="Read explanation aloud" />
              </div>
              {Array.isArray(primerExplanationCurrent.content.keyIdeas) && primerExplanationCurrent.content.keyIdeas.length > 0 && (
                <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
                  {primerExplanationCurrent.content.keyIdeas.map((idea, i) => (
                    <li key={i} className="q-text" style={{ marginBottom: 4 }}>{idea}</li>
                  ))}
                </ul>
              )}
              {/* The worked example loads separately in the background - show
                  whichever state it's actually in rather than blocking on it. */}
              {primerExampleCurrent && Array.isArray(primerExampleCurrent.content.workedExample) && primerExampleCurrent.content.workedExample.length > 0 ? (
                <div className="row" style={{ marginTop: 16 }}>
                  <button
                    className="primary"
                    onClick={() => {
                      setPrimerStage(0);
                      if (autoRead && primerExampleCurrent.content.workedExample[0]) {
                        speak(primerExampleCurrent.content.workedExample[0].text);
                      }
                    }}
                  >
                    See a worked example
                  </button>
                </div>
              ) : primerExampleError ? (
                <div className="alert-error" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span>{primerExampleError}</span>
                  <button onClick={fetchPrimerExample} style={{ fontSize: 12, padding: '5px 10px' }}>
                    Try again
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <div className="skeleton-line" style={{ width: '90%' }}></div>
                  <div className="skeleton-line" style={{ width: '55%' }}></div>
                  <p style={{ marginTop: 8, marginBottom: 0, color: 'var(--ink-soft)', fontSize: 13 }}>
                    <span className="spinner"></span>
                    {PRIMER_EXAMPLE_LOADING_MESSAGES[primerExampleLoadingMessageIndex]}
                  </p>
                </div>
              )}
            </>
          ) : primerExampleCurrent && primerStage === 'mistake' ? (
            <>
              <div className="card-header-row">
                <div className="q-label">Watch out for</div>
                <SpeakButton text={primerExampleCurrent.content.commonMistake} label="Read common mistake aloud" />
              </div>
              <p className="q-text">{primerExampleCurrent.content.commonMistake}</p>
              <div className="row" style={{ marginTop: 14 }}>
                <button
                  onClick={() => {
                    const lastIndex = primerExampleCurrent.content.workedExample.length - 1;
                    setPrimerStage(lastIndex);
                    if (autoRead && primerExampleCurrent.content.workedExample[lastIndex]) {
                      speak(primerExampleCurrent.content.workedExample[lastIndex].text);
                    }
                  }}
                >
                  Back
                </button>
              </div>
            </>
          ) : primerExampleCurrent && primerExampleCurrent.content.workedExample[primerStage] ? (
            (() => {
              const steps = primerExampleCurrent.content.workedExample;
              const step = steps[primerStage];
              const isLast = primerStage === steps.length - 1;
              return (
                <>
                  <div className="card-header-row">
                    <div className="q-label">Worked example ({primerStage + 1} of {steps.length})</div>
                    <SpeakButton text={step.text} label="Read step aloud" />
                  </div>
                  {step.diagram && (
                    <div
                      className="primer-diagram"
                      style={{ maxWidth: 280, margin: '14px auto 0' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeSvg(step.diagram) }}
                    />
                  )}
                  <p className="q-text" style={{ textAlign: 'center', marginTop: 12 }}>{step.text}</p>
                  <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
                    <button
                      onClick={() => {
                        const prevStage = primerStage === 0 ? 'summary' : primerStage - 1;
                        setPrimerStage(prevStage);
                        if (autoRead) {
                          if (prevStage === 'summary') {
                            const summary = primerExplanationCurrent
                              ? [primerExplanationCurrent.content.plainExplanation, ...(primerExplanationCurrent.content.keyIdeas || [])].filter(Boolean).join('. ')
                              : '';
                            if (summary) speak(summary);
                          } else {
                            speak(steps[prevStage].text);
                          }
                        }
                      }}
                    >
                      Back
                    </button>
                    <button
                      className="primary"
                      onClick={() => {
                        const nextStage = isLast ? 'mistake' : primerStage + 1;
                        setPrimerStage(nextStage);
                        if (autoRead) {
                          if (nextStage === 'mistake') speak(primerExampleCurrent.content.commonMistake);
                          else speak(steps[nextStage].text);
                        }
                      }}
                    >
                      {isLast ? 'See common mistake' : 'Next'}
                    </button>
                  </div>
                </>
              );
            })()
          ) : null}
        </div>
      )}

      {restoredBannerVisible && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>Picked up where you left off.</span>
          <button onClick={() => setRestoredBannerVisible(false)} style={{ fontSize: 12, padding: '5px 10px' }}>
            Dismiss
          </button>
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
          <div className="card-header-row">
            <div className="q-label">Question</div>
            <SpeakButton text={question.question} label="Read question aloud" />
          </div>
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
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
            Stuck before you start? Get a nudge in the right direction, not the answer.
          </p>
          {hints.length > 0 && (
            <div className="hint-log">
              {hints.map((h, i) => (
                <div className="hint-bubble bubble-with-speak" key={i}>
                  <span>{h}</span>
                  <SpeakButton text={h} label="Read hint aloud" />
                </div>
              ))}
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
            <div className="hint-bubble bubble-with-speak" style={{ marginBottom: 14 }}>
              <span><strong>Coach:</strong> {result.coachingMessage}</span>
              <SpeakButton text={result.coachingMessage} label="Read coaching message aloud" />
            </div>
          )}
          <div className="summary-grid">
            <div className="summary-box student-box">
              <h3>
                For the student{' '}
                <span className="score-tag">{result.overallScore}</span>{' '}
                <span className="score-tag" style={{ background: 'var(--gold)' }}>+{pointsForLines(result.lines)} pts</span>
                <SpeakButton text={result.studentFeedback} label="Read feedback aloud" />
              </h3>
              {result.studentFeedback}
            </div>
            <div className="summary-box parent-box">
              <h3>For parents</h3>
              {result.parentFeedback}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            {flagSubmitted ? (
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Thanks, this has been flagged for review.
              </span>
            ) : showFlagForm ? (
              <div>
                <textarea
                  value={flagComment}
                  onChange={(e) => setFlagComment(e.target.value)}
                  placeholder="What looks wrong? (optional)"
                  style={{ minHeight: 60 }}
                />
                <div className="row">
                  <button className="primary" onClick={submitFlag} disabled={flagSubmitting}>
                    {flagSubmitting ? 'Submitting...' : 'Submit flag'}
                  </button>
                  <button onClick={() => setShowFlagForm(false)} disabled={flagSubmitting}>Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" className="link-btn" onClick={() => setShowFlagForm(true)}>
                Flag this marking
              </button>
            )}
          </div>

          {canRevealFullSolution && !showFullSolution && (
            <div style={{ marginTop: 10 }}>
              <div className="row">
                <button onClick={() => setShowFullSolution(true)}>Show me the full solution</button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
                Still stuck after a couple of tries? See the full worked method, step by step.
              </p>
            </div>
          )}

          <div className="chat-section">
            <div className="q-label" style={{ marginTop: 18 }}>Still not sure? Ask about it</div>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 10px' }}>
              Confused about your result? Ask a follow-up question about the feedback you just got.
            </p>
            {chatMessages.length > 0 && (
              <div className="chat-log">
                {chatMessages.map((m, i) => (
                  m.role === 'assistant' ? (
                    <div className="chat-bubble assistant bubble-with-speak" key={i}>
                      <span>{m.content}</span>
                      <SpeakButton text={m.content} label="Read reply aloud" />
                    </div>
                  ) : (
                    <div className="chat-bubble user" key={i}>{m.content}</div>
                  )
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

      {showFullSolution && question && (
        <div className="card">
          <div className="q-label">Worked Solution</div>
          <p style={{ color: 'var(--ink-soft)' }}>
            Here&apos;s the full method - have a look through it, then try a similar question to check it&apos;s clicked.
          </p>
          <StepList steps={question.workedSolution} />
          <div className="row">
            <button className="primary" onClick={newQuestion}>New question</button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
