'use client';
import { useEffect, useRef, useState } from 'react';

// Formats an updated_at timestamp the way a chat app's history list
// usually does - "Today, 3:45pm" / "Yesterday, 3:45pm" for the last two
// calendar days, the weekday name for the rest of the past week, and a
// short date beyond that.
function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();

  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

  const todayMidnight = new Date(now).setHours(0, 0, 0, 0);
  const dateMidnight = new Date(date).setHours(0, 0, 0, 0);
  const daysAgo = Math.floor((todayMidnight - dateMidnight) / 86400000);
  if (daysAgo < 7) return date.toLocaleDateString([], { weekday: 'long' });

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

// "History" dropdown for the free /chatbot page - lists past conversations
// archived when the student clicked "Start a new conversation" (see
// /api/save-conversation), most recent first. The list is fetched lazily
// the first time it's opened each page load, not refetched on every click,
// since it only ever changes when this page itself archives a new one.
export default function HistoryPanel({ sessionToken, accessCode, onSelectConversation }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState(null); // null = not yet fetched
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function toggleOpen() {
    const opening = !open;
    setOpen(opening);
    if (!opening || conversations !== null || !sessionToken || !accessCode) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/conversation-history?sessionToken=${encodeURIComponent(sessionToken)}&accessCode=${encodeURIComponent(accessCode)}`);
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setConversations(data.conversations || []);
    } catch (err) {
      setError('Could not load your history.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id) {
    setLoadingId(id);
    setError('');
    try {
      const res = await fetch(`/api/conversation/${id}?sessionToken=${encodeURIComponent(sessionToken)}&accessCode=${encodeURIComponent(accessCode)}`);
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      onSelectConversation(data.messages || [], id);
      setOpen(false);
    } catch (err) {
      setError('Could not load that conversation.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="history-menu" ref={containerRef}>
      <button
        type="button"
        className="link-btn"
        onClick={toggleOpen}
        aria-haspopup="true"
        aria-expanded={open}
      >
        History
      </button>
      {open && (
        <div className="history-panel">
          {loading && <p className="history-empty">Loading...</p>}
          {!loading && error && <p className="history-empty">{error}</p>}
          {!loading && !error && conversations && conversations.length === 0 && (
            <p className="history-empty">No past conversations yet.</p>
          )}
          {!loading && !error && conversations && conversations.length > 0 && (
            <ul className="history-list">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="history-item"
                    onClick={() => handleSelect(c.id)}
                    disabled={loadingId === c.id}
                  >
                    <span className="history-item-title">{c.title}</span>
                    <span className="history-item-date">{loadingId === c.id ? 'Loading...' : formatRelativeDate(c.updated_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
