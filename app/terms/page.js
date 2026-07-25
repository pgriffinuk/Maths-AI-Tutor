import Logo from '../components/Logo';

export const metadata = {
  title: 'Terms of Service — Stepwise'
};

export default function TermsPage() {
  return (
    <div className="wrap draft-page">
      <div className="auth-eyebrow"><Logo /></div>
      <h1>Terms of Service</h1>

      <div className="draft-notice">
        [DRAFT - this has been written to reflect what Stepwise actually does,
        but it has not been reviewed by a solicitor. Treat this as a strong
        starting point, not a finished legal document. Get it properly
        reviewed before relying on it for real paying customers, especially
        once payment processing is connected.]
      </div>

      <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Last updated: [DATE]</p>

      <h2>1. Who these terms apply to</h2>
      <p>
        Stepwise is provided by [YOUR FULL NAME / BUSINESS NAME], a sole
        trader based in Weymouth, Dorset, United Kingdom. By creating an
        account or using Stepwise, you (or, if you are under 18, your parent
        or guardian on your behalf) agree to these terms.
      </p>

      <h2>2. What Stepwise is</h2>
      <p>
        Stepwise is an AI-assisted maths practice and coaching tool covering
        GCSE, IGCSE, A Level Maths and A Level Further Maths. It generates
        practice questions, marks submitted working, and provides feedback
        and coaching using AI. It is intended as a supplement to learning,
        not a replacement for qualified teaching, and is provided on that
        basis.
      </p>
      <p>
        Stepwise does not guarantee any specific exam result or grade.
        AI-marked feedback is provided in good faith and checked where
        practical, but may occasionally be inaccurate - always cross-check
        important marking with a teacher if you&apos;re unsure.
      </p>

      <h2>3. Accounts</h2>
      <ul>
        <li>If you are under 18, a parent or guardian must set up or approve your account.</li>
        <li>You&apos;re responsible for keeping your login details secure and for any activity on your account.</li>
        <li>You must provide accurate information when creating an account.</li>
      </ul>

      <h2>4. Subscriptions and payment</h2>
      <ul>
        <li>Stepwise Standard is offered with a 7-day free trial, after which it converts to a recurring monthly subscription unless cancelled beforehand.</li>
        <li>The Personal Access add-on and individual 1:1 sessions are billed separately, as described at the time of purchase.</li>
        <li>You can cancel your subscription at any time through the billing management page; cancellation takes effect at the end of the current billing period, and you won&apos;t be charged again after that.</li>
        <li>Prices may change with reasonable notice; continued use after a price change takes effect means you accept the new price.</li>
        <li>[ADD: your specific refund policy, if you want one different from standard consumer law defaults.]</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Stepwise for anything other than genuine personal learning</li>
        <li>Attempt to disrupt, overload, or gain unauthorised access to the service</li>
        <li>Submit abusive, harmful, or inappropriate content through any part of the app, including the chat and feedback features</li>
        <li>Share your account with others outside your own household</li>
      </ul>
      <p>We may suspend or terminate accounts that breach these terms.</p>

      <h2>6. Intellectual property</h2>
      <p>
        The Stepwise name, branding, and underlying software belong to [YOUR
        FULL NAME / BUSINESS NAME]. Questions and feedback generated for you
        are for your own personal learning use.
      </p>

      <h2>7. Liability</h2>
      <p>
        Stepwise is provided &ldquo;as is.&rdquo; To the extent permitted by law, we are
        not liable for indirect or consequential losses arising from use of
        the service, including exam outcomes. Nothing in these terms limits
        liability where it would be unlawful to do so (for example, liability
        for death or personal injury caused by negligence, or fraud).
      </p>

      <h2>8. Changes to the service or these terms</h2>
      <p>
        We may update Stepwise or these terms from time to time. We&apos;ll
        update the &ldquo;Last updated&rdquo; date above when we do, and let you know
        directly about any significant changes.
      </p>

      <h2>9. Governing law</h2>
      <p>These terms are governed by the law of England and Wales.</p>

      <h2>10. Contact</h2>
      <p>[YOUR CONTACT EMAIL]</p>

      <p style={{ marginTop: 20 }}><a href="/">Back to home</a></p>
    </div>
  );
}
