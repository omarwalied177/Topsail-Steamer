"use client";

import { useMemo, useState } from "react";

type Invoice = {
  id: string;
  invoice_date: string | null;
  vendor: string | null;
  category: string | null;
  item: string | null;
  count_by: string | null;
  quantity: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  invoice_number: string | null;
  notes: string | null;
  month: number | null;
  match_status: "matched" | "no_match" | "needs_review" | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source_type: string | null;
};

type Item = { id: string; category: string; item: string; count_by_unit: string; conversion_rules: Record<string, unknown> | null; invoice_name_aliases: string[] | null };
type Vendor = { id: string; vendor_name: string; notes: string | null };

type PricePoint = { month: string; avg: number; min: number; max: number; lines: number };

const money = (n: number | null) => n == null || !Number.isFinite(n) ? "—" : `$${n.toFixed(2)}`;
const qty = (n: number | null) => n == null || !Number.isFinite(n) ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 3 });
const monthLabel = (month: string) => {
  const d = new Date(`${month}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};
const monthKey = (date: string | null) => date ? date.slice(0, 7) : "";

function AddItemForm({ onCreated }: { onCreated: (item: Item) => void }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [category, setCategory] = useState("5000 Food Cost"); const [unit, setUnit] = useState("Each"); const [aliases, setAliases] = useState(""); const [rules, setRules] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function save() { setSaving(true); setError(""); try { const r = await fetch("/api/invoices/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item: name, category, count_by_unit: unit, invoice_name_aliases: aliases.split(",").map(s => s.trim()).filter(Boolean), conversion_rules: rules ? JSON.parse(rules) : {} }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); onCreated(d.item); setName(""); setAliases(""); setRules(""); setOpen(false); } catch (e) { setError(e instanceof Error ? e.message : "Could not save item."); } finally { setSaving(false); } }
  return <div className="master-form"><button className="secondary-button" onClick={() => setOpen(!open)}>{open ? "Cancel" : "+ Add item"}</button>{open && <div className="master-form-grid"><input className="editor-input" placeholder="Item name" value={name} onChange={e => setName(e.target.value)} /><input className="editor-input" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} /><input className="editor-input" placeholder="Canonical unit" value={unit} onChange={e => setUnit(e.target.value)} /><input className="editor-input" placeholder="Aliases, comma separated" value={aliases} onChange={e => setAliases(e.target.value)} /><textarea className="editor-textarea" placeholder='Conversion rules JSON, e.g. {"US Foods":{"from":"CS","to":"EA","multiplier":100}}' value={rules} onChange={e => setRules(e.target.value)} /><button className="primary-button" disabled={saving || !name.trim()} onClick={save}>{saving ? "Saving…" : "Save item"}</button>{error && <div className="save-error">{error}</div>}</div>}</div>;
}

function AddVendorForm({ onCreated }: { onCreated: (vendor: Vendor) => void }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function save() { setSaving(true); setError(""); try { const r = await fetch("/api/invoices/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendor_name: name, notes }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); onCreated(d.vendor); setName(""); setNotes(""); setOpen(false); } catch (e) { setError(e instanceof Error ? e.message : "Could not save vendor."); } finally { setSaving(false); } }
  return <div className="master-form"><button className="secondary-button" onClick={() => setOpen(!open)}>{open ? "Cancel" : "+ Add vendor"}</button>{open && <div className="master-form-grid"><input className="editor-input" placeholder="Vendor name" value={name} onChange={e => setName(e.target.value)} /><input className="editor-input" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} /><button className="primary-button" disabled={saving || !name.trim()} onClick={save}>{saving ? "Saving…" : "Save vendor"}</button>{error && <div className="save-error">{error}</div>}</div>}</div>;
}

function PriceChart({ series }: { series: Array<{ vendor: string; points: PricePoint[] }> }) {
  const allMonths = Array.from(new Set(series.flatMap(s => s.points.map(p => p.month)))).sort();
  const values = series.flatMap(s => s.points.map(p => p.avg));
  if (!allMonths.length || !values.length) return <div className="chart-empty"><span>⌁</span><strong>Not enough matched price history yet</strong><p>Once invoices are matched for this item, the monthly unit-cost trend will appear here.</p></div>;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || Math.max(max * 0.1, 1);
  const yMin = Math.max(0, min - range * 0.18); const yMax = max + range * 0.18;
  const W = 900, H = 300, L = 56, R = 24, T = 26, B = 42;
  const x = (i: number) => L + (allMonths.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (allMonths.length - 1));
  const y = (v: number) => T + (yMax - v) * (H - T - B) / (yMax - yMin);
  const palette = ["#1587c9", "#ff4b1f", "#18865b", "#7a5af8", "#8a6a44", "#0d304d"];
  const ticks = [0, .25, .5, .75, 1].map(t => yMin + (yMax - yMin) * t);
  return <div className="price-chart-wrap">
    <svg className="price-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly average unit price trend">
      {ticks.map((v, i) => <g key={i}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e6edf1" /><text x={L - 10} y={y(v) + 4} textAnchor="end" className="chart-axis">{money(v)}</text></g>)}
      {allMonths.map((m, i) => <g key={m}><line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="#f2f5f7" /><text x={x(i)} y={H - 14} textAnchor="middle" className="chart-axis">{monthLabel(m)}</text></g>)}
      {series.map((s, si) => {
        const byMonth = new Map(s.points.map(p => [p.month, p]));
        const points = allMonths.flatMap((m, i) => { const p = byMonth.get(m); return p ? [`${x(i)},${y(p.avg)}`] : []; });
        if (!points.length) return null;
        return <g key={s.vendor}><polyline fill="none" stroke={palette[si % palette.length]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points.join(" ")} />{allMonths.map((m, i) => { const p = byMonth.get(m); return p ? <circle key={m} cx={x(i)} cy={y(p.avg)} r="4.5" fill="#fff" stroke={palette[si % palette.length]} strokeWidth="3"><title>{`${s.vendor} · ${monthLabel(m)} · ${money(p.avg)}`}</title></circle> : null; })}</g>;
      })}
    </svg>
    <div className="chart-legend">{series.filter(s => s.points.length).map((s, i) => <span key={s.vendor}><i style={{ background: palette[i % palette.length] }} />{s.vendor}</span>)}</div>
  </div>;
}

export function InvoiceOperations({ initialInvoices, initialItems, initialVendors }: { initialInvoices: Invoice[]; initialItems: Item[]; initialVendors: Vendor[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [items, setItems] = useState(initialItems);
  const [vendors, setVendors] = useState(initialVendors);
  const [tab, setTab] = useState<"log" | "review" | "price" | "master" | "rollups">("log");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [priceItem, setPriceItem] = useState("");
  const [priceVendor, setPriceVendor] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reviewRows = useMemo(() => invoices.filter(r => r.match_status === "no_match" || r.match_status === "needs_review"), [invoices]);
  const months = useMemo(() => Array.from(new Set(invoices.map(r => monthKey(r.invoice_date)).filter(Boolean))).sort().reverse(), [invoices]);
  const itemOptions = useMemo(() => Array.from(new Set(invoices.map(r => r.item).filter((v): v is string => Boolean(v)))).sort(), [invoices]);
  const filtered = useMemo(() => invoices.filter(r => {
    const hay = [r.vendor, r.item, r.invoice_number, r.notes, r.category].join(" ").toLowerCase();
    return (!query || hay.includes(query.toLowerCase())) && (status === "all" || r.match_status === status) && (monthFilter === "all" || monthKey(r.invoice_date) === monthFilter);
  }), [invoices, query, status, monthFilter]);
  const totalSpend = filtered.reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
  const matchedFiltered = filtered.filter(r => r.match_status === "matched");
  const matchedRate = filtered.length ? Math.round(matchedFiltered.length / filtered.length * 100) : 0;
  const selectedPriceItem = priceItem || itemOptions[0] || "";
  const priceVendors = useMemo(() => Array.from(new Set(invoices.filter(r => r.item === selectedPriceItem && r.match_status === "matched" && r.vendor).map(r => r.vendor as string))).sort(), [invoices, selectedPriceItem]);
  const priceSeries = useMemo(() => {
    const groups = new Map<string, Map<string, number[]>>();
    invoices.forEach(r => {
      if (r.item !== selectedPriceItem || r.match_status !== "matched" || !r.vendor || r.unit_cost == null || !r.invoice_date) return;
      if (priceVendor !== "all" && r.vendor !== priceVendor) return;
      const byMonth = groups.get(r.vendor) || new Map<string, number[]>();
      const key = monthKey(r.invoice_date); const arr = byMonth.get(key) || [];
      arr.push(Number(r.unit_cost)); byMonth.set(key, arr); groups.set(r.vendor, byMonth);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([vendor, byMonth]) => ({ vendor, points: Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, vals]) => ({ month, avg: vals.reduce((a, b) => a + b, 0) / vals.length, min: Math.min(...vals), max: Math.max(...vals), lines: vals.length })) }));
  }, [invoices, selectedPriceItem, priceVendor]);
  const priceInsights = useMemo(() => priceSeries.flatMap(s => {
    const p = s.points; if (p.length < 2) return [];
    const first = p[0].avg, last = p[p.length - 1].avg, delta = last - first, pct = first ? delta / first * 100 : 0;
    return [{ vendor: s.vendor, first, last, delta, pct, direction: delta > 0.005 ? "up" : delta < -0.005 ? "down" : "flat" }];
  }), [priceSeries]);
  const monthRollup = useMemo(() => Object.entries(invoices.reduce<Record<string, { spend: number; lines: number; matched: number }>>((acc, r) => { const key = monthKey(r.invoice_date) || "Unknown"; acc[key] ||= { spend: 0, lines: 0, matched: 0 }; acc[key].spend += Number(r.total_cost || 0); acc[key].lines += 1; if (r.match_status === "matched") acc[key].matched += 1; return acc; }, {})).sort((a, b) => b[0].localeCompare(a[0])), [invoices]);
  const itemRollup = useMemo(() => Object.entries(invoices.reduce<Record<string, { qty: number; spend: number; category: string }>>((acc, r) => { const key = r.item || "Unmatched"; acc[key] ||= { qty: 0, spend: 0, category: r.category || "" }; acc[key].qty += Number(r.quantity || 0); acc[key].spend += Number(r.total_cost || 0); return acc; }, {})).sort((a, b) => b[1].spend - a[1].spend).slice(0, 30), [invoices]);
  const vendorRollup = useMemo(() => Object.entries(invoices.reduce<Record<string, { spend: number; lines: number; last: string | null }>>((acc, r) => { const key = r.vendor || "Unknown"; acc[key] ||= { spend: 0, lines: 0, last: null }; acc[key].spend += Number(r.total_cost || 0); acc[key].lines += 1; if (r.invoice_date && (!acc[key].last || r.invoice_date > acc[key].last)) acc[key].last = r.invoice_date; return acc; }, {})).sort((a, b) => b[1].spend - a[1].spend), [invoices]);

  async function upload(file: File) {
    setUploading(true); setUploadMessage(null);
    try { const form = new FormData(); form.append("file", file); const response = await fetch("/api/invoices/upload", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Upload failed."); setUploadMessage("Invoice/receipt accepted and queued. Refresh the log after n8n finishes processing it."); } catch (e) { setUploadMessage(e instanceof Error ? e.message : "Upload failed."); } finally { setUploading(false); }
  }
  async function review(id: string, action: "matched" | "excluded") {
    setBusyId(id);
    try { const response = await fetch(`/api/invoices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not update row."); setInvoices(rows => rows.map(r => r.id === id ? { ...r, match_status: action === "matched" ? "matched" : "no_match", reviewed_at: new Date().toISOString() } : r)); } catch (e) { setUploadMessage(e instanceof Error ? e.message : "Could not update row."); } finally { setBusyId(null); }
  }

  return <>
    <div className="invoice-stat-grid">
      <div className="stat-card"><span>Visible invoice lines</span><strong>{filtered.length}</strong><small>{monthFilter === "all" ? "All logged periods" : monthLabel(monthFilter)}</small></div>
      <div className="stat-card"><span>Matched confidence</span><strong>{matchedRate}%</strong><small>{matchedFiltered.length} matched lines in view</small></div>
      <div className="stat-card"><span>Vendors</span><strong>{new Set(filtered.map(r => r.vendor).filter(Boolean)).size}</strong><small>Active in current filter</small></div>
      <div className="stat-card"><span>Visible spend</span><strong>{money(totalSpend)}</strong><small>From invoice line totals</small></div>
    </div>

    <div className="invoice-health-strip">
      <div><span className="health-kicker">Operations flow</span><strong>Invoice data now feeds monthly food-cost close and price intelligence.</strong></div>
      <div className="health-points"><span>✓ Unit-normalized</span><span>✓ Auditable</span><span>✓ Month-aware</span></div>
    </div>

    {reviewRows.length > 0 && <div className="invoice-alert"><strong>Review required:</strong> {reviewRows.length} invoice line{reviewRows.length === 1 ? "" : "s"} needs a match or conversion decision before monthly close.</div>}

    <section className="card invoice-card">
      <div className="invoice-toolbar">
        <div><span className="section-kicker">People / Ops</span><h3 className="font-display">Vendor Invoice Control Center</h3><p>Upload PDF invoices or receipt photos, audit matching, compare normalized prices, and hand clean purchase data directly into the monthly close.</p></div>
        <label className={`primary-button upload-button ${uploading ? "disabled" : ""}`}>{uploading ? "Uploading…" : "Upload Invoice / Receipt"}<input type="file" accept="application/pdf,image/*" hidden disabled={uploading} onChange={e => { const file = e.target.files?.[0]; if (file) upload(file); e.currentTarget.value = ""; }} /></label>
      </div>
      {uploadMessage && <div className={`invoice-message ${uploadMessage.startsWith("Invoice/receipt accepted") ? "success" : "error"}`}>{uploadMessage}</div>}
      <div className="invoice-tabs">
        <button className={tab === "log" ? "active" : ""} onClick={() => setTab("log")}>Invoice Log</button>
        <button className={tab === "price" ? "active" : ""} onClick={() => setTab("price")}>Price Intelligence <span className="tab-new">New</span></button>
        <button className={tab === "review" ? "active" : ""} onClick={() => setTab("review")}>Review Queue {reviewRows.length > 0 && <b>{reviewRows.length}</b>}</button>
        <button className={tab === "master" ? "active" : ""} onClick={() => setTab("master")}>Item & Vendor Master</button>
        <button className={tab === "rollups" ? "active" : ""} onClick={() => setTab("rollups")}>Rollups</button>
      </div>

      {tab === "log" && <>
        <div className="invoice-filter-panel">
          <div className="filter-search"><label>Search</label><input className="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Vendor, item, invoice #, note…" /></div>
          <div><label>Month</label><select className="invoice-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}><option value="all">All months</option>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></div>
          <div><label>Status</label><select className="invoice-select" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="matched">Matched</option><option value="needs_review">Needs review</option><option value="no_match">No match</option></select></div>
          {(query || monthFilter !== "all" || status !== "all") && <button className="clear-filter" onClick={() => { setQuery(""); setMonthFilter("all"); setStatus("all"); }}>Clear</button>}
        </div>
        <div className="filter-result-line"><span><strong>{filtered.length}</strong> invoice lines</span><span>Showing <strong>{monthFilter === "all" ? "all periods" : monthLabel(monthFilter)}</strong></span></div>
        <div className="table-shell"><table className="invoice-table"><thead><tr><th>Date</th><th>Vendor</th><th>Item</th><th>Basis</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Invoice #</th><th>Status</th></tr></thead><tbody>
          {filtered.map(r => <tr key={r.id}><td className="nowrap">{r.invoice_date ? new Date(r.invoice_date).toLocaleDateString() : "—"}</td><td><strong>{r.vendor || "—"}</strong></td><td><strong>{r.item || "Unmatched"}</strong><small>{r.category || ""}</small></td><td>{r.count_by || "—"}</td><td>{qty(r.quantity)}</td><td className="price-cell">{money(r.unit_cost)}</td><td>{money(r.total_cost)}</td><td>{r.invoice_number || "—"}</td><td><span className={`invoice-status ${r.match_status || "needs_review"}`}>{r.match_status === "matched" ? "Matched" : r.match_status === "no_match" ? "No match" : "Needs review"}</span></td></tr>)}
          {!filtered.length && <tr><td colSpan={9} className="empty-cell">No invoice lines match these filters.</td></tr>}
        </tbody></table></div>
      </>}

      {tab === "price" && <div className="price-intelligence">
        <div className="price-controls"><div><label>Item</label><select className="invoice-select wide" value={selectedPriceItem} onChange={e => { setPriceItem(e.target.value); setPriceVendor("all"); }}>{itemOptions.map(i => <option key={i} value={i}>{i}</option>)}</select></div><div><label>Vendor</label><select className="invoice-select wide" value={priceVendor} onChange={e => setPriceVendor(e.target.value)}><option value="all">All vendors</option>{priceVendors.map(v => <option key={v} value={v}>{v}</option>)}</select></div><div className="price-context"><span>Canonical unit</span><strong>{items.find(i => i.item === selectedPriceItem)?.count_by_unit || "Normalized from invoice log"}</strong></div></div>
        <div className="price-hero"><div><span className="section-kicker">Price movement</span><h4>{selectedPriceItem || "Select an item"}</h4><p>Monthly average unit cost from matched invoices. Normalized unit costs make the trend comparable across vendors.</p></div><div className="price-insight-grid">{priceInsights.length ? priceInsights.slice(0, 3).map(i => <div className={`price-insight ${i.direction}`} key={i.vendor}><span>{i.vendor}</span><strong>{i.direction === "up" ? "↑" : i.direction === "down" ? "↓" : "→"} {Math.abs(i.pct).toFixed(1)}%</strong><small>{money(i.first)} → {money(i.last)}</small></div>) : <div className="price-insight neutral"><span>Trend status</span><strong>Building</strong><small>More matched months needed</small></div>}</div></div>
        <div className="price-chart-card"><div className="master-title"><div><h4>Monthly unit-cost trend</h4><span>Average price · matched invoice lines only</span></div><span>{priceSeries.reduce((n, s) => n + s.points.reduce((a, p) => a + p.lines, 0), 0)} observations</span></div><PriceChart series={priceSeries} /></div>
        <div className="price-table-card"><div className="master-title"><div><h4>Month-by-month price detail</h4><span>Min / average / max helps separate a real shift from invoice noise</span></div></div><div className="table-shell"><table className="master-table price-history-table"><thead><tr><th>Month</th><th>Vendor</th><th>Avg Unit Cost</th><th>Range</th><th>Lines</th><th>Change</th></tr></thead><tbody>{priceSeries.flatMap(s => s.points.map((p, idx) => { const prev = idx ? s.points[idx - 1].avg : null; const pct = prev ? (p.avg - prev) / prev * 100 : null; return <tr key={`${s.vendor}-${p.month}`}><td>{monthLabel(p.month)}</td><td><strong>{s.vendor}</strong></td><td className="price-cell">{money(p.avg)}</td><td>{money(p.min)} – {money(p.max)}</td><td>{p.lines}</td><td className={pct == null ? "" : pct > 0.5 ? "trend-up" : pct < -0.5 ? "trend-down" : "trend-flat"}>{pct == null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}</td></tr>; }))}</tbody></table></div></div>
      </div>}

      {tab === "review" && <div className="review-list">{!reviewRows.length ? <div className="empty-review"><div>✓</div><h4>Review queue is clear</h4><p>Every logged invoice line has a confident item and conversion match.</p></div> : reviewRows.map(r => <article className="review-row" key={r.id}><div className="review-main"><div className="review-top"><span className="invoice-status needs_review">{r.match_status === "no_match" ? "No match" : "Needs review"}</span><strong>{r.vendor || "Unknown vendor"} · {r.invoice_number || "No invoice #"}</strong></div><h4>{r.item || "Unmatched item"}</h4><p>{r.notes || "No matching explanation was generated."}</p></div><div className="review-actions"><button className="secondary-button" disabled={busyId === r.id} onClick={() => review(r.id, "matched")}>Confirm match</button><button className="secondary-button danger-outline" disabled={busyId === r.id} onClick={() => review(r.id, "excluded")}>Exclude from food cost</button></div></article>)}</div>}

      {tab === "rollups" && <div className="rollup-grid"><div className="rollup-card"><div className="master-title"><h4>Cost History by Month</h4><span>Spend + match rate</span></div><table className="master-table"><thead><tr><th>Month</th><th>Spend</th><th>Lines</th><th>Matched</th></tr></thead><tbody>{monthRollup.map(([month, v]) => <tr key={month}><td>{month === "Unknown" ? month : monthLabel(month)}</td><td>{money(v.spend)}</td><td>{v.lines}</td><td>{v.lines ? `${Math.round(v.matched / v.lines * 100)}%` : "—"}</td></tr>)}</tbody></table></div><div className="rollup-card"><div className="master-title"><h4>Vendor Summary</h4><span>Spend / lines / last purchase</span></div><table className="master-table"><thead><tr><th>Vendor</th><th>Spend</th><th>Lines</th><th>Last</th></tr></thead><tbody>{vendorRollup.map(([vendor, v]) => <tr key={vendor}><td><strong>{vendor}</strong></td><td>{money(v.spend)}</td><td>{v.lines}</td><td>{v.last ? new Date(v.last).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div><div className="rollup-card rollup-wide"><div className="master-title"><h4>Monthly Purchased Feed</h4><span>Top 30 item totals</span></div><table className="master-table"><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Spend</th></tr></thead><tbody>{itemRollup.map(([item, v]) => <tr key={item}><td><strong>{item}</strong></td><td>{v.category}</td><td>{qty(v.qty)}</td><td>{money(v.spend)}</td></tr>)}</tbody></table></div></div>}

      {tab === "master" && <div className="master-grid"><div><div className="master-title"><h4>Item Master</h4><span>{items.length} items</span></div><div className="master-table-wrap"><table className="master-table"><thead><tr><th>Item</th><th>Category</th><th>Canonical unit</th><th>Aliases</th></tr></thead><tbody>{items.map(i => <tr key={i.id}><td><strong>{i.item}</strong></td><td>{i.category}</td><td>{i.count_by_unit}</td><td>{i.invoice_name_aliases?.length ? i.invoice_name_aliases.join(", ") : "—"}</td></tr>)}</tbody></table></div><AddItemForm onCreated={item => setItems(rows => [...rows, item].sort((a, b) => a.item.localeCompare(b.item)))} /></div><div><div className="master-title"><h4>Vendor Master</h4><span>{vendors.length} vendors</span></div><div className="vendor-list">{vendors.map(v => <div className="vendor-row" key={v.id}><strong>{v.vendor_name}</strong><span>{v.notes || "Active vendor"}</span></div>)}</div><AddVendorForm onCreated={vendor => setVendors(rows => [...rows, vendor].sort((a, b) => a.vendor_name.localeCompare(b.vendor_name)))} /><div className="info-note">New vendors, aliases, and conversion rules are maintained here so n8n can process the next invoice without a code change.</div></div></div>}
    </section>
  </>;
}
