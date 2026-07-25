'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import MarketingHeader from './components/MarketingHeader';
import MarketingFooter from './components/MarketingFooter';
import { TOWNS } from '../lib/towns';

const ACCENTS = ['red', 'gold', 'green'];

// The global Stepwise brand page at the root URL - not tied to any one
// town. Local landing pages live at /[slug] (see app/[town]/page.js and
// lib/towns.js), and are linked from the "Available in" grid below.
export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const [requestedTown, setRequestedTown] = useState('');
  const [contactEmail, setContactEmail] = useState('');
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

  async function handleTownInterestSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const { error } = await supabase.from('town_interest').insert({
      requested_town: requestedTown,
      contact_email: contactEmail
    });
    setSubmitting(false);
    if (error) { setSubmitError(error.message); return; }
    setSubmitted(true);
  }

  if (!checked) return null;

  const liveTowns = TOWNS.filter((t) => t.live);

  return (
    <div>
      <MarketingHeader />

      <main>
        <div className="wrap wide marketing-hero">
          <h1>Stepwise - AI-powered maths coaching</h1>
          <p className="marketing-subheading">
            Step-by-step exam practice and coaching for GCSE, IGCSE, A Level
            and Further Maths, marked line by line by a qualified secondary
            maths teacher.
          </p>
          <div className="row">
            <button className="primary" onClick={() => router.push('/signup')}>Get started</button>
          </div>

          <div className="trust-bar">
            <span className="trust-pill">Qualified Maths Teacher</span>
            <span className="trust-pill">GCSE &middot; IGCSE &middot; A Level &middot; Further Maths</span>
            <span className="trust-pill">Edexcel &middot; AQA &middot; OCR &middot; CAIE &middot; Eduqas</span>
          </div>
        </div>

        <div className="marketing-section">
          <div className="wrap wide">
            <div className="eyebrow" style={{ textAlign: 'center' }}>Available in</div>
            <div className="levels-grid">
              {liveTowns.map((t, i) => (
                <a
                  key={t.slug}
                  href={`/${t.slug}`}
                  className="level-card"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className={`level-dot level-dot-${ACCENTS[i % ACCENTS.length]}`} />
                  <span>
                    {t.displayName}{' '}
                    <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>&middot; {t.region}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="marketing-section">
          <div className="wrap wide">
            <div className="eyebrow" style={{ textAlign: 'center' }}>Don&apos;t see your town?</div>
            <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
              {submitted ? (
                <p style={{ textAlign: 'center', margin: 0 }}>Thanks - we&apos;ll be in touch if we expand there.</p>
              ) : (
                <form onSubmit={handleTownInterestSubmit} className="enquiry-form">
                  <input
                    placeholder="Your town"
                    value={requestedTown}
                    onChange={(e) => setRequestedTown(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Contact email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                  <button className="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Notify me'}
                  </button>
                  {submitError && <div className="error-msg">{submitError}</div>}
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
