// Client-only (browser localStorage) persistence for the public /chatbot
// page's visible conversation, so a refresh or accidental tab close
// doesn't lose it. Deliberately just the message list, stored under one
// fixed key - never sent to or stored on the server, since this page is
// anonymous with no personal data collected. No expiry: it persists until
// the visitor clears their browser data or explicitly starts a new
// conversation (see clearAnonChatHistory).
//
// Entirely separate from the per-browser sessionToken (lib/anonChatToken.js),
// which only tracks the daily message count server-side for rate limiting -
// clearing this history has no effect on that count.

const STORAGE_KEY = 'stepwise:anonChatHistory';

export function saveAnonChatHistory(messages) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (err) {
    // localStorage can throw (quota exceeded, private browsing) - losing
    // the autosave isn't worth crashing the app over.
    console.error('Could not save chat history:', err);
  }
}

export function loadAnonChatHistory() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    return null;
  }
}

export function clearAnonChatHistory() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // ignore - nothing meaningful to recover from here
  }
}
