const express = require("express");
const router  = express.Router();

/**
 * Live market prices via Twelve Data (https://twelvedata.com).
 * Set TWELVE_DATA_API_KEY in the backend env. Results are cached in memory
 * for 10 minutes so we stay well within the free tier (~800 calls/day).
 * Symbols that aren't available on your plan are skipped gracefully.
 */
const ASSETS = [
  { symbol: "XAU/USD", label: "Gold (oz)", currency: "USD" },
  { symbol: "USD/INR", label: "USD / INR", currency: "INR" },
  { symbol: "BTC/USD", label: "Bitcoin",   currency: "USD" },
];

const TTL = 10 * 60 * 1000;
let cache = { at: 0, data: null };

router.get("/", async (req, res) => {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return res.status(503).json({ error: "Market data not configured." });

  if (cache.data && Date.now() - cache.at < TTL) {
    return res.json({ ...cache.data, cached: true });
  }

  try {
    const symbols = ASSETS.map(a => a.symbol).join(",");
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${key}`;
    const resp = await fetch(url);
    const json = await resp.json();

    // A single-symbol query returns the quote directly; multiple are keyed by symbol.
    const map = ASSETS.length === 1 ? { [ASSETS[0].symbol]: json } : json;

    const items = ASSETS.map(a => {
      const q = map[a.symbol];
      if (!q || q.status === "error" || q.code) return null;
      const price = parseFloat(q.close != null ? q.close : q.price);
      if (!isFinite(price)) return null;
      return { label: a.label, symbol: a.symbol, currency: a.currency, price, changePercent: parseFloat(q.percent_change) || 0 };
    }).filter(Boolean);

    if (!items.length) {
      if (cache.data) return res.json({ ...cache.data, stale: true });
      return res.status(502).json({ error: "No market data available right now." });
    }

    cache = { at: Date.now(), data: { items, updatedAt: new Date().toISOString() } };
    res.json({ ...cache.data, cached: false });
  } catch (err) {
    console.error("[Market] fetch failed:", err.message);
    if (cache.data) return res.json({ ...cache.data, stale: true });
    res.status(502).json({ error: "Couldn't fetch market data." });
  }
});

module.exports = router;
