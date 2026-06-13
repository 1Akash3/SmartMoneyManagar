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

async function sendMail({ to, subject, html }) {
  const t = createTransporter();
  if (!t) {
    console.warn("[Mailer] SMTP not configured — skipping email.");
    return { sent: false, reason: "SMTP not configured" };
  }
  try {
    await t.sendMail({ from: `SpendSmart <${process.env.SMTP_FROM}>`, to, subject, html });
    console.log(`[Mailer] Sent "${subject}" → ${to}`);
    return { sent: true };
  } catch (err) {
    console.error("[Mailer] Send failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendMail };
