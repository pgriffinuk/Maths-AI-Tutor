'use client';
import { useEffect, useRef, useState } from 'react';

// Consolidates what used to be a long row of separate top-nav buttons
// (Progress, Mock Exam, Billing, Feedback, Teacher/Parent Dashboard, Log
// out) into a single circular account icon with a dropdown - items is the
// ordered list of { key, label, onClick } links, rendered above a divider
// and a final Log out entry. Closes on an outside click or Escape.
export default function AccountMenu({ items, onLogout }) {
  const [open, setOpen] = useState(false);
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

  function handleItemClick(action) {
    setOpen(false);
    action();
  }

  return (
    <div className="account-menu" ref={containerRef}>
      <button
        type="button"
        className="account-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
      </button>
      {open && (
        <div className="account-menu-panel">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className="account-menu-item"
              onClick={() => handleItemClick(item.onClick)}
            >
              {item.label}
            </button>
          ))}
          <div className="account-menu-divider" />
          <button
            type="button"
            className="account-menu-item account-menu-logout"
            onClick={() => handleItemClick(onLogout)}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
