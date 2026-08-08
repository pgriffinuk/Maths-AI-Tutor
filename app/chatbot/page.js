'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Footer from '../components/Footer';
import Logo from '../components/Logo';
import BotAvatar from '../components/BotAvatar';
import MicButton from '../components/MicButton';
import ImageAttachButton from '../components/ImageAttachButton';
import DrawButton from '../components/DrawButton';
import DrawingCanvasModal from '../components/DrawingCanvasModal';
import MathSymbolToolbar from '../components/MathSymbolToolbar';
import MathText from '../components/MathText';
import StarterPromptChips from '../components/StarterPromptChips';
import { useToast } from '../components/Toast';
import { SIGNUPS_OPEN } from '../../lib/config';
import { getOrCreateAnonChatToken } from '../../lib/anonChatToken';
import { saveAnonChatHistory, loadAnonChatHistory, clearAnonChatHistory } from '../../lib/anonChatHistory';
import { readImageFile } from '../../lib/imageUpload';
import { insertAtCursor } from '../../lib/insertAtCursor';

const ACCESS_CODE_STORAGE_KEY = 'stepwise:chatbotAccessCode';

// The free, no-login version of the Socratic maths tutor - linked from the
// landing page as a low-friction way to try Stepwise's "help, don't just
// answer" approach before signing up. Deliberately no auth check and no
// redirect - only a random per-browser token (see lib/anonChatToken.js)
// tracks the daily message count server-side, purely so the limit can't
// just be reset by reloading the page. The conversation itself is
// persisted separately, purely client-side (see lib/anonChatHistory.js) -
// nothing about its content ever reaches the server.
//
// Gated behind a shared access code (cost control, not personal data - see
// /api/anon-chat, which is where this is actually enforced) rather than
// open to the whole internet. The code lives in sessionStorage, not
// localStorage, since it only needs to last the current browsing session.
export default function ChatbotPage() {
  const router = useRouter();
  const showToast = useToast();
  const [accessCode, setAccessCode] = useState(null); // null until entered (or restored from sessionStorage) and not yet rejected
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessError, setAccessError] = useState('');
  const [sessionToken, setSessionToken] = useState(null);
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', content, imageDataUrl? } - restored from/autosaved to localStorage, see lib/anonChatHistory.js
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState(null); // { dataUrl, mediaType, base64 } - attached but not yet sent
  const [imageError, setImageError] = useState('');
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyError, setNotifyError] = useState('');
  const threadEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setSessionToken(getOrCreateAnonChatToken());
    const storedCode = window.sessionStorage.getItem(ACCESS_CODE_STORAGE_KEY);
    if (storedCode) setAccessCode(storedCode);
  }, []);

  // Restores whatever conversation was left on-screen last time, purely
  // client-side (see lib/anonChatHistory.js) - independent of sessionToken
  // above, which only tracks the daily message count server-side.
  useEffect(() => {
    const saved = loadAnonChatHistory();
    if (saved && saved.length > 0) setMessages(saved);
  }, []);

  // Debounced autosave of the visible conversation, so it isn't hitting
  // localStorage on every keystroke while typing - nothing here ever
  // leaves the browser.
  useEffect(() => {
    if (messages.length === 0) return;
    const timeoutId = setTimeout(() => {
      // Strip any attached-photo data URLs before persisting - they're
      // only a few KB to several MB each as base64, which can quickly
      // blow past localStorage's quota if they accumulate across a long
      // conversation. The live in-memory conversation keeps them for the
      // current tab; a refresh just loses the thumbnails, not the text.
      const messagesForStorage = messages.some((m) => m.imageDataUrl)
        ? messages.map((m) => (m.imageDataUrl ? { ...m, imageDataUrl: undefined } : m))
        : messages;
      saveAnonChatHistory(messagesForStorage);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  // Clears both the on-screen conversation and its localStorage entry,
  // returning to the initial greeting - for anyone who'd rather start
  // fresh than continue an old conversation. Deliberately doesn't touch
  // sessionToken/limitReached - the daily message count is unaffected.
  function startNewConversation() {
    setMessages([]);
    clearAnonChatHistory();
    setErrorMsg('');
    setPendingImage(null);
  }

  function handleAccessSubmit(e) {
    e.preventDefault();
    const code = accessCodeInput.trim();
    if (!code) return;
    window.sessionStorage.setItem(ACCESS_CODE_STORAGE_KEY, code);
    setAccessCode(code);
    setAccessError('');
  }

  async function handleImageSelected(file) {
    setImageError('');
    try {
      const image = await readImageFile(file);
      setPendingImage(image);
    } catch (err) {
      setImageError(err.message || 'Could not read that image.');
    }
  }

  // Pasted images are attached the same way as a photo upload; pasted text
  // is left alone so the browser's default "paste as text" still happens.
  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) handleImageSelected(file);
  }

  function handleDrawingUse(image) {
    setImageError('');
    setPendingImage(image);
    setDrawingOpen(false);
  }

  function insertSymbol(symbol) {
    const el = inputRef.current;
    const { newValue, newCursorPos } = insertAtCursor(el, input, symbol);
    setInput(newValue);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(newCursorPos, newCursorPos);
    });
  }

  // Fills the input with the chip's example phrasing rather than sending
  // it straight away, so the student can still edit it before sending.
  function handleChipSelect(prompt) {
    setInput(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && !pendingImage) || !sessionToken || !accessCode || loading) return;
    const history = messages;
    const imageToSend = pendingImage;
    setMessages((h) => [...h, { role: 'user', content: text || '(Photo attached)', imageDataUrl: imageToSend?.dataUrl }]);
    setInput('');
    setPendingImage(null);
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/anon-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          message: text,
          history,
          accessCode,
          image: imageToSend ? { base64: imageToSend.base64, mediaType: imageToSend.mediaType } : null
        })
      });
      const data = await res.json();
      if (data.error) {
        setMessages((h) => h.slice(0, -1));
        setInput(text);
        setPendingImage(imageToSend);
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
      setPendingImage(imageToSend);
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
    showToast({ type: 'success', message: "Thanks - we'll be in touch." });
  }

  return (
    <div>
      <header className="marketing-topbar" style={{ justifyContent: 'center' }}>
        <Logo />
      </header>

      <main>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <div className="eyebrow section-gap" style={{ textAlign: 'center' }}>Free Maths Chatbot</div>
          <h1 style={{ textAlign: 'center' }}>Stuck on a problem, or need help with a topic? Get help - not just the answer.</h1>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
            Whether you&apos;re stuck on a specific problem or just want help understanding
            a topic, ask away.
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
              {messages.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <button type="button" className="link-btn" onClick={startNewConversation}>Start a new conversation</button>
                </div>
              )}
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="chat-thread" style={{ maxHeight: 420, overflowY: 'auto', minHeight: 160 }}>
                  {messages.length === 0 && !loading && (
                    <>
                      <div className="assistant-row">
                        <BotAvatar size={24} />
                        <div className="chat-bubble assistant">
                          Hi! How can I help you today?
                        </div>
                      </div>
                      <StarterPromptChips onSelect={handleChipSelect} disabled={!sessionToken} />
                    </>
                  )}
                  {messages.map((m, i) => (
                    m.role === 'assistant' ? (
                      <div className="assistant-row" key={i}>
                        <BotAvatar size={24} />
                        <div className="chat-bubble assistant"><MathText text={m.content} /></div>
                      </div>
                    ) : (
                      <div className="chat-bubble user" key={i} style={{ whiteSpace: 'pre-wrap' }}>
                        {m.imageDataUrl && (
                          <img src={m.imageDataUrl} alt="Attached problem" className="chat-image-thumb" />
                        )}
                        <MathText text={m.content} />
                      </div>
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
                {imageError && <div className="alert-error" style={{ marginTop: 10 }}>{imageError}</div>}

                {!limitReached && (
                  <>
                    {pendingImage && (
                      <div className="image-preview-row">
                        <img src={pendingImage.dataUrl} alt="Attached problem" className="chat-image-thumb" />
                        <button type="button" className="link-btn" onClick={() => setPendingImage(null)}>Remove photo</button>
                      </div>
                    )}
                    <MathSymbolToolbar onInsert={insertSymbol} disabled={loading || !sessionToken} />
                    <div className="row" style={{ marginTop: 10 }}>
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="What's confusing you? Include what you've already tried if you can..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                        onPaste={handlePaste}
                        style={{ flex: 1, minWidth: 180 }}
                        disabled={!sessionToken}
                      />
                      <MicButton onResult={setInput} disabled={loading || !sessionToken} />
                      <ImageAttachButton onSelect={handleImageSelected} disabled={loading || !sessionToken} />
                      <DrawButton onClick={() => setDrawingOpen(true)} disabled={loading || !sessionToken} />
                      <button className="primary" onClick={sendMessage} disabled={loading || (!input.trim() && !pendingImage) || !sessionToken}>
                        {loading ? 'Thinking...' : 'Send'}
                      </button>
                    </div>
                    <p className="chat-tip">Tip: the more specific you are about what&apos;s confusing you, the better the help you&apos;ll get.</p>
                  </>
                )}

                {drawingOpen && (
                  <DrawingCanvasModal onUse={handleDrawingUse} onCancel={() => setDrawingOpen(false)} />
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
                      // The full "Thanks - we'll be in touch." confirmation
                      // is a toast (see handleNotifySubmit) - this just
                      // needs to permanently replace the form so it's clear
                      // the email was already taken.
                      <p style={{ margin: 0, color: 'var(--ink-soft)' }}>You&apos;re on the list.</p>
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

      <Footer />
    </div>
  );
}
