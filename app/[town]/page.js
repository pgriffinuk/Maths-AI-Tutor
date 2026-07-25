'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { TOWNS } from '../../lib/towns';
import TownLandingPage from '../components/TownLandingPage';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';

export default function TownPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.town;

  const [checked, setChecked] = useState(false);
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

  async function handleInterestSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const { error } = await supabase.from('town_interest').insert({
      requested_town: slug,
      contact_email: contactEmail
    });
    setSubmitting(false);
    if (error) { setSubmitError(error.message); return; }
    setSubmitted(true);
  }

  if (!checked) return null;

  const town = TOWNS.find((t) => t.slug === slug);

  if (town && town.live) {
    return <TownLandingPage town={town} />;
  }

  const label = town ? town.displayName : slug;

  return (
    <div>
      <MarketingHeader />

      <main>
        <div className="wrap wide marketing-hero">
          <h1>Not in this town yet</h1>
          <p className="marketing-subheading">
            We&apos;re not set up in {label} yet, but leave your email below
            and we&apos;ll let you know if that changes.
          </p>
        </div>

        <div className="marketing-section">
          <div className="wrap wide">
            <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
              {submitted ? (
                <p style={{ textAlign: 'center', margin: 0 }}>Thanks - we&apos;ll be in touch if we expand here.</p>
              ) : (
                <form onSubmit={handleInterestSubmit} className="enquiry-form">
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
