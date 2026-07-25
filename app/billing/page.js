'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';

const STATUS_LABELS = {
  active: 'Active',
  trialing: 'Free trial',
  past_due: 'Payment past due',
  canceled: 'Cancelled',
  incomplete: 'Incomplete',
  incomplete_expired: 'Incomplete (expired)',
  unpaid: 'Unpaid'
};

export default function BillingPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_tier')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (error) console.error('Could not load billing profile:', error.message);
      setSubscriptionStatus(profile?.subscription_status ?? null);
      setSubscriptionTier(profile?.subscription_tier ?? null);
    });
  }, [router]);

  if (!session) return null;

  const hasSubscription = !!subscriptionStatus;

  return (
    <div className="wrap">
      <div className="topnav">
        <Logo size="sm" />
        <button onClick={() => router.push('/dashboard')} style={{ fontSize: 12, padding: '5px 10px' }}>
          Back to dashboard
        </button>
      </div>

      <div className="eyebrow section-gap">Account</div>
      <h1>Billing</h1>

      {hasSubscription ? (
        <div className="card">
          <div className="q-label">Your plan</div>
          <p>
            Status: <span className="score-tag">{STATUS_LABELS[subscriptionStatus] || subscriptionStatus}</span>
            {subscriptionTier && (
              <>
                {' '}Plan: <span className="score-tag" style={{ background: 'var(--gold)' }}>{subscriptionTier}</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="q-label">Standard</div>
            <h2 style={{ marginTop: 0 }}>£19.99/month</h2>
            <p>7-day free trial, then £19.99/month. Cancel any time.</p>
            <button className="primary" disabled title="Payments aren't connected yet">
              Coming soon
            </button>
          </div>

          <div className="card">
            <div className="q-label">Personal Access</div>
            <h2 style={{ marginTop: 0 }}>+£15/month</h2>
            <p>Direct access to Paul, plus a monthly check-in call. Added on top of the Standard plan.</p>
            <button className="primary" disabled title="Payments aren't connected yet">
              Coming soon
            </button>
          </div>
        </>
      )}

      <div className="eyebrow section-gap">1:1 sessions</div>

      <div className="card">
        <div className="q-label">GCSE/IGCSE Session</div>
        <h2 style={{ marginTop: 0 }}>£40</h2>
        <p>A one-off 1:1 online tutoring session.</p>
        <div className="edit-me">[PASTE PAYMENT LINK URL HERE]</div>
      </div>

      <div className="card">
        <div className="q-label">A Level/Further Maths Session</div>
        <h2 style={{ marginTop: 0 }}>£45</h2>
        <p>A one-off 1:1 online tutoring session.</p>
        <div className="edit-me">[PASTE PAYMENT LINK URL HERE]</div>
      </div>
    </div>
  );
}
