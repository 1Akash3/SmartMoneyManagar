import { useState, useEffect } from "react";
import api from "../../services/api";
import { Icon } from "./UI";

/**
 * Compact live-market ticker (gold, USD/INR, BTC). A slim, right-aligned
 * strip of chips for the top of the dashboard — pulls from the cached
 * /api/market route and renders nothing until data is available.
 */
function priceStr(price, currency) {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  return sym + Number(price).toLocaleString(currency === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: 2 });
}

export default function MarketWidget() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.get("/market")
      .then(r => { if (alive) setItems(r.data.items || []); })
      .catch(() => { if (alive) setItems([]); });
    load();
    const t = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!items || !items.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {items.map(it => {
        const up = it.changePercent >= 0;
        return (
          <div key={it.symbol} className="flex items-center gap-1.5 bg-surface border border-stroke rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-muted">{it.label}</span>
            <span className="text-[11px] font-semibold text-ink tnum">{priceStr(it.price, it.currency)}</span>
            <span className={`inline-flex items-center text-[10px] font-semibold tnum ${up ? "text-success" : "text-danger"}`}>
              <Icon name={up ? "trendingUp" : "trendingDown"} size={10} />{Math.abs(it.changePercent).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
