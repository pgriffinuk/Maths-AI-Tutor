// Client-only (browser localStorage) autosave for an in-progress Mock Exam
// - the generated question plan, each saved answer so far, the current
// question's own generated content and typed working, and when the exam
// started (so the countdown survives a refresh, recomputed from the clock
// rather than trusted from an in-memory timer) - so an accidental refresh
// mid-paper doesn't lose progress. Deliberately not a database table: same
// reasoning as lib/inProgressStorage.js's single-question autosave, this is
// transient session state, not something that needs to sync across devices.

function storageKey(userId) {
  return `stepwise:mockExam:${userId}`;
}

export function saveMockExamProgress(userId, state) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify({ studentId: userId, ...state }));
  } catch (err) {
    // localStorage can throw (quota exceeded, private browsing) - losing the
    // autosave isn't worth crashing the app over.
    console.error('Could not save mock exam progress:', err);
  }
}

export function loadMockExamProgress(userId) {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.studentId !== userId) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

export function clearMockExamProgress(userId) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch (err) {
    // ignore - nothing meaningful to recover from here
  }
}
