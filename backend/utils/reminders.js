// Scheduled reminder emails. Finds reminders whose due date has arrived (and
// that haven't been emailed yet) and notifies the user. Triggered by:
//   • an in-process hourly sweep (server.js — runs while the server is awake)
//   • the /api/cron/run endpoint — for the free tier (which sleeps), hit by an
//     external scheduler such as cron-job.org, which also keeps the server warm.
const dal = require("./dal");
const { sendMail } = require("./mailer");

const SYMBOL = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

function reminderEmail(name, note, overdue, cur) {
  const amount = note.amount > 0 ? ` of ${cur}${Number(note.amount).toLocaleString("en-IN")}` : "";
  const when = overdue ? `was due on ${note.dueDate}` : `is due today (${note.dueDate})`;
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto">
    <div style="background:#4f46e5;color:#fff;padding:20px 24px;border-radius:14px 14px 0 0">
      <h2 style="margin:0;font-size:18px">${overdue ? "Overdue reminder" : "Payment reminder"}</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:24px;background:#fff">
      <p style="font-size:15px;color:#111;margin:0 0 12px">Hi ${name || "there"},</p>
      <p style="font-size:15px;color:#111;margin:0 0 12px">Your reminder <strong>"${note.title}"</strong>${amount} ${when}.</p>
      ${note.description ? `<p style="font-size:14px;color:#555;margin:0 0 12px">${note.description}</p>` : ""}
      <p style="font-size:13px;color:#888;margin:18px 0 0">Open SpendSmart and mark it done once it's handled.</p>
    </div>
  </div>`;
}

// Returns { checked, sent }. Never throws on an individual email failure —
// a failed send simply isn't marked notified, so the next sweep retries it.
async function sendDueReminders() {
  const today = new Date().toISOString().slice(0, 10);
  const due = await dal.getDueReminders(today);
  let sent = 0;
  for (const raw of due) {
    const note = raw.toObject ? raw.toObject() : raw;
    const id = note._id || note.id;
    const user = await dal.findUserById(note.userId);
    if (!user?.email) { await dal.markNoteNotified(id); continue; } // guest / no email — skip
    const overdue = note.dueDate < today;
    const cur = SYMBOL[user.currency] || "₹";
    const r = await sendMail({
      to: user.email,
      subject: `${overdue ? "Overdue" : "Reminder"}: ${note.title}`,
      html: reminderEmail(user.name, note, overdue, cur),
    });
    if (r.sent) { await dal.markNoteNotified(id); sent++; }
  }
  return { checked: due.length, sent };
}

module.exports = { sendDueReminders };
