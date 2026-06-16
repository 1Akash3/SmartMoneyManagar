import { useState, useEffect } from "react";
import api from "../../services/api";

/**
 * Vertical live-market ticker for the sidebar (gold, USD/INR, BTC, …).
 * Pulls from the cached /api/market route. Renders nothing until data is
 * available, so it stays hidden when the backend key isn't configured.
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
    <div className="mx-3 mb-3 p-3 rounded-xl bg-surface2 border border-stroke">
      <p className="text-[10px] font-semibold text-faint uppercase tracking-widest mb-2">Markets</p>
      <div className="space-y-2">
        {items.map(it => {
          const up = it.changePercent >= 0;
          return (
            <div key={it.symbol} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink2 truncate">{it.label}</span>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold text-ink tnum leading-tight">{priceStr(it.price, it.currency)}</p>
                <p className={`text-[10px] font-semibold tnum leading-tight ${up ? "text-success" : "text-danger"}`}>
                  {up ? "+" : ""}{it.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
