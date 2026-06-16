import { useState, useEffect } from "react";
import api from "../../services/api";
import { Icon } from "./UI";

/**
 * Live market prices strip (gold, USD/INR, Nifty 50, …). Pulls from the
 * cached /api/market backend route. Renders nothing until data is available,
 * so it stays hidden when the backend key isn't configured yet.
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
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {items.map(it => {
        const up = it.changePercent >= 0;
        return (
          <div key={it.symbol} className="flex-shrink-0 bg-surface border border-stroke rounded-xl px-3.5 py-2 min-w-[132px]">
            <p className="text-[11px] text-muted font-medium truncate">{it.label}</p>
            <p className="text-sm font-bold text-ink tnum mt-0.5">{priceStr(it.price, it.currency)}</p>
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-success" : "text-danger"}`}>
              <Icon name={up ? "trendingUp" : "trendingDown"} size={11} />
              {up ? "+" : ""}{it.changePercent.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
