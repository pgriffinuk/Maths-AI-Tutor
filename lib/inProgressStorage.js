// Client-only (browser localStorage) autosave for a student's in-progress
// question - board/course/topic/difficulty, the question itself, their
// working, chat, and hints - so an accidental refresh or tab close doesn't
// lose it. Deliberately not a database table: this is transient session
// state, not something that needs to sync across devices.

function storageKey(userId) {
  return `stepwise:inProgress:${userId}`;
}

export function saveInProgress(userId, state) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify({ studentId: userId, ...state }));
  } catch (err) {
    // localStorage can throw (quota exceeded, private browsing) - losing the
    // autosave isn't worth crashing the app over.
    console.error('Could not save in-progress question:', err);
  }
}

// The key is already scoped per user id, so this can never read a different
// account's entry - but the stored payload is double-checked against
// `userId` anyway before it's trusted, as a second guard against any future
// change to the key scheme accidentally leaking state between accounts on
// a shared device.
export function loadInProgress(userId) {
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

export function clearInProgress(userId) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch (err) {
    // ignore - nothing meaningful to recover from here
  }
}
