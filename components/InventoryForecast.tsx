"use client";

import { useEffect, useMemo, useState } from "react";
import type { FoodCostSummary, IngredientForecast, MonthlyFoodCost, SalesInventoryCheck, VendorOrderPlan } from "@/lib/automation3";
import type { ItemMaster } from "@/lib/supabase";

const money = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? "—" : `$${n.toFixed(2)}`;
const num = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

// sales_to_inventory_check stores year/month as separate integers, unlike the
// date-based monthly_food_cost and food_cost_summary tables. Normalize it here
// so the UI never calls .slice() or .startsWith() on a numeric month.
const reconciliationMonthKey = (r: SalesInventoryCheck) =>
  `${Number(r.year)}-${String(Number(r.month)).padStart(2, "0")}`;

export function InventoryForecast({ items, monthly, summaries, forecasts, orderPlan, reconciliation }: { items: ItemMaster[]; monthly: MonthlyFoodCost[]; summaries: FoodCostSummary[]; forecasts: IngredientForecast[]; orderPlan: VendorOrderPlan[]; reconciliation: SalesInventoryCheck[] }) {
  const months = useMemo(() => {
    const known = [
      ...monthly.map(r => r.month.slice(0, 7)),
      ...summaries.map(r => r.month.slice(0, 7)),
      ...reconciliation.map(reconciliationMonthKey),
    ];
    // Keep a useful close-month picker even when a month has not been written yet.
    // Existing months remain included; the picker also exposes the current month and
    // the previous 11 calendar months so a backfill can be started from Quick Actions.
    const d = new Date();
    const recent: string[] = [];
    for (let i = 0; i < 12; i++) {
      const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
      recent.push(x.toISOString().slice(0, 7));
    }
    return Array.from(new Set([...known, ...recent])).sort().reverse();
  }, [monthly, summaries, reconciliation]);
  const defaultMonth = useMemo(() => {
    const dataMonths = [...monthly.map(r => r.month.slice(0, 7)), ...summaries.map(r => r.month.slice(0, 7))].sort().reverse();
    return dataMonths[0] || new Date().toISOString().slice(0, 7);
  }, [monthly, summaries]);
  const [month, setMonth] = useState(defaultMonth);
  useEffect(() => { setMonth(current => current || defaultMonth); }, [defaultMonth]);
  const [section, setSection] = useState<"close" | "forecast" | "reconciliation">("close");
  const [running, setRunning] = useState<"sales" | "close" | null>(null);
  const [runMessage, setRunMessage] = useState("");
  const [runError, setRunError] = useState("");
  const monthRows = monthly.filter(r => r.month.startsWith(month));
  const summaryRows = summaries.filter(r => r.month.startsWith(month));
  const goalPct = summaryRows.find(r => r.category === "5000 + 5020 Combined" && Number.isFinite(Number(r.goal_pct)))?.goal_pct
    ?? summaryRows.find(r => Number.isFinite(Number(r.goal_pct)))?.goal_pct
    ?? null;
  const eligibleSummary = summaryRows.filter(r => r.food_cost_pct_eligible !== false && r.category !== "5010 Pot Cost");
  const totalFoodCost = eligibleSummary.reduce((s, r) => s + Number(r.food_cost || 0), 0);
  const totalSales = eligibleSummary.reduce((s, r) => s + Number(r.sales || 0), 0);
  const overallPct = totalSales ? totalFoodCost / totalSales : null;
  const reviewCount = monthRows.filter(r => r.needs_review || r.ending_qty == null).length;
  const shortOrders = orderPlan.filter(r => r.meets_minimum === false);
  const latestWeek = forecasts.map(r => r.week_of).sort().reverse()[0];
  const weekForecast = latestWeek ? forecasts.filter(r => r.week_of === latestWeek) : forecasts;
  const weekOrders = latestWeek ? orderPlan.filter(r => r.week_of === latestWeek) : orderPlan;
  const monthChecks = reconciliation.filter(r => reconciliationMonthKey(r) === month);
  const flaggedChecks = monthChecks.filter(r => r.flag === "needs_review");
  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    const ra = monthRows.find(x => x.item_name === a.item);
    const rb = monthRows.find(x => x.item_name === b.item);
    const active = (r: MonthlyFoodCost | undefined) => {
      if (!r) return false;
      return [r.starting_qty, r.purchased_qty, r.unit_cost, r.ending_qty, r.ending_cost].some(v => v != null && Number.isFinite(Number(v)));
    };
    const av = active(ra) ? 0 : 1;
    const bv = active(rb) ? 0 : 1;
    return av - bv || a.item.localeCompare(b.item);
  }), [items, monthRows]);

  async function runAutomation(type: "sales" | "close") {
    const [year, monthNumber] = month.split("-").map(Number);
    setRunning(type);
    setRunMessage("");
    setRunError("");
    try {
      const endpoint = type === "sales" ? "/api/automation3/monthly-sales" : "/api/automation3/monthly-close";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month: monthNumber }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Automation failed.");
      setRunMessage(type === "sales" ? "Monthly Sales completed." : "Monthly Close completed.");
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Automation failed.");
    } finally {
      setRunning(null);
    }
  }

  async function saveEnding(item: ItemMaster, value: string) {
    const ending_qty = Number(value);
    if (!Number.isFinite(ending_qty) || ending_qty < 0) return;
    const response = await fetch("/api/automation3/ending-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: Number(month.slice(0, 4)),
        month: Number(month.slice(5, 7)),
        item_name: item.item,
        category: item.category,
        ending_qty,
      }),
    });
    if (response.ok) window.location.reload();
    else {
      const data = await response.json().catch(() => ({}));
      setRunError(data.error || "Could not save ending inventory.");
    }
  }

  return <>
    <div className="inventory-kpis">
      <div className="stat-card"><span>Food Cost %</span><strong>{overallPct == null ? "—" : `${(overallPct * 100).toFixed(1)}%`}</strong><small>{goalPct == null ? "Goal not configured" : `${(Number(goalPct) * 100).toFixed(0)}% goal`}</small></div>
      <div className="stat-card"><span>Food Cost $</span><strong>{money(totalFoodCost)}</strong><small>{monthLabel(month)}</small></div>
      <div className="stat-card"><span>Close readiness</span><strong>{reviewCount ? `${reviewCount} open` : "Ready"}</strong><small>{reviewCount ? "Counts / reviews still needed" : "No missing ending counts"}</small></div>
      <div className="stat-card"><span>Order alerts</span><strong>{shortOrders.length}</strong><small>Below vendor minimum</small></div>
    </div>

    <div className="inventory-switcher">
      <div className="invoice-tabs"><button className={section === "close" ? "active" : ""} onClick={() => setSection("close")}>Monthly Food Cost Close</button><button className={section === "forecast" ? "active" : ""} onClick={() => setSection("forecast")}>Weekly Ordering Forecast</button><button className={section === "reconciliation" ? "active" : ""} onClick={() => setSection("reconciliation")}>Sales ↔ Inventory Check</button></div>
      <div className="month-picker"><label>Close month</label><select className="invoice-select" value={month} onChange={e => setMonth(e.target.value)}>{months.length ? months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>) : <option value={month}>{monthLabel(month)}</option>}</select></div>
      <div className="automation3-quick-actions">
        <span className="quick-actions-label">Actions</span>
        <div className="review-actions automation3-actions">
          <button className="secondary-button" disabled={running !== null} onClick={() => runAutomation("sales")}>
            {running === "sales" ? "Refreshing…" : "Refresh Clover Sales"}
          </button>
          <button className="primary-button" disabled={running !== null} onClick={() => runAutomation("close")}>
            {running === "close" ? "Running Close…" : "Run Monthly Close"}
          </button>
        </div>
      </div>
    </div>
    {(runMessage || runError) && <div className={`invoice-alert ${runError ? "danger" : ""}`}>
      <strong>{runError ? "Automation error:" : "Automation:"}</strong> {runError || runMessage}
    </div>}

    {section === "close" ? <div className="inventory-close-grid">
      <section className="card inventory-panel"><div className="panel-head"><div><span className="section-kicker">Part A · Monthly close</span><h3 className="font-display">Starting → Purchased → Ending</h3><p>Starting inventory carries forward automatically. Staff only enter the physical ending quantity; cost is derived from the canonical unit cost.</p></div><span className="close-badge">{reviewCount ? `${reviewCount} to finish` : "Close ready"}</span></div>
        <div className="table-shell"><table className="invoice-table inventory-table"><thead><tr><th>Item</th><th>Category</th><th>Start</th><th>Purchased</th><th>Unit Cost</th><th>Ending Qty</th><th>Ending Cost</th><th>Review</th></tr></thead><tbody>{sortedItems.map(item => { const r = monthRows.find(x => x.item_name === item.item); return <tr key={item.id}><td><strong>{item.item}</strong><small>{item.count_by_unit}</small></td><td>{item.category}</td><td>{num(r?.starting_qty)}</td><td>{num(r?.purchased_qty)}</td><td>{money(r?.unit_cost)}</td><td>{r?.ending_qty == null ? <input className="count-input" inputMode="decimal" placeholder="Physical count" onBlur={e => saveEnding(item, e.target.value)} /> : <span className="ending-count">{num(r.ending_qty)}</span>}</td><td>{money(r?.ending_cost ?? (r?.ending_qty != null && r.unit_cost != null ? r.ending_qty * r.unit_cost : null))}</td><td>{r?.needs_review ? <span className="invoice-status needs_review">Review</span> : r ? <span className="invoice-status matched">OK</span> : <span className="invoice-status no_match">Pending</span>}</td></tr>; })}</tbody></table></div>
      </section>
      <aside className="card close-summary"><div className="panel-head"><div><span className="section-kicker">Food Cost summary</span><h3 className="font-display">Food Cost Summary</h3></div></div>{summaryRows.length ? summaryRows.map(r => <div className={`cost-summary-row ${r.status}`} key={r.id}><div><strong>{r.category}</strong><span>{r.category === "5010 Pot Cost" ? "Excluded until owner confirms costs" : "Included in Food Cost %"}</span></div><strong>{r.food_cost_pct == null ? "—" : `${(r.food_cost_pct * 100).toFixed(1)}%`}</strong></div>) : <div className="empty-review compact"><h4>No close summary yet</h4><p>Category totals will appear after the monthly close and ending counts are complete.</p></div>}<div className="close-formula"><span>Formula</span><strong>Starting + Purchased − Ending = Food Cost</strong><small>5010 Pot Cost remains outside the Food Cost calculation until its costs are confirmed.</small></div></aside>
    </div> : section === "forecast" ? <div className="forecast-grid">
      <section className="card inventory-panel"><div className="panel-head"><div><span className="section-kicker">Part B · Weekly forecast</span><h3 className="font-display">Next delivery demand</h3><p>{latestWeek ? `Forecast week of ${new Date(`${latestWeek}T00:00:00`).toLocaleDateString()}` : "Waiting for the first forecast run."} · Growth is calculated per ingredient, not as one flat percentage.</p></div></div><div className="table-shell"><table className="invoice-table inventory-table"><thead><tr><th>Ingredient</th><th>Unit</th><th>Prior-year qty</th><th>YoY growth</th><th>Forecast qty</th><th>Forecast cost</th></tr></thead><tbody>{weekForecast.map(r => <tr key={r.id}><td><strong>{r.ingredient}</strong></td><td>{r.unit || "—"}</td><td>{num(r.prior_year_qty)}</td><td className={Number(r.growth_rate_pct || 0) > 0 ? "trend-up" : "trend-down"}>{r.growth_rate_pct == null ? "—" : `${Number(r.growth_rate_pct).toFixed(1)}%`}</td><td>{num(r.forecast_qty)}</td><td>{money(r.forecast_cost)}</td></tr>)}</tbody></table></div></section>
      <aside className="card close-summary"><div className="panel-head"><div><span className="section-kicker">Vendor order guardrails</span><h3 className="font-display">Order Guide</h3></div></div>{weekOrders.length ? weekOrders.map(r => <div className={`order-row ${r.meets_minimum === false ? "short" : "met"}`} key={r.id}><div><strong>{r.vendor}</strong><span>{r.ingredient} · {num(r.projected_qty)} {r.unit || "units"}</span></div><div><strong>{money(r.projected_spend)}</strong><small>{r.vendor_minimum == null ? "Minimum not set" : `${money(r.vendor_minimum)} minimum`}</small></div></div>) : <div className="empty-review compact"><h4>No order plan yet</h4><p>Run the weekly n8n workflow to populate ingredient demand and vendor minimum checks.</p></div>}<div className="vendor-minimum-note"><strong>Known minimums</strong><span>Bar Harbor Seafood $350 · Sysco $650 · US Foods 10 cases</span></div></aside>
    </div> : <div className="reconciliation-grid">
      <section className="card inventory-panel"><div className="panel-head"><div><span className="section-kicker">Part A · Reconciliation checkpoint</span><h3 className="font-display">Theoretical vs. actual usage</h3><p>Clover sales are translated through recipe_bom and modifier_bom, then compared with Starting + Purchased − Ending. Anything outside the ±10% band is surfaced for review.</p></div><span className={`close-badge ${flaggedChecks.length ? "recon-alert" : ""}`}>{flaggedChecks.length ? `${flaggedChecks.length} flagged` : "Within band"}</span></div>
        <div className="table-shell"><table className="invoice-table inventory-table"><thead><tr><th>Ingredient</th><th>Theoretical</th><th>Actual</th><th>Variance</th><th>Variance %</th><th>Variance $</th><th>Status</th><th>Note</th></tr></thead><tbody>{monthChecks.length ? monthChecks.map(r => <tr key={r.id}><td><strong>{r.ingredient}</strong></td><td>{num(r.theoretical_usage)}</td><td>{num(r.actual_usage)}</td><td>{num(r.variance_qty)}</td><td>{r.variance_pct == null ? "—" : `${Number(r.variance_pct).toFixed(1)}%`}</td><td>{money(r.variance_dollars)}</td><td>{r.flag === "needs_review" ? <span className="invoice-status needs_review">Review</span> : <span className="invoice-status matched">OK</span>}</td><td>{r.note || "—"}</td></tr>) : <tr><td colSpan={8}><div className="empty-review compact"><h4>No reconciliation rows yet</h4><p>Run the monthly close after ending inventory is entered. One row will be recorded for each tracked protein.</p></div></td></tr>}</tbody></table></div>
      </section>
      <aside className="card close-summary"><div className="panel-head"><div><span className="section-kicker">Checkpoint rules</span><h3 className="font-display">What is being checked</h3></div></div><div className="close-formula"><span>Actual usage</span><strong>Starting + Purchased − Ending</strong><small>Calculated from the canonical monthly inventory rows.</small></div><div className="close-formula"><span>Theoretical usage</span><strong>Clover sales × recipe/modifier quantities</strong><small>Clams are converted from dozens to each; lobster is each; the other tracked proteins are lb.</small></div><div className="close-formula"><span>Review band</span><strong>±10%</strong><small>Inside the band is treated as normal portioning/counting noise. Outside the band becomes needs_review.</small></div><div className="close-formula"><span>Tracked proteins</span><strong>7</strong><small>Clams · Crab · Shrimp · Scallops · Lobster · Sausage · Kielbasa.</small></div></aside>
    </div>}
  </>;
}
