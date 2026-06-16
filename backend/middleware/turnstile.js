/**
 * Cloudflare Turnstile verification middleware.
 * Verifies the turnstileToken sent from the frontend widget against
 * Cloudflare's siteverify API using TURNSTILE_SECRET_KEY.
 *
 * - If TURNSTILE_SECRET_KEY is not set → skips verification (dev convenience).
 * - Guest login is exempt (checked in the auth route before this runs).
 */
async function verifyTurnstile(req, res, next) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return next(); // not configured — skip

  // Turnstile validates the page hostname against the widget's allowlist and
  // does not support raw IP addresses — so phones on the LAN (192.168.x.x)
  // can never pass in local testing. Enforce only in production.
  if (process.env.NODE_ENV === "development") return next();

  // Guest login bypass (demo account)
  if (req.body?.email === "guest@spendsmart.com") return next();

  const token = req.body?.turnstileToken;
  if (!token) {
    return res.status(400).json({ error: "Captcha verification required. Please complete the challenge." });
  }

  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: req.headers["cf-connecting-ip"] || req.ip,
      }),
    });
    const data = await resp.json();
    if (!data.success) {
      const codes = data["error-codes"] || [];
      console.warn("[Turnstile] verify failed — error-codes:", JSON.stringify(codes), "| hostname:", data.hostname);
      return res.status(403).json({ error: "Captcha verification failed. Please try again.", codes });
    }
    next();
  } catch (err) {
    console.warn("Turnstile verify error:", err.message);
    // Degrade gracefully — don't lock users out if Cloudflare is unreachable
    next();
  }
}

module.exports = verifyTurnstile;
