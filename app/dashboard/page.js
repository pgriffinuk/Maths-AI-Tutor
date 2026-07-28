'use client';
import { useEffect, useRef, useState } from 'react';
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
import BotAvatar from '../components/BotAvatar';
import AccountMenu from '../components/AccountMenu';
import MicButton from '../components/MicButton';
import ImageAttachButton from '../components/ImageAttachButton';
import DrawButton from '../components/DrawButton';
import DrawingCanvasModal from '../components/DrawingCanvasModal';
import MathSymbolToolbar from '../components/MathSymbolToolbar';
import { useToast } from '../components/Toast';
import { speak } from '../../lib/speech';
import { friendlyApiError } from '../../lib/apiError';
import { saveInProgress, loadInProgress, clearInProgress } from '../../lib/inProgressStorage';
import { isReviewDismissed, dismissReview } from '../../lib/reviewDismissals';
import { sanitizeSvg } from '../../lib/sanitizeSvg';
import { readImageFile } from '../../lib/imageUpload';
import { insertAtCursor } from '../../lib/insertAtCursor';

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
  const showToast = useToast();
  const [session, setSession] = useState(null);
  const [board, setBoard] = useState('edexcel');
  const [course, setCourse] = useState(COURSES[0].key);
  const [topic, setTopic] = useState(COURSES[0].topics[0].subtopics[0]);
  const [difficulty, setDifficulty] = useState('exam-standard');
  // The whole practice session as one continuous thread - see the big
  // comment above the derived "active question" consts further down for
  // the full shape of each message kind and how they relate to each other.
  const [messages, setMessages] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [working, setWorking] = useState('');
  const [marking, setMarking] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  // 'chat' (default once a question's been marked) or 'retry' (student
  // explicitly chose to submit a fresh attempt at the same question after
  // an unresolved error, re-arming the working textarea in the composer).
  const [composerMode, setComposerMode] = useState('chat');
  const threadEndRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryAction, setRetryAction] = useState(null); // () => void, or null
  const [progress, setProgress] = useState(null); // { count, correctCount, recentSummary }
  const [rewards, setRewards] = useState(null); // { totalPoints, streak, badges }
  const [showAllBadges, setShowAllBadges] = useState(false); // expands the collapsed rewards summary into the full badge grid
  const [recentAttempts, setRecentAttempts] = useState([]); // raw attempts backing rewards - reused for Guided Path topic status
  const [mode, setMode] = useState('free'); // 'free' | 'guided' - persisted as profiles.preferred_mode
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPendingImage, setChatPendingImage] = useState(null); // { dataUrl, mediaType, base64 } - attached but not yet sent
  const [chatDrawingOpen, setChatDrawingOpen] = useState(false);
  const chatInputRef = useRef(null);
  // Floating "Maths Help" launcher - a separate, general-purpose tutoring
  // thread from the main practice thread's own chat/chatReply messages
  // (which are specifically the post-marking "ask about it" follow-up,
  // tied to whatever's in that thread). This one is reachable everywhere on
  // the dashboard regardless of what's going on in the main thread, and
  // works just as well for a student's own homework/textbook problem as it
  // does for an app-generated question - see /api/chat's system prompt
  // split (on markingResult, not question) for how it stays strictly
  // Socratic for any problem that hasn't actually been marked yet.
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [floatingChatMessages, setFloatingChatMessages] = useState([]);
  const [floatingChatInput, setFloatingChatInput] = useState('');
  const [floatingChatLoading, setFloatingChatLoading] = useState(false);
  const [floatingChatError, setFloatingChatError] = useState('');
  const [floatingChatPendingImage, setFloatingChatPendingImage] = useState(null); // { dataUrl, mediaType, base64 }
  const [floatingChatDrawingOpen, setFloatingChatDrawingOpen] = useState(false);
  const floatingChatInputRef = useRef(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFullSolution, setShowFullSolution] = useState(false);
  const [lockedNoteTopic, setLockedNoteTopic] = useState(null); // Guided Path: topic whose "practice the prerequisite instead?" note is showing
  const [expandedGuidedTopics, setExpandedGuidedTopics] = useState({}); // Guided Path: { [mainTopicName]: bool } - explicit overrides of the default auto-expand
  const [dueReview, setDueReview] = useState(null); // spaced review nudge: the single most-overdue mastered topic not recently dismissed, or null
  const [inactivityNudgeDismissed, setInactivityNudgeDismissed] = useState(false); // session-only - resets on next login, no localStorage needed
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0-3, four steps
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagComment, setFlagComment] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagSubmitted, setFlagSubmitted] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isParent, setIsParent] = useState(false);
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

  // The practice thread's message shape (see setMessages calls throughout):
  //   { id, role: 'assistant', kind: 'question', content: questionText, workedSolution, keyMarkingPoints, board, course, topic, difficulty }
  //   { id, role: 'user', kind: 'working', content: workingText, questionId }
  //   { id, role: 'assistant', kind: 'marking', content: markingResultObject, questionId, workingText, attemptId }
  //   { id, role: 'assistant', kind: 'hint', content: hintText, questionId }
  //   { id, role: 'user', kind: 'chat', content: messageText, imageDataUrl? } - imageDataUrl (if a photo was attached) is stripped before persisting to localStorage, see saveInProgress effect below
  //   { id, role: 'assistant', kind: 'chatReply', content: replyText }
  // Everything below is derived from `messages` rather than tracked as its
  // own state, so there's a single source of truth for "what's actually in
  // the conversation" - a question's own stored board/course/topic/
  // difficulty (captured at the moment it was generated) is what every
  // follow-up action against it uses, NOT the live selectors above, since
  // those can keep moving on (e.g. via Guided Path) while an older,
  // still-unanswered question sits earlier in the same thread.
  const activeQuestionMessage = [...messages].reverse().find((m) => m.kind === 'question') || null;
  const activeQuestionWorkingMessages = activeQuestionMessage
    ? messages.filter((m) => m.kind === 'working' && m.questionId === activeQuestionMessage.id)
    : [];
  const activeQuestionMarkingMessages = activeQuestionMessage
    ? messages.filter((m) => m.kind === 'marking' && m.questionId === activeQuestionMessage.id)
    : [];
  const latestMarkingForActiveQuestion = activeQuestionMarkingMessages[activeQuestionMarkingMessages.length - 1] || null;
  const hasWorkingForActiveQuestion = activeQuestionWorkingMessages.length > 0;
  // Same bar the old single-card UI used ("2nd+ attempt on this exact
  // question, still not resolved") - just computed from the thread instead
  // of a standalone submissionCount/result pair.
  const hasUnresolvedErrorOnActiveQuestion = !!latestMarkingForActiveQuestion && (latestMarkingForActiveQuestion.content.lines || []).some((l) => l.verdict === 'error');
  const canRevealFullSolution = hasUnresolvedErrorOnActiveQuestion && activeQuestionWorkingMessages.length >= 2;
  // The composer shows the working textarea for a genuinely fresh question,
  // or when the student explicitly asked to retry the active one; otherwise
  // (once it's been answered at least once) it shows the chat follow-up bar.
  const showWorkingComposer = !!activeQuestionMessage && (!hasWorkingForActiveQuestion || composerMode === 'retry');
  const showChatComposer = !!activeQuestionMessage && hasWorkingForActiveQuestion && composerMode !== 'retry';

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
      // Queued through the shared toast system, one after another, rather
      // than shown directly - see app/components/Toast.js, which already
      // only ever shows one toast (of any type) at a time.
      newlyUnlocked.forEach((b) => {
        showToast({ type: 'celebration', title: `Badge unlocked: ${b.label}`, description: b.description });
      });
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
        .select('is_teacher, is_parent, parent_id, auto_read, subscription_status, preferred_mode, has_seen_onboarding')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (profileError) console.error('Could not load profile.is_teacher:', profileError.message);
      setIsTeacher(!!profile?.is_teacher);
      setIsParent(!!profile?.is_parent);
      setAutoRead(!!profile?.auto_read);
      setMode(profile?.preferred_mode === 'guided' ? 'guided' : 'free');
      setShowOnboarding(!profile?.has_seen_onboarding);

      // Billing now lives at the parent level - once an account is linked
      // to a parent, its own subscription_status stops being the source of
      // truth for the access gate below (see BILLING_GATE_ENABLED /
      // billingLocked further down); the parent's status governs instead.
      if (profile?.parent_id) {
        const { data: parentProfile, error: parentError } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', profile.parent_id)
          .maybeSingle();
        if (parentError) console.error("Could not load parent's billing status:", parentError.message);
        setSubscriptionStatus(parentProfile?.subscription_status ?? null);
      } else {
        setSubscriptionStatus(profile?.subscription_status ?? null);
      }

      // Resume an in-progress conversation after an accidental refresh or
      // tab close - but not when the URL is a deliberate hand-off from the
      // diagnostic results screen (board/course/topic query params), since
      // that's a navigation the student just made on purpose and should win.
      const params = new URLSearchParams(window.location.search);
      const isHandoff = params.get('board') || params.get('course') || params.get('topic');
      if (!isHandoff) {
        const saved = loadInProgress(data.session.user.id);
        if (saved && Array.isArray(saved.messages) && saved.messages.length > 0) {
          if (saved.board) setBoard(saved.board);
          if (saved.course) setCourse(saved.course);
          if (saved.topic) setTopic(saved.topic);
          if (saved.difficulty) setDifficulty(saved.difficulty);
          setMessages(saved.messages);
          setWorking(saved.working || '');
          setRestoredBannerVisible(true);
        }
      }
    });
  }, [router]);

  // Debounced autosave of the whole thread (board/course/topic/difficulty,
  // every message so far, and whatever's currently typed but not yet
  // submitted) so it survives an accidental refresh/tab close. Waits 500ms
  // after the last change before writing, so it isn't hitting localStorage
  // on every keystroke while typing working-out or a chat message. Nothing
  // to save once the thread is empty (a fresh session, or right after
  // "Clear conversation").
  useEffect(() => {
    if (!session || messages.length === 0) return;
    const timeoutId = setTimeout(() => {
      // Strip any attached-photo data URLs before persisting - they're only
      // a few KB to several MB each as base64, which can quickly blow past
      // localStorage's quota if they accumulate across a long thread. The
      // live in-memory thread keeps them for the current session; a
      // refresh just loses the thumbnails, not the text.
      const messagesForStorage = messages.some((m) => m.imageDataUrl)
        ? messages.map((m) => (m.imageDataUrl ? { ...m, imageDataUrl: undefined } : m))
        : messages;
      saveInProgress(session.user.id, { board, course, topic, difficulty, messages: messagesForStorage, working });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [session, board, course, topic, difficulty, messages, working]);

  // Auto-scrolls to the newest message (or the loading placeholder) as the
  // thread grows, so a new question/hint/marking/reply never lands
  // off-screen below the fold.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loadingQ]);

  // True exactly while there's typed working that hasn't been turned into a
  // 'working' thread message yet for the active question - covers both a
  // fresh first attempt and an explicit retry after an unresolved error.
  const hasUnsubmittedWorking = working.trim() !== '' && showWorkingComposer;

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

  // Called from "Get started" on the final onboarding step, or "Skip" at
  // any step - either way, has_seen_onboarding is set so the walkthrough
  // never shows again for this account.
  async function finishOnboarding() {
    setShowOnboarding(false);
    if (!session) return;
    await supabase.from('profiles').update({ has_seen_onboarding: true }).eq('id', session.user.id);
  }

  async function updateMode(next) {
    if (!session || next === mode) return;
    setMode(next);
    await supabase.from('profiles').update({ preferred_mode: next }).eq('id', session.user.id);
  }

  // Appends a new 'question' message to the SAME thread rather than
  // replacing anything - the conversation reads as one ongoing tutoring
  // session across however many questions get asked in it. Accepts
  // optional overrides so a caller that just changed board/course/topic/
  // difficulty state (e.g. the spaced-review banner's "Review now", or
  // Guided Path selecting a topic) can generate against the NEW values
  // immediately, rather than the stale values still captured in this
  // render's closure until the next render.
  async function newQuestion(overrides = {}) {
    const effTopic = overrides.topic ?? topic;
    const effCourse = overrides.course ?? course;
    const effBoard = overrides.board ?? board;
    const effDifficulty = overrides.difficulty ?? difficulty;
    setLoadingQ(true);
    setErrorMsg('');
    setRetryAction(null);
    setRestoredBannerVisible(false);
    setWorking('');
    setComposerMode('chat');
    setShowFullSolution(false);
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
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        kind: 'question',
        content: data.question,
        workedSolution: data.workedSolution,
        keyMarkingPoints: data.keyMarkingPoints,
        board: effBoard,
        course: effCourse,
        topic: effTopic,
        difficulty: effDifficulty
      }]);
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

  // "Start practicing" on the inactivity nudge - jumps straight to a new
  // question on whatever's currently selected, same as clicking "New
  // question" would once the thread is showing it.
  function startPracticingFromNudge() {
    setInactivityNudgeDismissed(true);
    newQuestion();
  }

  // Wipes the whole conversation for students who want a clean slate -
  // distinct from starting a new question, which keeps everything so far.
  function clearConversation() {
    setMessages([]);
    setWorking('');
    setComposerMode('chat');
    setShowFullSolution(false);
    setShowFlagForm(false);
    setFlagComment('');
    setFlagSubmitted(false);
    setChatInput('');
    setChatPendingImage(null);
    setErrorMsg('');
    setRetryAction(null);
    setProgress(null);
    if (session) clearInProgress(session.user.id);
  }

  async function askHint() {
    if (!activeQuestionMessage) return;
    const q = activeQuestionMessage;
    setHintLoading(true);
    setErrorMsg('');
    setRetryAction(null);
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.content, studentWorking: working, course: q.course, board: q.board, difficulty: q.difficulty, accessToken: session?.access_token })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(friendlyApiError(data));
        setRetryAction(() => askHint);
      } else {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', kind: 'hint', content: data.hint, questionId: q.id }]);
        if (autoRead) speak(data.hint);
      }
    } catch (err) {
      setErrorMsg(friendlyApiError({ code: 'network' }));
      setRetryAction(() => askHint);
    } finally {
      setHintLoading(false);
    }
  }

  // On success, pushes BOTH the 'working' and 'marking' messages together
  // (a failed submission never happened as far as the thread's concerned,
  // same as before - the textarea just keeps its text so "Try again" can
  // resend without retyping). Always marks against the ACTIVE QUESTION's
  // own stored board/course/topic/difficulty, not the live selectors, since
  // those may have moved on to a different topic by the time this resolves.
  async function submitWorking() {
    if (!activeQuestionMessage || !working.trim()) return;
    const q = activeQuestionMessage;
    setMarking(true);
    setErrorMsg('');
    setRetryAction(null);
    setShowFlagForm(false);
    setFlagComment('');
    setFlagSubmitted(false);
    try {
      const progressHistory = await loadProgress(q.topic, q.course, q.board);
      // Skill-tree awareness: if this topic depends on a prerequisite the
      // student hasn't mastered yet, flag that as context for the AI's
      // coachingMessage - it decides whether the actual errors shown look
      // prerequisite-related, we don't assume that ourselves.
      const unmetPrereqs = getUnmetPrerequisites(recentAttempts, q.course, q.board, q.topic);
      const prereqNote = unmetPrereqs.length > 0
        ? `\nNote: this topic depends on '${unmetPrereqs[0]}', which this student hasn't yet mastered - if their errors look like they stem from that gap rather than this topic itself, mention that possibility in the coachingMessage.`
        : '';
      const history = progressHistory + prereqNote;
      const res = await fetch('/api/mark-working', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.content,
          workedSolution: q.workedSolution,
          keyMarkingPoints: q.keyMarkingPoints,
          studentWorking: working,
          history,
          course: q.course,
          board: q.board,
          difficulty: q.difficulty,
          accessToken: session?.access_token
        })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(friendlyApiError(data));
        setRetryAction(() => submitWorking);
        return;
      }
      const markingMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', kind: 'working', content: working, questionId: q.id },
        { id: markingMsgId, role: 'assistant', kind: 'marking', content: data, questionId: q.id, workingText: working, attemptId: null }
      ]);
      setShowFullSolution(false);
      setComposerMode('chat');
      if (autoRead) {
        const toRead = [data.studentFeedback, data.coachingMessage].filter(Boolean).join('. ');
        if (toRead) speak(toRead);
      }
      const earnedPoints = pointsForLines(data.lines);
      const submittedWorking = working;
      setWorking('');

      // Save this attempt so it feeds into future progress/reports
      if (session) {
        const { data: savedAttempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            student_id: session.user.id,
            course: q.course,
            board: q.board,
            difficulty: q.difficulty,
            topic: q.topic,
            question: q.content,
            student_working: submittedWorking,
            overall_score: data.overallScore,
            student_feedback: data.studentFeedback,
            parent_feedback: data.parentFeedback,
            marked_lines: data.lines,
            points: earnedPoints
          })
          .select('id')
          .single();
        if (attemptError) console.error('Could not save attempt:', attemptError.message);
        const newAttemptId = savedAttempt?.id ?? null;
        setMessages((prev) => prev.map((m) => (m.id === markingMsgId ? { ...m, attemptId: newAttemptId } : m)));
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

  async function handleChatImageSelected(file) {
    try {
      const image = await readImageFile(file);
      setChatPendingImage(image);
    } catch (err) {
      setErrorMsg(err.message || 'Could not read that image.');
    }
  }

  function handleChatPaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) handleChatImageSelected(file);
  }

  function handleChatDrawingUse(image) {
    setChatPendingImage(image);
    setChatDrawingOpen(false);
  }

  function insertChatSymbol(symbol) {
    const el = chatInputRef.current;
    const { newValue, newCursorPos } = insertAtCursor(el, chatInput, symbol);
    setChatInput(newValue);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(newCursorPos, newCursorPos);
    });
  }

  async function sendChatMessage() {
    const message = chatInput.trim();
    if (!message && !chatPendingImage) return;
    // Context is whatever the active question/its latest marking actually
    // are, if any - the chat composer only ever shows once a question's
    // been marked at least once, so there's always something here in
    // practice, but this falls back gracefully all the same.
    const q = activeQuestionMessage;
    const latestMarking = latestMarkingForActiveQuestion;
    const chatMsgId = crypto.randomUUID();
    const imageToSend = chatPendingImage;
    // History for the AI is every chat/chatReply pair so far in this
    // thread, not scoped to just the active question - one continuous
    // conversation, same as everything else in the new model.
    const chatHistory = messages
      .filter((m) => m.kind === 'chat' || m.kind === 'chatReply')
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { id: chatMsgId, role: 'user', kind: 'chat', content: message || '(Photo attached)', imageDataUrl: imageToSend?.dataUrl }]);
    setChatInput('');
    setChatPendingImage(null);
    setChatLoading(true);
    setErrorMsg('');
    setRetryAction(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q?.content || null,
          studentWorking: latestMarking?.workingText || null,
          markingResult: latestMarking?.content || null,
          topic: q?.topic || topic,
          history: chatHistory,
          message,
          course: q?.course || course,
          board: q?.board || board,
          difficulty: q?.difficulty || difficulty,
          accessToken: session?.access_token,
          image: imageToSend ? { base64: imageToSend.base64, mediaType: imageToSend.mediaType } : null
        })
      });
      const data = await res.json();
      if (data.error) {
        // Roll back the optimistic bubble and put the message back in the
        // input so "Try again" can just resend it without retyping.
        setMessages((prev) => prev.filter((m) => m.id !== chatMsgId));
        setChatInput(message);
        setChatPendingImage(imageToSend);
        setErrorMsg(friendlyApiError(data));
        setRetryAction(() => sendChatMessage);
      } else {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', kind: 'chatReply', content: data.reply }]);
        if (autoRead) speak(data.reply);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== chatMsgId));
      setChatInput(message);
      setChatPendingImage(imageToSend);
      setErrorMsg(friendlyApiError({ code: 'network' }));
      setRetryAction(() => sendChatMessage);
    } finally {
      setChatLoading(false);
    }
  }

  // The floating launcher's own send - passes whatever context actually
  // exists (the active question/its latest marking, if the student has one
  // open in the main thread) otherwise just their current board/course/
  // topic selection, rather than requiring a marked result the way the
  // main thread's chat composer does.
  async function handleFloatingChatImageSelected(file) {
    try {
      const image = await readImageFile(file);
      setFloatingChatPendingImage(image);
    } catch (err) {
      setFloatingChatError(err.message || 'Could not read that image.');
    }
  }

  function handleFloatingChatPaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) handleFloatingChatImageSelected(file);
  }

  function handleFloatingChatDrawingUse(image) {
    setFloatingChatPendingImage(image);
    setFloatingChatDrawingOpen(false);
  }

  function insertFloatingChatSymbol(symbol) {
    const el = floatingChatInputRef.current;
    const { newValue, newCursorPos } = insertAtCursor(el, floatingChatInput, symbol);
    setFloatingChatInput(newValue);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(newCursorPos, newCursorPos);
    });
  }

  async function sendFloatingChatMessage() {
    const message = floatingChatInput.trim();
    if (!message && !floatingChatPendingImage) return;
    const imageToSend = floatingChatPendingImage;
    const newHistory = [...floatingChatMessages, { role: 'user', content: message || '(Photo attached)', imageDataUrl: imageToSend?.dataUrl }];
    setFloatingChatMessages(newHistory);
    setFloatingChatInput('');
    setFloatingChatPendingImage(null);
    setFloatingChatLoading(true);
    setFloatingChatError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQuestionMessage?.content || null,
          studentWorking: latestMarkingForActiveQuestion?.workingText || null,
          markingResult: latestMarkingForActiveQuestion?.content || null,
          topic: activeQuestionMessage?.topic || topic,
          history: floatingChatMessages,
          message,
          course: activeQuestionMessage?.course || course,
          board: activeQuestionMessage?.board || board,
          difficulty: activeQuestionMessage?.difficulty || difficulty,
          accessToken: session?.access_token,
          image: imageToSend ? { base64: imageToSend.base64, mediaType: imageToSend.mediaType } : null
        })
      });
      const data = await res.json();
      if (data.error) {
        setFloatingChatMessages((h) => h.slice(0, -1));
        setFloatingChatInput(message);
        setFloatingChatPendingImage(imageToSend);
        setFloatingChatError(friendlyApiError(data));
      } else {
        setFloatingChatMessages((h) => [...h, { role: 'assistant', content: data.reply }]);
        if (autoRead) speak(data.reply);
      }
    } catch (err) {
      setFloatingChatMessages((h) => h.slice(0, -1));
      setFloatingChatInput(message);
      setFloatingChatPendingImage(imageToSend);
      setFloatingChatError(friendlyApiError({ code: 'network' }));
    } finally {
      setFloatingChatLoading(false);
    }
  }

  async function submitFeedback() {
    const message = feedbackText.trim();
    if (!message || !session) return;
    await supabase.from('feedback').insert({ student_id: session.user.id, message });
    setFeedbackText('');
    setShowFeedback(false);
    showToast({ type: 'success', message: "Thanks - that's been sent." });
  }

  // Only ever offered on the active question's LATEST marking (see the
  // render below) - matches the old app's scope exactly, since there was
  // only ever one "current result" to flag there too.
  async function submitFlag() {
    if (!session || !activeQuestionMessage || !latestMarkingForActiveQuestion) return;
    setFlagSubmitting(true);
    await supabase.from('marking_flags').insert({
      student_id: session.user.id,
      attempt_id: latestMarkingForActiveQuestion.attemptId,
      question: activeQuestionMessage.content,
      student_working: latestMarkingForActiveQuestion.workingText,
      marking_result: latestMarkingForActiveQuestion.content,
      student_comment: flagComment.trim() || null
    });
    setFlagSubmitting(false);
    setFlagSubmitted(true);
    showToast({ type: 'success', message: 'Thanks, this has been flagged for review.' });
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

  // General "haven't practiced in a while" nudge - distinct from dueReview
  // above, which is about a specific mastered topic going stale. This one's
  // just a plain activity-gap reminder, so when both would qualify, show
  // only dueReview (more specific and actionable) to avoid stacking two
  // banners. recentAttempts is already sorted most-recent-first (see
  // loadRewards), so [0] is the last attempt across every course/topic.
  const daysSinceLastAttempt = recentAttempts.length > 0
    ? Math.floor((Date.now() - new Date(recentAttempts[0].created_at).getTime()) / 86400000)
    : null;
  const showInactivityNudge = !inactivityNudgeDismissed && !dueReview && daysSinceLastAttempt !== null && daysSinceLastAttempt >= 3;

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
            newQuestion({ topic: t });
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
                  newQuestion({ topic: unmetPrereqs[0] });
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

  // Renders one thread message by kind. Interactive controls (flag, reveal
  // solution) only ever attach to the active question's LATEST marking -
  // exactly the same scope the old single-card UI had (there was only ever
  // one "current result" to flag or reveal against there too), just now
  // sitting inside a persistent scrollable history instead of a card that
  // got replaced each time.
  function renderMessage(m) {
    if (m.kind === 'question') {
      return (
        <div className="assistant-row" key={m.id} style={{ maxWidth: '95%' }}>
          <BotAvatar size={24} />
          <div className="chat-bubble assistant" style={{ maxWidth: '100%' }}>
            <div className="card-header-row" style={{ marginBottom: 4 }}>
              <div className="q-label" style={{ marginBottom: 0 }}>Question</div>
              <SpeakButton text={m.content} label="Read question aloud" />
            </div>
            <div className="q-text">{m.content}</div>
          </div>
        </div>
      );
    }
    if (m.kind === 'working') {
      return (
        <div className="chat-bubble user" key={m.id} style={{ whiteSpace: 'pre-wrap' }}>
          {m.content}
        </div>
      );
    }
    if (m.kind === 'hint') {
      return (
        <div className="assistant-row" key={m.id}>
          <BotAvatar size={24} />
          <div className="chat-bubble assistant bubble-with-speak">
            <span>{m.content}</span>
            <SpeakButton text={m.content} label="Read hint aloud" />
          </div>
        </div>
      );
    }
    if (m.kind === 'chat') {
      return (
        <div className="chat-bubble user" key={m.id}>
          {m.imageDataUrl && <img src={m.imageDataUrl} alt="Attached problem" className="chat-image-thumb" />}
          {m.content}
        </div>
      );
    }
    if (m.kind === 'chatReply') {
      return (
        <div className="assistant-row" key={m.id}>
          <BotAvatar size={24} />
          <div className="chat-bubble assistant bubble-with-speak">
            <span>{m.content}</span>
            <SpeakButton text={m.content} label="Read reply aloud" />
          </div>
        </div>
      );
    }
    // kind === 'marking'
    const data = m.content;
    const isActiveQuestionLatestMarking = !!latestMarkingForActiveQuestion && m.id === latestMarkingForActiveQuestion.id;
    return (
      <div className="assistant-row" key={m.id} style={{ maxWidth: '95%' }}>
        <BotAvatar size={24} />
        <div className="chat-bubble assistant" style={{ maxWidth: '100%' }}>
          <div className="q-label" style={{ marginBottom: 8 }}>Marking</div>
          {(data.lines || []).map((line, i) => (
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
          {data.coachingMessage && (
            <div className="bubble-with-speak" style={{ marginTop: 8, marginBottom: 10 }}>
              <span><strong>Coach:</strong> {data.coachingMessage}</span>
              <SpeakButton text={data.coachingMessage} label="Read coaching message aloud" />
            </div>
          )}
          <div className="summary-grid">
            <div className="summary-box student-box">
              <h3>
                For the student{' '}
                <span className="score-tag">{data.overallScore}</span>{' '}
                <span className="score-tag" style={{ background: 'var(--gold)' }}>+{pointsForLines(data.lines)} pts</span>
                <SpeakButton text={data.studentFeedback} label="Read feedback aloud" />
              </h3>
              {data.studentFeedback}
            </div>
            <div className="summary-box parent-box">
              <h3>For parents</h3>
              {data.parentFeedback}
            </div>
          </div>

          {isActiveQuestionLatestMarking && (
            <>
              <div style={{ marginTop: 10 }}>
                {flagSubmitted ? (
                  // The full "Thanks, this has been flagged for review."
                  // confirmation is a toast (see submitFlag) - this just
                  // needs to permanently replace the flag link/form so it
                  // doesn't look like flagging is still available.
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Flagged for review</span>
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

              {showFullSolution && (
                <div style={{ marginTop: 10 }}>
                  <div className="q-label">Worked Solution</div>
                  <p style={{ color: 'var(--ink-soft)' }}>
                    Here&apos;s the full method - have a look through it, then try a similar question to check it&apos;s clicked.
                  </p>
                  <StepList steps={activeQuestionMessage.workedSolution} />
                </div>
              )}
            </>
          )}
        </div>
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

  // Order matches the spec: Progress, Mock Exam, Billing, Feedback, then
  // Teacher/Parent Dashboard only when the profile actually qualifies -
  // Log out is handled separately by AccountMenu, always last after a
  // divider. Feedback toggles the card below the nav rather than
  // navigating away, so unlike the others it isn't run through
  // guardedNavigate.
  const accountMenuItems = [
    { key: 'progress', label: 'Progress', onClick: () => guardedNavigate(() => router.push('/progress')) },
    { key: 'mock-exam', label: 'Mock Exam', onClick: () => guardedNavigate(() => router.push('/mock-exam')) },
    { key: 'billing', label: 'Billing', onClick: () => guardedNavigate(() => router.push('/billing')) },
    { key: 'feedback', label: 'Feedback', onClick: () => setShowFeedback((s) => !s) },
    ...(isTeacher ? [{ key: 'teacher', label: 'Teacher view', onClick: () => guardedNavigate(() => router.push('/teacher')) }] : []),
    ...(isParent ? [{ key: 'parent', label: 'Parent Dashboard', onClick: () => guardedNavigate(() => router.push('/parent-dashboard')) }] : [])
  ];

  return (
    <>
      <div className="app-bg-wash" aria-hidden="true" />

      <button
        type="button"
        className="chat-launcher"
        onClick={() => setFloatingChatOpen((o) => !o)}
        aria-label={floatingChatOpen ? 'Close Maths Help' : 'Open Maths Help'}
        title="Maths Help"
      >
        <BotAvatar size={34} />
      </button>

      {floatingChatOpen && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BotAvatar size={22} />
              <strong style={{ fontSize: 14 }}>Maths Help</strong>
            </div>
            <button
              type="button"
              className="link-btn"
              onClick={() => setFloatingChatOpen(false)}
              aria-label="Close chat"
              style={{ fontSize: 18, textDecoration: 'none' }}
            >
              ×
            </button>
          </div>
          <div className="chat-panel-body">
            {floatingChatMessages.length === 0 && !floatingChatLoading && (
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
                {activeQuestionMessage
                  ? "Ask me anything about this question - I'm happy to help."
                  : "Stuck on a maths problem? Type it in - from your homework, a textbook, anywhere - and I'll help you work through it, not just give you the answer."}
              </p>
            )}
            {floatingChatMessages.map((m, i) => (
              m.role === 'assistant' ? (
                <div className="assistant-row" key={i}>
                  <BotAvatar size={22} />
                  <div className="chat-bubble assistant bubble-with-speak">
                    <span>{m.content}</span>
                    <SpeakButton text={m.content} label="Read reply aloud" />
                  </div>
                </div>
              ) : (
                <div className="chat-bubble user" key={i}>
                  {m.imageDataUrl && <img src={m.imageDataUrl} alt="Attached problem" className="chat-image-thumb" />}
                  {m.content}
                </div>
              )
            ))}
            {floatingChatLoading && (
              <div className="assistant-row">
                <BotAvatar size={22} />
                <div className="chat-bubble assistant"><span className="spinner"></span>thinking...</div>
              </div>
            )}
            {floatingChatError && <div className="error-msg">{floatingChatError}</div>}
          </div>
          {floatingChatPendingImage && (
            <div className="image-preview-row" style={{ padding: '0 12px' }}>
              <img src={floatingChatPendingImage.dataUrl} alt="Attached problem" className="chat-image-thumb" />
              <button type="button" className="link-btn" onClick={() => setFloatingChatPendingImage(null)}>Remove photo</button>
            </div>
          )}
          <MathSymbolToolbar onInsert={insertFloatingChatSymbol} disabled={floatingChatLoading} />
          <div className="chat-panel-footer">
            <input
              ref={floatingChatInputRef}
              type="text"
              placeholder="Ask a question..."
              value={floatingChatInput}
              onChange={(e) => setFloatingChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendFloatingChatMessage(); }}
              onPaste={handleFloatingChatPaste}
              style={{ flex: 1 }}
            />
            <MicButton onResult={setFloatingChatInput} disabled={floatingChatLoading} />
            <ImageAttachButton onSelect={handleFloatingChatImageSelected} disabled={floatingChatLoading} />
            <DrawButton onClick={() => setFloatingChatDrawingOpen(true)} disabled={floatingChatLoading} />
            <button className="primary" onClick={sendFloatingChatMessage} disabled={floatingChatLoading || (!floatingChatInput.trim() && !floatingChatPendingImage)}>
              Ask
            </button>
          </div>
        </div>
      )}

      {floatingChatDrawingOpen && (
        <DrawingCanvasModal onUse={handleFloatingChatDrawingUse} onCancel={() => setFloatingChatDrawingOpen(false)} />
      )}

      {showOnboarding && (
        <div className="confirm-overlay">
          <div className="card confirm-dialog" style={{ maxWidth: 420 }}>
            {onboardingStep === 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <Logo />
                </div>
                <p style={{ textAlign: 'center', marginTop: 0 }}>
                  Welcome to Stepwise! This is a quick 30-second look at how it works.
                </p>
              </>
            )}
            {onboardingStep === 1 && (
              <p style={{ marginTop: 0 }}>
                Pick your exam board and course at the top of the dashboard, then choose a
                topic - or if you're not sure where you stand yet, take the free diagnostic
                test first to find your starting point.
              </p>
            )}
            {onboardingStep === 2 && (
              <p style={{ marginTop: 0 }}>
                Use <strong>Free Practice</strong> to jump to any topic you like, or{' '}
                <strong>Guided Path</strong> to work through a course in order, with topics
                unlocking as you master the basics.
              </p>
            )}
            {onboardingStep === 3 && (
              <p style={{ marginTop: 0 }}>
                If you're stuck before starting, ask for a hint. Confused about a result?
                Ask about it. Still stuck after a couple of tries? You can reveal the full
                worked solution.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '4px 0 16px' }}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: i === onboardingStep ? 'var(--gold)' : 'var(--paper-line)'
                  }}
                />
              ))}
            </div>

            <div className="row" style={{ marginTop: 0, justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="link-btn" onClick={finishOnboarding}>Skip</button>
              <div style={{ display: 'flex', gap: 10 }}>
                {onboardingStep > 0 && (
                  <button type="button" onClick={() => setOnboardingStep((s) => s - 1)}>Back</button>
                )}
                <button
                  type="button"
                  className="primary"
                  onClick={() => (onboardingStep === 3 ? finishOnboarding() : setOnboardingStep((s) => s + 1))}
                >
                  {onboardingStep === 3 ? 'Get started' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <div className="wrap app-content">
      <div className="topnav">
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="auto-read-toggle">
            <input type="checkbox" checked={autoRead} onChange={toggleAutoRead} />
            Read aloud automatically
          </label>
          <AccountMenu items={accountMenuItems} onLogout={() => guardedNavigate(handleLogout)} />
        </div>
      </div>

      {showFeedback && (
        <div className="card feedback-card">
          <div className="q-label">Tell us what's working or not</div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Anything confusing, broken, or that you'd like to see added..."
          />
          <div className="row">
            <button className="primary" onClick={submitFeedback} disabled={!feedbackText.trim()}>Send feedback</button>
          </div>
        </div>
      )}
      <div className="eyebrow section-gap">{selectedBoard.label}{specCode ? ` · ${specCode}` : ''}</div>
      <h1>Marked Practice</h1>

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
        {progress && progress.count > 0 && (
          <span className="score-tag" style={{ background: 'var(--gold)' }}>
            {progress.count} attempt{progress.count === 1 ? '' : 's'} on this topic
          </span>
        )}
      </div>

      {mode === 'guided' && (
        <div className="card">
          <div className="q-label">Guided Path · {selectedCourse.label}</div>
          {!rewardsReady ? (
            // Topic statuses come from recentAttempts, loaded alongside
            // rewards - showing the real list before that resolves would
            // flash every topic as "not started" and then jump once the
            // real statuses arrive, so show placeholders instead.
            <>
              <div className="skeleton-line" style={{ width: '40%' }}></div>
              <div className="skeleton-line" style={{ width: '100%', height: 8, borderRadius: 999, margin: '4px 0 16px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton-line" style={{ height: 40, borderRadius: 8, margin: 0 }}></div>
                <div className="skeleton-line" style={{ height: 40, borderRadius: 8, margin: 0 }}></div>
                <div className="skeleton-line" style={{ height: 40, borderRadius: 8, margin: 0 }}></div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      <div className="dashboard-secondary-zone">
        {rewards && (
          <>
            <div className="rewards-summary">
              <span><strong>{rewards.totalPoints}</strong> pts</span>
              <span className="rewards-summary-divider">·</span>
              <span><strong>{rewards.streak}</strong> day streak</span>
              {rewards.badges.some((b) => b.unlocked) && (
                <>
                  <span className="rewards-summary-divider">·</span>
                  <div className="rewards-summary-badges">
                    {rewards.badges.filter((b) => b.unlocked).map((b) => (
                      <svg key={b.id} width="14" height="17" viewBox="0 0 20 24" fill="none" aria-label={b.label}>
                        <title>{b.label}</title>
                        <path d="M2 2h16v14l-8 6-8-6V2z" stroke="var(--gold)" strokeWidth="2" fill="var(--gold-bg)" />
                      </svg>
                    ))}
                  </div>
                </>
              )}
              <button type="button" className="link-btn rewards-summary-toggle" onClick={() => setShowAllBadges((s) => !s)}>
                {showAllBadges ? 'Hide badges' : 'View all badges'}
              </button>
            </div>
            {showAllBadges && (
              <div className="card badge-detail-card">
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
          </>
        )}

        {dueReview && (
          <div className="nudge-strip">
            <svg className="nudge-strip-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="nudge-strip-text">You mastered <strong>{dueReview.topic}</strong> a while back - want a quick review to keep it sharp?</span>
            <div className="nudge-strip-actions">
              <button className="primary" onClick={() => reviewNow(dueReview)} style={{ fontSize: 12, padding: '5px 10px' }}>
                Review now
              </button>
              <button
                type="button"
                onClick={dismissDueReview}
                aria-label="Dismiss review reminder"
                style={{ fontSize: 12, padding: '5px 8px' }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {showInactivityNudge && (
          <div className="nudge-strip">
            <svg className="nudge-strip-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="nudge-strip-text">
              {daysSinceLastAttempt >= 14
                ? "It's been a while - your topics will still be here when you're ready to pick back up."
                : "It's been a few days since your last practice - jump back in!"}
            </span>
            <div className="nudge-strip-actions">
              <button className="primary" onClick={startPracticingFromNudge} style={{ fontSize: 12, padding: '5px 10px' }}>
                Start practicing
              </button>
              <button
                type="button"
                onClick={() => setInactivityNudgeDismissed(true)}
                aria-label="Dismiss reminder"
                style={{ fontSize: 12, padding: '5px 8px' }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {diagnosticLoaded && Object.keys(diagnosticStatuses).length === 0 && (
          <div className="nudge-strip">
            <svg className="nudge-strip-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="nudge-strip-text">Not sure where to start? Take a quick diagnostic for {selectedCourse.label}.</span>
            <div className="nudge-strip-actions">
              <button className="primary" onClick={() => guardedNavigate(() => router.push(`/diagnostic?board=${board}&course=${course}`))} style={{ fontSize: 12, padding: '5px 10px' }}>
                Take the diagnostic
              </button>
            </div>
          </div>
        )}
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

      {!activeQuestionMessage && !loadingQ && (
        <div className="card empty-state">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="2" y="26" width="11" height="12" rx="1.5" fill="var(--red)" opacity="0.5" />
            <rect x="14.5" y="16" width="11" height="22" rx="1.5" fill="var(--gold)" opacity="0.5" />
            <rect x="27" y="4" width="11" height="34" rx="1.5" fill="var(--green)" opacity="0.5" />
          </svg>
          <p>Pick a course and topic above, then start a conversation.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="primary" onClick={() => newQuestion()}>New question</button>
          </div>
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

      {messages.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button type="button" className="link-btn" onClick={clearConversation}>Clear conversation</button>
        </div>
      )}

      {(messages.length > 0 || loadingQ) && (
        <div className="chat-thread">
          {messages.map((m) => renderMessage(m))}
          {loadingQ && (
            <div className="assistant-row" style={{ maxWidth: '95%' }}>
              <BotAvatar size={24} />
              <div className="chat-bubble assistant" style={{ maxWidth: '100%' }}>
                <div className="q-label">Question</div>
                <div className="skeleton-line" style={{ width: '95%' }}></div>
                <div className="skeleton-line"></div>
              </div>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>
      )}

      {activeQuestionMessage && (
        <div className="thread-composer">
          {showWorkingComposer ? (
            <>
              <textarea
                className="workbook-paper"
                value={working}
                onChange={(e) => setWorking(e.target.value)}
                placeholder={'Write each step on its own line, e.g.\n3/4 + 1/8\n= 6/8 + 1/8\n= 7/8'}
              />
              <div className="row">
                <button className="primary" onClick={submitWorking} disabled={marking}>
                  {marking ? 'Marking...' : 'Submit working'}
                </button>
                <button onClick={askHint} disabled={hintLoading}>
                  {hintLoading ? 'Thinking...' : 'Ask for a hint instead'}
                </button>
                {composerMode === 'retry' && (
                  <button type="button" className="link-btn" onClick={() => { setComposerMode('chat'); setWorking(''); }}>
                    Ask a follow-up instead
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
                Stuck before you start? Get a nudge in the right direction, not the answer.
              </p>
            </>
          ) : (
            <>
              {hasUnresolvedErrorOnActiveQuestion && !showFullSolution && (
                <div className="row" style={{ marginTop: 0, marginBottom: 10 }}>
                  <button type="button" onClick={() => setComposerMode('retry')} style={{ fontSize: 13, padding: '7px 12px' }}>
                    Try this question again
                  </button>
                </div>
              )}
              {chatPendingImage && (
                <div className="image-preview-row">
                  <img src={chatPendingImage.dataUrl} alt="Attached problem" className="chat-image-thumb" />
                  <button type="button" className="link-btn" onClick={() => setChatPendingImage(null)}>Remove photo</button>
                </div>
              )}
              <MathSymbolToolbar onInsert={insertChatSymbol} disabled={chatLoading} />
              <div className="row" style={{ marginTop: 0 }}>
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder="Ask a follow-up..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                  onPaste={handleChatPaste}
                  style={{ flex: 1, minWidth: 180 }}
                />
                <MicButton onResult={setChatInput} disabled={chatLoading} />
                <ImageAttachButton onSelect={handleChatImageSelected} disabled={chatLoading} />
                <DrawButton onClick={() => setChatDrawingOpen(true)} disabled={chatLoading} />
                <button className="primary" onClick={sendChatMessage} disabled={chatLoading || (!chatInput.trim() && !chatPendingImage)}>
                  {chatLoading ? 'Thinking...' : 'Ask'}
                </button>
                <button onClick={() => newQuestion()} disabled={loadingQ}>
                  {loadingQ ? 'Generating...' : 'New question'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      </div>

      {chatDrawingOpen && (
        <DrawingCanvasModal onUse={handleChatDrawingUse} onCancel={() => setChatDrawingOpen(false)} />
      )}
    </>
  );
}
