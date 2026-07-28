// Client-only (browser localStorage) identifier for the free, no-login
// /chatbot page - a random token used purely to rate-limit anonymous chat
// usage server-side (see /api/anon-chat), never tied to any account or
// personal data. Persists in the browser across visits so the daily limit
// can't just be reset by refreshing, but nothing about it is personally
// identifying.
const STORAGE_KEY = 'stepwise:anonChatToken';

export function getOrCreateAnonChatToken() {
  if (typeof window === 'undefined') return null;
  try {
    let token = window.localStorage.getItem(STORAGE_KEY);
    if (!token) {
      token = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, token);
    }
    return token;
  } catch (err) {
    // localStorage unavailable (private browsing, quota) - fall back to an
    // in-memory-only token; the daily limit just won't survive a refresh.
    return crypto.randomUUID();
  }
}
