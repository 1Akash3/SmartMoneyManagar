/**
 * Public Privacy Policy / Terms pages, reachable at /privacy and /terms
 * even when logged out. Plain templates — review with a professional before
 * relying on them legally.
 */
const UPDATED = "June 17, 2026";
const CONTACT_EMAIL = "akash.gaikwad1304@gmail.com";

function Shell({ title, children }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-stroke bg-surface">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
              </svg>
            </div>
            <span className="font-bold tracking-tight">SpendSmart</span>
          </a>
          <a href="/" className="text-xs text-primary font-medium hover:underline">← Back to app</a>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{title}</h1>
        <p className="text-xs text-muted mb-8">Last updated: {UPDATED}</p>
        <div className="space-y-5 text-sm text-ink2 leading-relaxed">{children}</div>
        <footer className="mt-12 pt-5 border-t border-stroke flex gap-4 text-xs text-faint">
          <a href="/privacy" className="hover:text-primary">Privacy</a>
          <a href="/terms" className="hover:text-primary">Terms</a>
          <a href="/contact" className="hover:text-primary">Contact</a>
        </footer>
      </main>
    </div>
  );
}

function Section({ heading, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink mb-1.5">{heading}</h2>
      {children}
    </section>
  );
}

function Privacy() {
  return (
    <Shell title="Privacy Policy">
      <p>This Privacy Policy explains how SpendSmart ("we", "us") collects, uses, and protects your information when you use our personal finance application.</p>

      <Section heading="1. Information we collect">
        <p>Account details you provide (name, email, password — stored hashed). Financial data you add or import (transactions, categories, goals, budgets, and uploaded bank/UPI statements). Basic usage and device data via analytics. We do not collect bank login credentials.</p>
      </Section>
      <Section heading="2. How we use it">
        <p>To provide the service: authentication, analytics on your spending, goal tracking, reminders, reports, and product improvement. We do not sell your personal data.</p>
      </Section>
      <Section heading="3. Storage and security">
        <p>Data is stored in MongoDB Atlas. Passwords are hashed with bcrypt and access is protected with signed tokens. We take reasonable measures to protect your data but no system is perfectly secure.</p>
      </Section>
      <Section heading="4. Third-party services">
        <p>We use Brevo (transactional email), Cloudflare Turnstile (bot protection), and Google Analytics (usage analytics, only with your consent). These providers process limited data on our behalf under their own policies.</p>
      </Section>
      <Section heading="5. Cookies and analytics">
        <p>Analytics load only after you accept via the cookie banner. You can decline at any time; essential functionality (login session) does not depend on analytics.</p>
      </Section>
      <Section heading="6. Your rights">
        <p>You can view, edit, or delete your data in the app, and request account deletion by contacting us. Deleting your account removes your stored financial data.</p>
      </Section>
      <Section heading="7. Contact">
        <p>Questions about privacy? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a> or use our <a href="/contact" className="text-primary hover:underline">contact form</a>.</p>
      </Section>
    </Shell>
  );
}

function Terms() {
  return (
    <Shell title="Terms & Conditions">
      <p>By creating an account or using SpendSmart, you agree to these Terms. If you do not agree, please do not use the service.</p>

      <Section heading="1. The service">
        <p>SpendSmart is a personal finance tracking and analytics tool. It is provided "as is" for personal, non-commercial use.</p>
      </Section>
      <Section heading="2. Not financial advice">
        <p>Insights, forecasts, recommendations, and market data in the app are for informational purposes only and are not professional financial, investment, or tax advice. Decisions you make based on them are your own responsibility.</p>
      </Section>
      <Section heading="3. Your account">
        <p>You are responsible for keeping your login secure and for the accuracy of the data you enter or import. Do not share your account or use it unlawfully.</p>
      </Section>
      <Section heading="4. Acceptable use">
        <p>Do not attempt to disrupt, reverse-engineer, scrape, or abuse the service, or upload content you do not have the right to use.</p>
      </Section>
      <Section heading="5. Limitation of liability">
        <p>To the extent permitted by law, we are not liable for any loss arising from use of the service, including inaccuracies in analytics or market data, or service interruptions.</p>
      </Section>
      <Section heading="6. Changes">
        <p>We may update the service and these Terms. Continued use after changes constitutes acceptance. Material changes will be reflected in the "last updated" date.</p>
      </Section>
      <Section heading="7. Contact">
        <p>Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a> or use our <a href="/contact" className="text-primary hover:underline">contact form</a>.</p>
      </Section>
    </Shell>
  );
}

export default function LegalPage({ type }) {
  return type === "terms" ? <Terms /> : <Privacy />;
}
