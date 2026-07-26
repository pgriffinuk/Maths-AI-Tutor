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
  const [isLinkedChild, setIsLinkedChild] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('parent_id, subscription_status, subscription_tier')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (error) console.error('Could not load billing profile:', error.message);
      setIsLinkedChild(!!profile?.parent_id);
      setSubscriptionStatus(profile?.subscription_status ?? null);
      setSubscriptionTier(profile?.subscription_tier ?? null);
      setChecked(true);
    });
  }, [router]);

  if (!session || !checked) return null;

  // Billing is parent-managed once an account is linked - shown in place of
  // the billing UI (rather than a hard router.replace) so the student
  // actually gets to read why, instead of just bouncing straight back to
  // the dashboard.
  if (isLinkedChild) {
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
        <div className="card empty-state">
          <p>Ask your parent to manage this from their account.</p>
        </div>
      </div>
    );
  }

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
        <div className="card">
          <div className="q-label">Standard</div>
          <h2 style={{ marginTop: 0 }}>£19.99/month</h2>
          <p>7-day free trial, then £19.99/month. Cancel any time.</p>
          <button className="primary" disabled title="Payments aren't connected yet">
            Coming soon
          </button>
        </div>
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
