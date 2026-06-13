const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const dal     = require("../utils/dal");
const { sendMail } = require("../utils/mailer");
const { computeAnalytics } = require("../utils/analytics");

function buildReportHTML(analytics, userName) {
  const { total, totalIncome, netSavings, savingsRate, catTotals, healthScore, warnings, predictedNextMonth } = analytics;
  const scoreColor = healthScore >= 70 ? "#00a86b" : healthScore >= 45 ? "#d97706" : "#e53e3e";
  const catRows = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])
    .map(([c,a]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f2f8">${c}</td><td style="padding:8px 12px;text-align:right;font-weight:600;border-bottom:1px solid #f0f2f8">₹${a.toLocaleString("en-IN")}</td><td style="padding:8px 12px;text-align:right;color:#8b92a5;border-bottom:1px solid #f0f2f8">${Math.round(a/total*100)}%</td></tr>`).join("");

  return `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8ecf4">
    <div style="background:linear-gradient(135deg,#6c63ff,#8b5cf6);padding:28px 32px">
      <h1 style="color:#fff;font-size:22px;margin:0">💸 SpendSmart Financial Report</h1>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:4px 0 0">Prepared for ${userName} · ${new Date().toLocaleDateString("en-IN")}</p>
    </div>
    <div style="padding:28px 32px">
      <table style="width:100%;margin-bottom:24px"><tr>
        <td style="background:#fdf0f0;border-radius:12px;padding:14px;text-align:center;width:33%"><div style="font-size:11px;color:#8b92a5">Spent</div><div style="font-size:18px;font-weight:700;color:#e53e3e">₹${total.toLocaleString("en-IN")}</div></td>
        <td style="width:8px"></td>
        <td style="background:#e6f7f1;border-radius:12px;padding:14px;text-align:center;width:33%"><div style="font-size:11px;color:#8b92a5">Income</div><div style="font-size:18px;font-weight:700;color:#00a86b">₹${totalIncome.toLocaleString("en-IN")}</div></td>
        <td style="width:8px"></td>
        <td style="background:#f0f0ff;border-radius:12px;padding:14px;text-align:center;width:33%"><div style="font-size:11px;color:#8b92a5">Savings</div><div style="font-size:18px;font-weight:700;color:#6c63ff">₹${netSavings.toLocaleString("en-IN")}</div></td>
      </tr></table>
      <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center">
        <span style="font-size:32px;font-weight:700;color:${scoreColor}">${healthScore}</span><span style="color:#8b92a5">/100</span>
        <div style="font-size:12px;color:#8b92a5;margin-top:2px">Financial Health Score · ${savingsRate}% savings rate</div>
      </div>
      <h3 style="font-size:14px;color:#1a1d23;margin:0 0 10px">Category Breakdown</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
        <tr style="background:#f4f6fb"><th style="padding:8px 12px;text-align:left;color:#8b92a5;font-size:11px">CATEGORY</th><th style="padding:8px 12px;text-align:right;color:#8b92a5;font-size:11px">AMOUNT</th><th style="padding:8px 12px;text-align:right;color:#8b92a5;font-size:11px">%</th></tr>
        ${catRows}
      </table>
      ${warnings.length ? `<h3 style="font-size:14px;color:#1a1d23;margin:0 0 10px">⚠️ Alerts</h3>${warnings.map(w=>`<div style="background:#fef3e2;border-left:3px solid #d97706;padding:10px 14px;margin-bottom:6px;border-radius:0 8px 8px 0;font-size:13px;color:#4a5168"><strong>${w.type}:</strong> ${w.message}</div>`).join("")}` : ""}
      <p style="font-size:12px;color:#8b92a5;margin-top:20px">📈 Predicted spend next month: <strong>₹${predictedNextMonth.toLocaleString("en-IN")}</strong></p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f0f2f8;text-align:center"><p style="font-size:11px;color:#c4c9d6;margin:0">SpendSmart · AI-Powered Financial Intelligence</p></div>
  </div>`;
}

router.post("/report", auth, async (req, res) => {
  try {
    const { toEmail } = req.body;
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    const txns = await dal.getTransactions(req.user.id);
    if (!txns.length) return res.status(400).json({ error: "No transactions to report. Upload data first." });

    const analytics = computeAnalytics(txns);
    const html      = buildReportHTML(analytics, req.user.name || "User");
    const result    = await sendMail({ to: toEmail, subject: "Your SpendSmart Financial Health Report 📊", html });

    if (result.sent) {
      res.json({ success: true, message: `Report sent to ${toEmail}` });
    } else {
      // Email failed → PDF download must still work (spec requirement)
      res.json({ success: false, emailFailed: true, message: "Email service unavailable. Use PDF download instead.", analytics });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to generate report." });
  }
});

module.exports = router;
