'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import BotAvatar from '../components/BotAvatar';
import { SIGNUPS_OPEN } from '../../lib/config';
import { getOrCreateAnonChatToken } from '../../lib/anonChatToken';

const ACCESS_CODE_STORAGE_KEY = 'stepwise:chatbotAccessCode';

// The free, no-login version of the Socratic maths tutor - linked from the
// landing page as a low-friction way to try Stepwise's "help, don't just
// answer" approach before signing up. Deliberately no auth check, no
// redirect, and no persistence of the conversation itself - only a random
// per-browser token (see lib/anonChatToken.js) survives a refresh, purely
// so the daily message limit can't just be reset by reloading the page.
//
// Gated behind a shared access code (cost control, not personal data - see
// /api/anon-chat, which is where this is actually enforced) rather than
// open to the whole internet. The code lives in sessionStorage, not
// localStorage, since it only needs to last the current browsing session.
export default function ChatbotPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState(null); // null until entered (or restored from sessionStorage) and not yet rejected
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessError, setAccessError] = useState('');
  const [sessionToken, setSessionToken] = useState(null);
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', content } - in-memory only
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyError, setNotifyError] = useState('');
  const threadEndRef = useRef(null);

  useEffect(() => {
    setSessionToken(getOrCreateAnonChatToken());
    const storedCode = window.sessionStorage.getItem(ACCESS_CODE_STORAGE_KEY);
    if (storedCode) setAccessCode(storedCode);
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  function handleAccessSubmit(e) {
    e.preventDefault();
    const code = accessCodeInput.trim();
    if (!code) return;
    window.sessionStorage.setItem(ACCESS_CODE_STORAGE_KEY, code);
    setAccessCode(code);
    setAccessError('');
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !sessionToken || !accessCode || loading) return;
    const history = messages;
    setMessages((h) => [...h, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/anon-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, message: text, history, accessCode })
      });
      const data = await res.json();
      if (data.error) {
        setMessages((h) => h.slice(0, -1));
        setInput(text);
        if (res.status === 401) {
          // Wrong or expired code - drop it and bounce back to the gate
          // rather than surfacing a raw error in the chat itself.
          window.sessionStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
          setAccessCode(null);
          setAccessError("That access code wasn't right - please try again.");
          return;
        }
        setErrorMsg(data.error);
        if (data.code === 'anon_rate_limit') setLimitReached(true);
        return;
      }
      setMessages((h) => [...h, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((h) => h.slice(0, -1));
      setInput(text);
      setErrorMsg('Something went wrong - check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function goToSignup() {
    router.push(SIGNUPS_OPEN ? '/signup' : '/#get-in-touch');
  }

  // Lightweight, one-field capture at the highest-intent moment in this
  // funnel (a visitor who's just been told to come back tomorrow) -
  // deliberately just an email, not the fuller "Get in touch" enquiry
  // form, and never re-prompted if they ignore it.
  async function handleNotifySubmit(e) {
    e.preventDefault();
    const email = notifyEmail.trim();
    if (!email) return;
    setNotifySubmitting(true);
    setNotifyError('');
    const { error } = await supabase.from('notify_signup_interest').insert({ email });
    setNotifySubmitting(false);
    if (error) { setNotifyError(error.message); return; }
    setNotifySubmitted(true);
  }

  return (
    <div>
      <MarketingHeader />

      <main>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <div className="eyebrow section-gap" style={{ textAlign: 'center' }}>Free Maths Chatbot</div>
          <h1 style={{ textAlign: 'center' }}>Stuck on a maths problem? Get help - not just the answer.</h1>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
            Type in any maths problem you&apos;re working on. I&apos;ll help you think it
            through step by step, the same way our full tutoring app does.
          </p>

          {!accessCode ? (
            <div className="card" style={{ maxWidth: 360, margin: '0 auto' }}>
              <div className="q-label">Enter access code</div>
              <form onSubmit={handleAccessSubmit}>
                <input
                  type="password"
                  placeholder="Access code"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
                <div className="row">
                  <button className="primary" type="submit" disabled={!accessCodeInput.trim()}>
                    Continue
                  </button>
                </div>
              </form>
              {accessError && <div className="error-msg">{accessError}</div>}
            </div>
          ) : (
            <>
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="chat-thread" style={{ maxHeight: 420, overflowY: 'auto', minHeight: 160 }}>
                  {messages.length === 0 && !loading && (
                    <div className="assistant-row">
                      <BotAvatar size={24} />
                      <div className="chat-bubble assistant">
                        Hi! Type in a maths problem you&apos;re working on - from homework, a
                        textbook, anywhere - and I&apos;ll help you work through it.
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    m.role === 'assistant' ? (
                      <div className="assistant-row" key={i}>
                        <BotAvatar size={24} />
                        <div className="chat-bubble assistant">{m.content}</div>
                      </div>
                    ) : (
                      <div className="chat-bubble user" key={i} style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                    )
                  ))}
                  {loading && (
                    <div className="assistant-row">
                      <BotAvatar size={24} />
                      <div className="chat-bubble assistant"><span className="spinner"></span>thinking...</div>
                    </div>
                  )}
                  <div ref={threadEndRef} />
                </div>

                {errorMsg && <div className="alert-error" style={{ marginTop: 10 }}>{errorMsg}</div>}

                {!limitReached && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <input
                      type="text"
                      placeholder="Type your maths problem..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                      style={{ flex: 1, minWidth: 180 }}
                      disabled={!sessionToken}
                    />
                    <button className="primary" onClick={sendMessage} disabled={loading || !input.trim() || !sessionToken}>
                      {loading ? 'Thinking...' : 'Send'}
                    </button>
                  </div>
                )}
              </div>

              {/* Deliberately NOT a persistent banner - the AI itself decides
                  when it's natural to mention the full product (see
                  /api/anon-chat's system prompt). This fixed message only
                  appears here, at the hard stop of the daily limit, where a
                  clear next step genuinely is needed. */}
              {limitReached && (
                <div className="card callout" style={{ textAlign: 'center', marginTop: 20 }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 600 }}>
                    Like getting help this way? The full Stepwise coaching tool goes further:
                  </p>
                  <ul style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto 14px', paddingLeft: 20 }}>
                    <li>A free diagnostic test that finds exactly which topics need work</li>
                    <li>Marked practice questions for your exact exam board and course</li>
                    <li>Step-by-step marking on your own written working, not just chat</li>
                    <li>Progress tracked over time, with coaching that remembers where you left off</li>
                  </ul>
                  <button className="primary" onClick={goToSignup}>
                    {SIGNUPS_OPEN ? 'Sign up' : 'Register your interest'}
                  </button>

                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--paper-line)' }}>
                    {notifySubmitted ? (
                      <p style={{ margin: 0, color: 'var(--green)', fontWeight: 600 }}>
                        Thanks - we&apos;ll be in touch.
                      </p>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 10px' }}>
                          Want to know the moment full access opens? Leave your email and
                          we&apos;ll let you know.
                        </p>
                        <form onSubmit={handleNotifySubmit} className="row" style={{ justifyContent: 'center', marginTop: 0 }}>
                          <input
                            type="email"
                            placeholder="Your email"
                            value={notifyEmail}
                            onChange={(e) => setNotifyEmail(e.target.value)}
                            style={{ flex: '1 1 220px' }}
                            required
                          />
                          <button className="primary" type="submit" disabled={notifySubmitting || !notifyEmail.trim()}>
                            {notifySubmitting ? 'Submitting...' : 'Notify me'}
                          </button>
                        </form>
                        {notifyError && <div className="error-msg">{notifyError}</div>}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
