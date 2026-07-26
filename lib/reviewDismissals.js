// Client-only (browser localStorage) memory of a spaced-review nudge the
// student has already dismissed, so it doesn't reappear immediately. This
// is just a short "not now" cooldown layered on top of lib/rewards.js's
// findDueReviews, which is recomputed fresh from attempts every time -
// dismissing a nudge doesn't change whether the topic is actually overdue,
// it just suppresses showing it again for a few days.

const DISMISS_COOLDOWN_DAYS = 3;

function storageKey(board, course, topic) {
  return `stepwise:dismissedReview:${board}:${course}:${topic}`;
}

export function isReviewDismissed(board, course, topic) {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(storageKey(board, course, topic));
    if (!raw) return false;
    const dismissedAt = new Date(raw);
    if (Number.isNaN(dismissedAt.getTime())) return false;
    const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / 86400000;
    return daysSinceDismissed < DISMISS_COOLDOWN_DAYS;
  } catch (err) {
    return false;
  }
}

export function dismissReview(board, course, topic) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(board, course, topic), new Date().toISOString().slice(0, 10));
  } catch (err) {
    // localStorage can throw (quota exceeded, private browsing) - losing the
    // dismissal just means the nudge might reappear a bit sooner, not worth crashing over.
  }
}
