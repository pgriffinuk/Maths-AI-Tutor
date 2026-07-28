'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import MarketingHeader from './components/MarketingHeader';
import MarketingFooter from './components/MarketingFooter';
import HeroIllustration from './components/HeroIllustration';
import { COURSES, EXAM_BOARDS } from '../lib/levels';
import { SIGNUPS_OPEN } from '../lib/config';

const ACCENTS = ['red', 'gold', 'green'];

// COURSES has separate entries for A Level Maths - Pure and A Level Maths -
// Statistics & Mechanics (different topic lists), but they're one product on
// the marketing page - dedupe on the part of the label before the em dash so
// this still tracks COURSES automatically (e.g. GCSE Foundation, GCSE
// Higher, IGCSE Foundation, IGCSE Higher, A Level Maths, A Level Further
// Maths) without listing the same qualification twice. Excludes the
// general-* (no exam) courses - this grid is deliberately qualification-only;
// general maths gets its own short mention just below it instead.
const LEVEL_GROUPS = [...new Set(
  COURSES.filter((c) => !c.key.startsWith('general-')).map((c) => c.label.split(' — ')[0])
)];

// The "levels covered" cards read left-to-right as a difficulty ramp, so
// their top-border colour is interpolated across the same red -> gold ->
// green brand scale used everywhere else (RAG language), rather than a
// single flat accent per card.
const DIFFICULTY_STOPS = ['var(--red)', 'var(--gold)', 'var(--green)'];
function difficultyAccent(index, total) {
  if (total <= 1) return DIFFICULTY_STOPS[0];
  const s = (index / (total - 1)) * (DIFFICULTY_STOPS.length - 1);
  const segment = Math.min(Math.floor(s), DIFFICULTY_STOPS.length - 2);
  const pct = Math.round((s - segment) * 100);
  return `color-mix(in srgb, ${DIFFICULTY_STOPS[segment]} ${100 - pct}%, ${DIFFICULTY_STOPS[segment + 1]} ${pct}%)`;
}

const FAQS = [
  {
    q: 'What areas do you cover?',
    a: "Everything is delivered online, so students anywhere can get started straight away. No travel needed."
  },
  {
    q: 'Is this online or in person?',
    a: "Everything is online, including the 1:1 sessions - there's no in-person option. All tutoring runs over video call, so it works just as well wherever you're based."
  },
  {
    q: 'What exam boards do you support?',
    a: `All the major boards: ${EXAM_BOARDS.map((b) => b.label).join(', ')}.`
  },
  {
    q: "Is my child's data kept safe?",
    a: (
      <>
        Yes - all practice data is kept securely and only used to support your
        child&apos;s learning. Full details are in our <a href="/privacy">Privacy Policy</a>.
      </>
    )
  }
];

// The one and only Stepwise marketing/landing page at the root URL.
export default function Home() {
  const router = useRouter();

  const [parentName, setParentName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [studentLevel, setStudentLevel] = useState('not-sure');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Renders the full marketing page immediately for everyone; this only
  // redirects logged-in visitors to /dashboard once the session check
  // resolves, rather than blocking first render on it.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  async function handleEnquirySubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const { error } = await supabase.from('enquiries').insert({
      parent_name: parentName,
      contact_email: contactEmail,
      student_level: studentLevel,
      message
    });
    setSubmitting(false);
    if (error) { setSubmitError(error.message); return; }
    setSubmitted(true);
  }

  function handlePrimaryCta() {
    if (SIGNUPS_OPEN) {
      router.push('/signup');
    } else {
      document.getElementById('get-in-touch')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div>
      <MarketingHeader />

      <main>
        <div className="wrap wide marketing-hero">
          <div className="marketing-hero-grid">
            <div className="marketing-hero-text">
              <h1>Step-by-step maths tutoring, wherever you are</h1>
              <p className="marketing-subheading">
                AI-marked practice and coaching from a qualified secondary maths teacher,
                covering GCSE, IGCSE, A Level Maths and Further Maths across all major
                exam boards.
              </p>
              <div className="row">
                <button className="primary" onClick={handlePrimaryCta}>
                  {SIGNUPS_OPEN ? 'Get started' : 'Register your interest'}
                </button>
                <button onClick={() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  See how it works
                </button>
                <button onClick={() => router.push('/chatbot')} style={{ borderColor: 'var(--gold)', borderWidth: 2 }}>
                  Try our free Maths Chatbot
                </button>
              </div>

              <div className="trust-bar">
                <span className="trust-pill">Qualified Maths Teacher</span>
                <span className="trust-pill">GCSE &middot; IGCSE &middot; A Level &middot; Further Maths</span>
                <span className="trust-pill">Edexcel &middot; AQA &middot; OCR &middot; CAIE &middot; Eduqas</span>
                <span className="trust-pill">100% online</span>
              </div>
            </div>
            <div className="marketing-hero-art">
              <HeroIllustration />
            </div>
          </div>
        </div>

        <div id="how-it-works" className="marketing-section">
          <div className="wrap wide">
            <div className="eyebrow" style={{ textAlign: 'center' }}>How it works</div>
            <div className="landing-features">
              <div className="feature-card accent-red">
                <svg className="feature-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g transform="rotate(-45 20 20)">
                    <rect x="16" y="2" width="8" height="24" rx="2" fill="var(--red)" />
                    <rect x="16" y="2" width="8" height="6" rx="2" fill="#F1B8B0" />
                    <path d="M16 26 L20 34 L24 26 Z" fill="var(--red)" />
                  </g>
                </svg>
                <div className="q-label">Practice</div>
                <p>Exam-style questions generated for the exact board, course and topic you're working on.</p>
              </div>
              <div className="feature-card accent-gold">
                <svg className="feature-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="32" height="32" rx="8" fill="var(--gold)" />
                  <path d="M12 20 L18 26 L28 14" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <div className="q-label">Marking</div>
                <p>Every line of working checked and commented on, just like real marked homework.</p>
              </div>
              <div className="feature-card accent-green">
                <svg className="feature-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 30 L14 20 L22 26 L36 10" stroke="var(--green)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <circle cx="36" cy="10" r="4" fill="var(--green)" />
                </svg>
                <div className="q-label">Coaching</div>
                <p>Progress tracked over time, starting with a free diagnostic to find a starting point.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="marketing-section">
          <div className="wrap wide">
            <div className="eyebrow" style={{ textAlign: 'center' }}>Levels covered</div>
            <div className="levels-grid">
              {LEVEL_GROUPS.map((label, i) => (
                <div
                  className="level-card"
                  key={label}
                  style={{ borderTop: `4px solid ${difficultyAccent(i, LEVEL_GROUPS.length)}` }}
                >
                  <span className={`level-dot level-dot-${ACCENTS[i % ACCENTS.length]}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', color: 'var(--ink-soft)', marginTop: 18 }}>
              Not working towards an exam? Stepwise also works for general maths
              confidence-building - no syllabus required.
            </p>
          </div>
        </div>

        <div className="marketing-section">
          <div className="wrap wide">
            <div className="eyebrow" style={{ textAlign: 'center' }}>Meet your tutor</div>
            <div className="card tutor-card">
              <div className="tutor-avatar">PG</div>
              <div className="tutor-bio">
                <div className="edit-me">
                  [EDIT ME: Add a short bio here - your teaching experience, qualifications,
                  and what makes your approach different. E.g. &ldquo;I&apos;m a qualified
                  secondary maths teacher with X years&apos; experience teaching GCSE and
                  A Level...&rdquo;]
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="marketing-section">
          <div className="wrap wide">
            <div className="card callout" style={{ textAlign: 'center' }}>
              <h2 style={{ marginTop: 0 }}>Not sure where to start?</h2>
              <p style={{ color: 'var(--ink-soft)' }}>
                Take a free diagnostic assessment to find out exactly which topics need work.
              </p>
              <button className="primary" onClick={handlePrimaryCta}>
                {SIGNUPS_OPEN ? 'Get started' : 'Register your interest'}
              </button>
            </div>
          </div>
        </div>

        <div id="get-in-touch" className="marketing-section">
          <div className="wrap wide">
            <div className="eyebrow" style={{ textAlign: 'center' }}>Get in touch</div>
            <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
              {submitted ? (
                <p style={{ textAlign: 'center', margin: 0 }}>Thanks - I&apos;ll be in touch soon.</p>
              ) : (
                <form onSubmit={handleEnquirySubmit} className="enquiry-form">
                  <input
                    placeholder="Parent's name"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Contact email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                  <select value={studentLevel} onChange={(e) => setStudentLevel(e.target.value)}>
                    <option value="not-sure">Not sure</option>
                    {COURSES.map((course) => (
                      <option key={course.key} value={course.key}>{course.label}</option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button className="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send'}
                  </button>
                  {submitError && <div className="error-msg">{submitError}</div>}
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="marketing-section">
          <div className="wrap wide">
            <div className="eyebrow" style={{ textAlign: 'center' }}>Frequently asked questions</div>
            <div className="faq-list">
              {FAQS.map((item) => (
                <details className="faq-item" key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
