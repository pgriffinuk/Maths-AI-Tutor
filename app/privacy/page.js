import Logo from '../components/Logo';

export const metadata = {
  title: 'Privacy Policy — Stepwise'
};

export default function PrivacyPage() {
  return (
    <div className="wrap draft-page">
      <div className="auth-eyebrow"><Logo /></div>
      <h1>Privacy Policy</h1>

      <div className="draft-notice">
        [DRAFT - this has been written to reflect what Stepwise actually does,
        but it has not been reviewed by a solicitor. Treat this as a strong
        starting point, not a finished legal document. Get it properly
        reviewed before relying on it for real paying customers, especially
        once payment processing is connected.]
      </div>

      <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Last updated: [DATE]</p>

      <h2>Who we are</h2>
      <p>
        Stepwise is provided by [YOUR FULL NAME / BUSINESS NAME], a sole trader
        based in Weymouth, Dorset, United Kingdom (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). For
        any question about this policy or your data, contact: [YOUR CONTACT EMAIL].
      </p>
      <p>We are the data controller for the personal data described below.</p>

      <h2>What data we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> name (or nickname), email address,
          and encrypted password (handled entirely by our authentication
          provider - we never see or store your actual password).
        </li>
        <li>
          <strong>Learning data:</strong> the maths questions you&apos;re shown,
          the working you submit, the marking and feedback you receive, your
          diagnostic test results, and your points, streaks and badges.
        </li>
        <li>
          <strong>Communications:</strong> any messages you send us through the
          feedback form, the enquiry form, or the &ldquo;ask about it&rdquo; chat feature
          attached to your marking results.
        </li>
        <li>
          <strong>Payment information</strong> (once billing is active): we do
          not store card details ourselves. Payment is handled by Stripe, a
          third-party payment processor, who hold this data under their own
          privacy terms.
        </li>
        <li>
          <strong>Technical information:</strong> standard web server logs
          (such as IP address and access times), collected automatically by
          our hosting provider as part of normal website operation.
        </li>
      </ul>

      <h2>Why we collect it</h2>
      <ul>
        <li>To provide the tutoring service itself: generating questions, marking your work, and tracking progress over time</li>
        <li>To personalise coaching and diagnostic feedback based on your history</li>
        <li>To respond to enquiries and feedback</li>
        <li>To process payment for subscriptions, once billing is enabled</li>
        <li>To maintain the security and reliability of the service</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        We use a small number of third-party services to run Stepwise. Each
        only receives the data it needs to do its specific job:
      </p>
      <ul>
        <li><strong>Supabase</strong> (database and account hosting) - stores your account details and learning data securely.</li>
        <li>
          <strong>Anthropic</strong> (AI provider) - receives each question, your
          submitted working, and marking context in order to generate
          questions, mark your work, and provide coaching feedback. Anthropic
          does not receive your name, email, or account details as part of
          this - only the academic content of what you&apos;re working on.
        </li>
        <li><strong>Stripe</strong> (payment processor, once connected) - handles subscription payments; we never see or store your card details.</li>
      </ul>
      <p>
        Both Supabase and Anthropic may process data outside the UK/EU (they
        are US-based companies). Where this happens, it is covered by their
        own data protection safeguards and standard contractual clauses. We
        do not sell your data to anyone, and we do not use it for advertising.
      </p>

      <h2>Children&apos;s data</h2>
      <p>
        Some Stepwise users are under 18. Where a student is a minor, we
        expect a parent or guardian to have created or approved the account.
        We collect no more data from a child than is needed to provide the
        tutoring service, and we do not use children&apos;s data for any purpose
        beyond that (no advertising, no profiling beyond what&apos;s needed for
        their own learning progress).
      </p>
      <p>
        A parent or guardian can request to see, correct, or delete their
        child&apos;s data at any time by contacting us - see &ldquo;Your rights&rdquo; below.
      </p>

      <h2>How long we keep data</h2>
      <p>
        We keep account and learning data for as long as your account is
        active. If you ask us to delete your account, we will delete your
        personal data within [30 days], except where we&apos;re required to keep
        certain records for legal or accounting reasons (e.g. payment
        records).
      </p>

      <h2>Your rights</h2>
      <p>Under UK data protection law, you (or a parent/guardian on behalf of a child) have the right to:</p>
      <ul>
        <li>Ask what personal data we hold about you</li>
        <li>Ask us to correct inaccurate data</li>
        <li>Ask us to delete your data (&ldquo;right to erasure&rdquo;)</li>
        <li>Ask us to restrict or object to certain processing</li>
        <li>Request a copy of your data in a portable format</li>
      </ul>
      <p>
        To exercise any of these rights, contact [YOUR CONTACT EMAIL]. We will
        respond within one month, as required by law.
      </p>
      <p>
        You also have the right to complain to the UK Information
        Commissioner&apos;s Office (ICO) at{' '}
        <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>{' '}
        if you believe your data hasn&apos;t been handled properly.
      </p>

      <h2>Cookies</h2>
      <p>
        Stepwise uses only the minimal cookies/local storage needed to keep
        you logged in securely. We do not use tracking or advertising cookies.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as Stepwise changes. We&apos;ll update the
        &ldquo;Last updated&rdquo; date above when we do. Significant changes will be
        communicated directly where practical.
      </p>

      <h2>Contact</h2>
      <p>[YOUR CONTACT EMAIL]</p>

      <p style={{ marginTop: 20 }}><a href="/">Back to home</a></p>
    </div>
  );
}
