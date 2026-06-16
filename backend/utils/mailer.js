const nodemailer = require("nodemailer");

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

// Send via Brevo's HTTP API (HTTPS / port 443). Required on hosts like Render
// that block outbound SMTP ports (25/465/587) — SMTP there fails with
// "Connection timeout". Uses BREVO_API_KEY (an "xkeysib-..." key, which is
// different from the "xsmtpsib-..." SMTP key).
async function sendViaApi({ to, subject, html, replyTo }) {
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "SpendSmart", email: process.env.SMTP_FROM },
      to: [{ email: to }],
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      subject,
      htmlContent: html,
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Brevo API ${resp.status}: ${detail.slice(0, 200)}`);
  }
}

async function sendMail({ to, subject, html, replyTo }) {
  // Prefer the HTTP API when a key is configured (works on Render; SMTP is blocked there).
  if (process.env.BREVO_API_KEY) {
    try {
      await sendViaApi({ to, subject, html, replyTo });
      console.log(`[Mailer] Sent "${subject}" -> ${to} (Brevo API)`);
      return { sent: true };
    } catch (err) {
      console.error("[Mailer] Brevo API send failed:", err.message);
      return { sent: false, reason: err.message };
    }
  }

  // Fallback: SMTP — fine for local dev, but blocked on most PaaS hosts.
  const t = createTransporter();
  if (!t) {
    console.warn("[Mailer] Email not configured (set BREVO_API_KEY, or SMTP_* for local) — skipping.");
    return { sent: false, reason: "Email not configured" };
  }
  try {
    await t.sendMail({ from: `SpendSmart <${process.env.SMTP_FROM}>`, to, subject, html, ...(replyTo ? { replyTo } : {}) });
    console.log(`[Mailer] Sent "${subject}" -> ${to} (SMTP)`);
    return { sent: true };
  } catch (err) {
    console.error("[Mailer] SMTP send failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendMail };
