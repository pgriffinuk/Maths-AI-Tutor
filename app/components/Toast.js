'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

const STANDARD_TOAST_MS = 3500;
const CELEBRATION_TOAST_MS = 3800;

// Single shared notification system for every transient confirmation in
// the app (feedback sent, marking flagged, notify-me signed up, etc.)
// plus the richer badge-unlock celebration - both flow through the same
// one-at-a-time queue, so a celebration can never stack or clash with a
// plain confirmation if both were triggered close together. Mounted once
// near the root layout (see app/layout.js); call useToast() from any
// page to fire one.
export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    const duration = active.type === 'celebration' ? CELEBRATION_TOAST_MS : STANDARD_TOAST_MS;
    dismissTimerRef.current = setTimeout(() => setActive(null), duration);
    return () => clearTimeout(dismissTimerRef.current);
  }, [active]);

  // toast is { type: 'success' | 'info', message } for a plain
  // confirmation, or { type: 'celebration', title, description } for the
  // badge-unlock variant.
  const showToast = useCallback((toast) => {
    setQueue((q) => [...q, { id: crypto.randomUUID(), type: 'info', ...toast }]);
  }, []);

  function dismissActive() {
    clearTimeout(dismissTimerRef.current);
    setActive(null);
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastContainer toast={active} onDismiss={dismissActive} />
    </ToastContext.Provider>
  );
}

// Returns showToast(toast) - see the type shapes documented above.
export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error('useToast must be used within a ToastProvider');
  return showToast;
}

function ToastContainer({ toast, onDismiss }) {
  if (!toast) return null;

  if (toast.type === 'celebration') {
    return (
      <div className="badge-toast" onClick={onDismiss} role="status" key={toast.id}>
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
          <div className="badge-toast-title">{toast.title}</div>
          <div className="badge-toast-desc">{toast.description}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`toast toast-${toast.type}`} onClick={onDismiss} role="status" key={toast.id}>
      <span className="toast-dot" aria-hidden="true" />
      <span className="toast-message">{toast.message}</span>
    </div>
  );
}
