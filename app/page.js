'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Logo from './components/Logo';
import { COURSES, EXAM_BOARDS } from '../lib/levels';

const ACCENTS = ['red', 'gold', 'green'];

// COURSES has separate entries for A Level Maths - Pure and A Level Maths -
// Statistics & Mechanics (different topic lists), but they're one product on
// the marketing page - dedupe on the part of the label before the em dash so
// this still tracks COURSES automatically (e.g. GCSE/IGCSE Foundation, GCSE/
// IGCSE Higher, A Level Maths, A Level Further Maths) without listing the
// same qualification twice.
const LEVEL_GROUPS = [...new Set(COURSES.map((c) => c.label.split(' — ')[0]))];

const FAQS = [
  {
    q: 'What areas do you cover near Weymouth?',
    a: "[EDIT ME: list towns/areas you're willing to travel to or serve online]"
  },
  {
    q: 'Is this online or in person?',
    a: '[EDIT ME: clarify]'
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

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const [parentName, setParentName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [studentLevel, setStudentLevel] = useState('not-sure');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/dashboard');
      } else {
        setChecked(true);
      }
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

  if (!checked) return null;

  return (
    <div>
      <header className="marketing-topbar">
        <Logo />
        <a className="marketing-login-link" href="/login">Log in</a>
      </header>

      <main>
        <div className="wrap wide marketing-hero">
          <h1>Step-by-step maths tutoring for Weymouth students</h1>
          <p className="marketing-subheading">
            AI-marked practice and coaching from a qualified secondary maths teacher,
            covering GCSE, IGCSE, A Level Maths and Further Maths across all major
            exam boards.
          </p>
          <div className="row">
            <button className="primary" onClick={() => router.push('/signup')}>Get started</button>
            <button onClick={() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}>
              See how it works
            </button>
          </div>

          <div className="trust-bar">
            <span className="trust-pill">Qualified Maths Teacher</span>
            <span className="trust-pill">GCSE &middot; IGCSE &middot; A Level &middot; Further Maths</span>
            <span className="trust-pill">Edexcel &middot; AQA &middot; OCR &middot; CAIE &middot; Eduqas</span>
            <span className="trust-pill">Based in Weymouth, Dorset</span>
          </div>
        </div>

        <div id="how-it-works" className="marketing-section">
          <div className="wrap wide">
            <div className="eyebrow" style={{ textAlign: 'center' }}>How it works</div>
            <div className="landing-features">
              <div className="feature-card accent-red">
                <div className="q-label">Practice</div>
                <p>Exam-style questions generated for the exact board, course and topic you're working on.</p>
              </div>
              <div className="feature-card accent-gold">
                <div className="q-label">Marking</div>
                <p>Every line of working checked and commented on, just like real marked homework.</p>
              </div>
              <div className="feature-card accent-green">
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
                <div className="level-card" key={label}>
                  <span className={`level-dot level-dot-${ACCENTS[i % ACCENTS.length]}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
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
                  A Level, based in Weymouth...&rdquo;]
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
              <button className="primary" onClick={() => router.push('/signup')}>Get started</button>
            </div>
          </div>
        </div>

        <div className="marketing-section">
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

      <footer className="marketing-footer">
        <div className="marketing-footer-inner">
          <span>[EDIT ME: your contact email]</span>
          <span>&copy; Stepwise</span>
          <div className="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
