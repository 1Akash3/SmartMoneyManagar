const express = require("express");
const router  = express.Router();
const { sendDueReminders } = require("../utils/reminders");

// Public cron endpoints (no JWT — an external scheduler has no login).
// Protect /run with CRON_SECRET if set: pass it as ?key=... or an x-cron-key
// header. Hitting these keeps the free-tier server warm (which fixes assistant
// cold-starts) AND sends any due reminder emails.
function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured → allow, but setting it is recommended
  return req.query.key === secret || req.get("x-cron-key") === secret;
}

router.all("/run", async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const result = await sendDueReminders();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Lightweight keep-alive (does no work) — for pingers that only need to wake it.
router.get("/ping", (req, res) => res.json({ ok: true, time: new Date() }));

module.exports = router;
