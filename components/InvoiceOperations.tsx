"use client";

import { useEffect, useMemo, useState } from "react";

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
  match_status: "matched" | "no_match" | "needs_review" | "excluded" | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source_type: string | null;
  source_file_name?: string | null;
  source_storage_path?: string | null;
  source_url?: string | null;
  source_message_id?: string | null;
};

type Item = { id: string; category: string; item: string; count_by_unit: string; invoice_name_aliases: string[] | null };
type Vendor = { id: string; vendor_name: string; notes: string | null };
type SourceUpload = { id: string; source_file_name: string; status: string; invoice_number: string | null; uploaded_at: string; error_message: string | null };

type PricePoint = { month: string; avg: number; min: number; max: number; lines: number };

const money = (n: number | null) => n == null || !Number.isFinite(n) ? "—" : `$${n.toFixed(2)}`;
const qty = (n: number | null) => n == null || !Number.isFinite(n) ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 3 });
const monthLabel = (month: string) => {
  const d = new Date(`${month}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};
const monthKey = (date: string | null) => date ? date.slice(0, 7) : "";
const sourceHref = (r: Invoice) => r.source_url || (r.source_storage_path ? `/api/invoices/${encodeURIComponent(r.id)}/source` : null) || (r.source_message_id ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(r.source_message_id)}` : null);

function AddItemForm({ onCreated }: { onCreated: (item: Item) => void }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [category, setCategory] = useState("5000 Food Cost"); const [unit, setUnit] = useState("Each"); const [aliases, setAliases] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function save() { setSaving(true); setError(""); try { const r = await fetch("/api/invoices/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item: name, category, count_by_unit: unit, invoice_name_aliases: aliases.split(",").map(s => s.trim()).filter(Boolean) }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); onCreated(d.item); setName(""); setAliases(""); setOpen(false); } catch (e) { setError(e instanceof Error ? e.message : "Could not save item."); } finally { setSaving(false); } }
  return <div className="master-form"><button className="secondary-button" onClick={() => setOpen(!open)}>{open ? "Cancel" : "+ Add item"}</button>{open && <div className="master-form-grid"><input className="editor-input" placeholder="Item name" value={name} onChange={e => setName(e.target.value)} /><input className="editor-input" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} /><input className="editor-input" placeholder="Canonical unit" value={unit} onChange={e => setUnit(e.target.value)} /><input className="editor-input" placeholder="Aliases, comma separated" value={aliases} onChange={e => setAliases(e.target.value)} /><button className="primary-button" disabled={saving || !name.trim()} onClick={save}>{saving ? "Saving…" : "Save item"}</button>{error && <div className="save-error">{error}</div>}</div>}</div>;
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
  const [rollupMonth, setRollupMonth] = useState("all");
  const [priceItem, setPriceItem] = useState("");
  const [priceVendor, setPriceVendor] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [sourceUploads, setSourceUploads] = useState<SourceUpload[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceDraft, setInvoiceDraft] = useState<Partial<Invoice>>({});
  const [invoiceEditError, setInvoiceEditError] = useState("");
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [deletingUpload, setDeletingUpload] = useState<SourceUpload | null>(null);

  async function loadSourceUploads() {
    try { const response = await fetch("/api/invoices/uploads", { cache: "no-store" }); const data = await response.json(); if (response.ok) setSourceUploads(data.uploads || []); } catch { /* keep the invoice screen usable if upload history is temporarily unavailable */ }
  }
  useEffect(() => { void loadSourceUploads(); }, []);

  const reviewRows = useMemo(() => invoices.filter(r => r.match_status === "no_match" || r.match_status === "needs_review"), [invoices]);
  const months = useMemo(() => Array.from(new Set(invoices.map(r => monthKey(r.invoice_date)).filter(Boolean))).sort(), [invoices]);
  const itemOptions = useMemo(() => Array.from(new Set(invoices.map(r => r.item).filter((v): v is string => Boolean(v)))).sort(), [invoices]);
  const filtered = useMemo(() => invoices.filter(r => {
    const hay = [r.vendor, r.item, r.invoice_number, r.notes, r.category].join(" ").toLowerCase();
    return (!query || hay.includes(query.toLowerCase())) && (status === "all" || r.match_status === status) && (monthFilter === "all" || monthKey(r.invoice_date) === monthFilter);
  }).sort((a, b) => (a.invoice_date || "9999-12-31").localeCompare(b.invoice_date || "9999-12-31")), [invoices, query, status, monthFilter]);
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
  const rollupInvoices = useMemo(() => invoices.filter(r => rollupMonth === "all" || monthKey(r.invoice_date) === rollupMonth), [invoices, rollupMonth]);
  const monthRollup = useMemo(() => Object.entries(rollupInvoices.reduce<Record<string, { spend: number; lines: number; matched: number }>>((acc, r) => { const key = monthKey(r.invoice_date) || "Unknown"; acc[key] ||= { spend: 0, lines: 0, matched: 0 }; if (r.match_status !== "excluded") acc[key].spend += Number(r.total_cost || 0); acc[key].lines += 1; if (r.match_status === "matched") acc[key].matched += 1; return acc; }, {})).sort((a, b) => a[0].localeCompare(b[0])), [rollupInvoices]);
  const itemRollup = useMemo(() => Object.entries(rollupInvoices.reduce<Record<string, { qty: number; spend: number; category: string }>>((acc, r) => { const key = r.item || "Unmatched"; acc[key] ||= { qty: 0, spend: 0, category: r.category || "" }; if (r.match_status !== "excluded") { acc[key].qty += Number(r.quantity || 0); acc[key].spend += Number(r.total_cost || 0); } return acc; }, {})).sort((a, b) => b[1].spend - a[1].spend).slice(0, 30), [rollupInvoices]);
  const vendorRollup = useMemo(() => Object.entries(rollupInvoices.reduce<Record<string, { spend: number; lines: number; last: string | null }>>((acc, r) => { const key = r.vendor || "Unknown"; acc[key] ||= { spend: 0, lines: 0, last: null }; if (r.match_status !== "excluded") acc[key].spend += Number(r.total_cost || 0); acc[key].lines += 1; if (r.invoice_date && (!acc[key].last || r.invoice_date > acc[key].last)) acc[key].last = r.invoice_date; return acc; }, {})).sort((a, b) => b[1].spend - a[1].spend), [rollupInvoices]);

  async function upload(file: File) {
    setUploading(true); setUploadMessage(null);
    try { const form = new FormData(); form.append("file", file); const response = await fetch("/api/invoices/upload", { method: "POST", body: form }); const data = await response.json(); await loadSourceUploads(); if (!response.ok) throw new Error(data.error || "Upload failed."); setUploadMessage("Invoice/receipt saved and queued. It is now available in Review Queue."); } catch (e) { setUploadMessage(e instanceof Error ? e.message : "Upload failed."); } finally { setUploading(false); }
  }
  async function review(id: string, action: "matched" | "excluded") {
    setBusyId(id);
    try { const response = await fetch(`/api/invoices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not update row."); setInvoices(rows => rows.map(r => r.id === id ? { ...r, match_status: action === "matched" ? "matched" : "excluded", reviewed_at: new Date().toISOString() } : r)); } catch (e) { setUploadMessage(e instanceof Error ? e.message : "Could not update row."); } finally { setBusyId(null); }
  }

  function editInvoice(r: Invoice) { setEditingInvoice(r); setInvoiceDraft({ ...r }); setInvoiceEditError(""); }

  async function saveInvoiceEdit() {
    if (!editingInvoice) return; setInvoiceEditError("");
    const numeric = (v: unknown, label: string) => { const text = String(v ?? "").trim(); if (!text) return null; const n = Number(text); if (!Number.isFinite(n)) throw new Error(`${label} must be a valid number.`); return n; };
    try {
      const payload = { invoice_date: invoiceDraft.invoice_date || null, vendor: invoiceDraft.vendor || null, item: invoiceDraft.item || null, category: invoiceDraft.category || null, count_by: invoiceDraft.count_by || null, quantity: numeric(invoiceDraft.quantity, "Quantity"), unit_cost: numeric(invoiceDraft.unit_cost, "Unit cost"), total_cost: numeric(invoiceDraft.total_cost, "Total cost"), invoice_number: invoiceDraft.invoice_number || null, notes: invoiceDraft.notes || null };
      setBusyId(editingInvoice.id); const response = await fetch(`/api/invoices/${encodeURIComponent(editingInvoice.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not update invoice.");
      setInvoices(rows => rows.map(row => row.id === editingInvoice.id ? { ...row, ...payload, month: payload.invoice_date ? Number(payload.invoice_date.slice(5,7)) : row.month } : row)); setUploadMessage("Invoice line updated."); setEditingInvoice(null);
    } catch (e) { setInvoiceEditError(e instanceof Error ? e.message : "Could not update invoice."); } finally { setBusyId(null); }
  }

  async function deleteInvoice(r: Invoice) { setDeletingInvoice(r); }

  async function deleteUpload(upload: SourceUpload) {
    setDeletingUpload(upload);
  }

  async function confirmDeleteUpload() {
    if (!deletingUpload) return;
    const upload = deletingUpload;
    setBusyId(upload.id);
    try {
      const response = await fetch(`/api/invoices/uploads/${encodeURIComponent(upload.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete upload.");
      setSourceUploads(rows => rows.filter(row => row.id !== upload.id));
      setDeletingUpload(null);
      setUploadMessage("Uploaded source file deleted. Invoice log lines were kept.");
    } catch (e) {
      setUploadMessage(e instanceof Error ? e.message : "Could not delete upload.");
    } finally { setBusyId(null); }
  }

  return <>
    <div className="invoice-stat-grid">
      <div className="stat-card"><span>Visible invoice lines</span><strong>{filtered.length}</strong></div>
      <div className="stat-card"><span>Matched confidence</span><strong>{matchedRate}%</strong></div>
      <div className="stat-card"><span>Vendors</span><strong>{vendors.length}</strong></div>
      <div className="stat-card"><span>Invoice log spend · {monthFilter === "all" ? "All dates" : monthLabel(monthFilter)}</span><strong>{money(totalSpend)}</strong></div>
    </div>

    {reviewRows.length > 0 && <div className="invoice-alert"><strong>Review required:</strong> {reviewRows.length} invoice line{reviewRows.length === 1 ? "" : "s"} needs a match or conversion decision before monthly close.</div>}

    <section className="card invoice-card">
      <div className="invoice-toolbar">
        <div><h3 className="font-display">Vendor Invoice Control Center</h3></div>
        <label className={`primary-button upload-button ${uploading ? "disabled" : ""}`}>{uploading ? "Uploading…" : "Upload Invoice / Receipt"}<input type="file" accept="application/pdf,image/*" hidden disabled={uploading} onChange={e => { const file = e.target.files?.[0]; if (file) upload(file); e.currentTarget.value = ""; }} /></label>
      </div>
      {uploadMessage && <div className={`invoice-message ${(uploadMessage.startsWith("Invoice/receipt accepted") || uploadMessage.startsWith("Invoice line updated") || uploadMessage.startsWith("Uploaded source file deleted")) ? "success" : "error"}`}>{uploadMessage}</div>}
      <div className="invoice-tabs">
        <button className={tab === "log" ? "active" : ""} onClick={() => setTab("log")}>Invoice Log</button>
        <button className={tab === "price" ? "active" : ""} onClick={() => setTab("price")}>Price Intelligence</button>
        <button className={tab === "review" ? "active" : ""} onClick={() => setTab("review")}>Review Queue {reviewRows.length > 0 && <b>{reviewRows.length}</b>}</button>
        <button className={tab === "master" ? "active" : ""} onClick={() => setTab("master")}>Item & Vendor Master</button>
        <button className={tab === "rollups" ? "active" : ""} onClick={() => setTab("rollups")}>Rollups</button>
      </div>

      {tab === "log" && <>
        <div className="invoice-filter-panel">
          <div className="filter-search"><label>Search</label><input className="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Vendor, item, invoice #, note…" /></div>
          <div><label>Month</label><select className="invoice-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}><option value="all">All months</option>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></div>
          <div><label>Status</label><select className="invoice-select" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="matched">Matched</option><option value="needs_review">Needs review</option><option value="no_match">No match</option><option value="excluded">Excluded from food cost</option></select></div>
          {(query || monthFilter !== "all" || status !== "all") && <button className="clear-filter" onClick={() => { setQuery(""); setMonthFilter("all"); setStatus("all"); }}>Clear</button>}
        </div>
        
        <div className="table-shell"><table className="invoice-table"><thead><tr><th>Date</th><th>Vendor</th><th>Item</th><th>Basis</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Invoice #</th><th>Status</th><th className="invoice-actions-heading">Actions</th></tr></thead><tbody>
          {filtered.map(r => { const linkedUpload = sourceUploads.find(u => u.invoice_number && r.invoice_number && u.invoice_number === r.invoice_number); const href = (r.source_storage_path ? `/api/invoices/${encodeURIComponent(r.id)}/source` : null) || (linkedUpload ? `/api/invoices/uploads/${encodeURIComponent(linkedUpload.id)}/source` : null) || r.source_url || (r.source_message_id ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(r.source_message_id)}` : null); return <tr key={r.id}><td className="nowrap">{r.invoice_date ? new Date(r.invoice_date).toLocaleDateString() : "—"}</td><td><strong>{r.vendor || "—"}</strong></td><td><strong>{r.item || "Unmatched"}</strong><small>{r.category || ""}</small></td><td>{r.count_by || "—"}</td><td>{qty(r.quantity)}</td><td className="price-cell">{money(r.unit_cost)}</td><td>{money(r.total_cost)}</td><td>{href ? <a className="invoice-source-link" href={href} target="_blank" rel="noreferrer" title="Open original invoice source">{r.invoice_number || "Open invoice"}</a> : <>{r.invoice_number || "—"}</>}{r.source_file_name && <small className="invoice-source-name">{r.source_file_name}</small>}</td><td><span className={`invoice-status ${r.match_status || "needs_review"}`}>{r.match_status === "matched" ? "Matched" : r.match_status === "no_match" ? "No match" : r.match_status === "excluded" ? "Excluded" : "Needs review"}</span></td><td className="invoice-row-actions"><button className="secondary-button invoice-edit-button" disabled={busyId === r.id} onClick={() => void editInvoice(r)}>Edit</button><button className="secondary-button invoice-delete-button" disabled={busyId === r.id} onClick={() => void deleteInvoice(r)}>{busyId === r.id ? "…" : "Delete"}</button></td></tr>; })}
          {!filtered.length && <tr><td colSpan={10} className="empty-cell">No invoice lines match these filters.</td></tr>}
        </tbody></table></div>
      </>}

      {tab === "price" && <div className="price-intelligence">
        <div className="price-controls"><div><label>Item</label><select className="invoice-select wide" value={selectedPriceItem} onChange={e => { setPriceItem(e.target.value); setPriceVendor("all"); }}>{itemOptions.map(i => <option key={i} value={i}>{i}</option>)}</select></div><div><label>Vendor</label><select className="invoice-select wide" value={priceVendor} onChange={e => setPriceVendor(e.target.value)}><option value="all">All vendors</option>{priceVendors.map(v => <option key={v} value={v}>{v}</option>)}</select></div><div className="price-context"><span>Canonical unit</span><strong>{items.find(i => i.item === selectedPriceItem)?.count_by_unit || "Normalized from invoice log"}</strong></div></div>
        <div className="price-hero"><div><span className="section-kicker">Price movement</span><h4>{selectedPriceItem || "Select an item"}</h4><p>Monthly average unit cost from matched invoices. Normalized unit costs make the trend comparable across vendors.</p></div><div className="price-insight-grid">{priceInsights.length ? priceInsights.slice(0, 3).map(i => <div className={`price-insight ${i.direction}`} key={i.vendor}><span>{i.vendor}</span><strong>{i.direction === "up" ? "↑" : i.direction === "down" ? "↓" : "→"} {Math.abs(i.pct).toFixed(1)}%</strong><small>{money(i.first)} → {money(i.last)}</small></div>) : <div className="price-insight neutral"><span>Trend status</span><strong>Building</strong><small>More matched months needed</small></div>}</div></div>
        <div className="price-chart-card"><div className="master-title"><div><h4>Monthly unit-cost trend</h4><span>Average price · matched invoice lines only</span></div><span>{priceSeries.reduce((n, s) => n + s.points.reduce((a, p) => a + p.lines, 0), 0)} observations</span></div><PriceChart series={priceSeries} /></div>
        <div className="price-table-card"><div className="master-title"><div><h4>Month-by-month price detail</h4><span>Min / average / max helps separate a real shift from invoice noise</span></div></div><div className="table-shell"><table className="master-table price-history-table"><thead><tr><th>Month</th><th>Vendor</th><th>Avg Unit Cost</th><th>Range</th><th>Lines</th><th>Change</th></tr></thead><tbody>{priceSeries.flatMap(s => s.points.map((p, idx) => { const prev = idx ? s.points[idx - 1].avg : null; const pct = prev ? (p.avg - prev) / prev * 100 : null; return <tr key={`${s.vendor}-${p.month}`}><td>{monthLabel(p.month)}</td><td><strong>{s.vendor}</strong></td><td className="price-cell">{money(p.avg)}</td><td>{money(p.min)} – {money(p.max)}</td><td>{p.lines}</td><td className={pct == null ? "" : pct > 0.5 ? "trend-up" : pct < -0.5 ? "trend-down" : "trend-flat"}>{pct == null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}</td></tr>; }))}</tbody></table></div></div>
      </div>}

      {tab === "review" && <div className="review-list">
        <section className="uploaded-source-panel">
          <div className="master-title"><div><h4>Uploaded invoice files</h4><span>Saved source documents · newest first</span></div><button className="secondary-button" type="button" onClick={() => void loadSourceUploads()}>Refresh</button></div>
          {!sourceUploads.length ? <p className="uploaded-source-empty">No uploaded files recorded yet.</p> : sourceUploads.map(upload => <div className="uploaded-source-row" key={upload.id}>
            <div className="uploaded-source-info"><strong>{upload.invoice_number || upload.source_file_name}</strong><small>{upload.invoice_number ? upload.source_file_name : "Invoice number will appear after extraction"} · {new Date(upload.uploaded_at).toLocaleString()}</small>{upload.error_message && <small className="upload-error-text">{upload.error_message}</small>}</div>
            <span className={`invoice-status ${upload.status === "processed" ? "matched" : "needs_review"}`}>{upload.status === "processed" ? "Processed" : upload.status === "webhook_error" ? "Webhook error" : "Processing"}</span>
            <div className="upload-row-actions"><a className="secondary-button" href={`/api/invoices/uploads/${encodeURIComponent(upload.id)}/source`} target="_blank" rel="noreferrer">Open file</a><button className="secondary-button danger-outline" disabled={busyId === upload.id} onClick={() => void deleteUpload(upload)}>{busyId === upload.id ? "Deleting…" : "Delete"}</button></div>
          </div>)}
        </section>
        {!reviewRows.length ? <div className="empty-review"><div>✓</div><h4>Review queue is clear</h4><p>Every logged invoice line has a confident item and conversion match.</p></div> : reviewRows.map(r => { const href = sourceHref(r); const isPreviewOpen = previewInvoiceId === r.id; const linkedUpload = sourceUploads.find(u => u.invoice_number && r.invoice_number && u.invoice_number === r.invoice_number); const reviewHref = r.source_storage_path
            ? `/api/invoices/${encodeURIComponent(r.id)}/source`
            : linkedUpload
              ? `/api/invoices/uploads/${encodeURIComponent(linkedUpload.id)}/source`
              : r.source_message_id
                ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(r.source_message_id)}`
                : r.source_url || null;
          const canPreviewInline = Boolean(reviewHref?.startsWith("/api/invoices/")); return <article className="review-row" key={r.id}><div className="review-main"><div className="review-top"><span className="invoice-status needs_review">{r.match_status === "no_match" ? "No match" : "Needs review"}</span><strong>{r.vendor || "Unknown vendor"} · {reviewHref ? <a className="invoice-source-link" href={reviewHref} target="_blank" rel="noreferrer">{r.invoice_number || "Open invoice"}</a> : (r.invoice_number || "No invoice #")}</strong></div><small className="review-invoice-meta">Invoice date: {r.invoice_date ? new Date(r.invoice_date).toLocaleDateString() : "Unknown"} · Source: {r.source_file_name || (r.source_message_id ? "Email attachment" : "Source file not recorded")}</small><h4>{r.item || "Unmatched item"}</h4><p>{r.notes || "No matching explanation was generated."}</p>{reviewHref && <div className="invoice-review-preview"><button className="secondary-button" type="button" onClick={() => setPreviewInvoiceId(isPreviewOpen ? null : r.id)}>{isPreviewOpen ? "Hide receipt / PDF" : "Preview receipt / PDF"}</button>{isPreviewOpen && <div className="invoice-preview-frame">{canPreviewInline ? <iframe src={reviewHref} title={`Invoice source ${r.invoice_number || r.id}`} /> : <div className="invoice-preview-unavailable"><strong>Inline preview isn’t available for this source.</strong><span>Open the original email or source link in a new tab. Google links may require your Google account to be signed in.</span></div>} <a href={reviewHref} target="_blank" rel="noreferrer">{r.source_message_id && !r.source_storage_path && !linkedUpload ? "Open original email" : "Open source in new tab"}</a></div>}</div>}</div><div className="review-actions"><button className="secondary-button" disabled={busyId === r.id} onClick={() => review(r.id, "matched")}>Confirm match</button><button className="secondary-button danger-outline" disabled={busyId === r.id} onClick={() => review(r.id, "excluded")}>Exclude from food cost</button></div></article>; })}
      </div>}

      {tab === "rollups" && <div className="rollup-grid"><div className="rollup-filter"><label htmlFor="rollup-month-filter">Reporting period</label><select id="rollup-month-filter" className="invoice-select" value={rollupMonth} onChange={e => setRollupMonth(e.target.value)}><option value="all">All months (cumulative)</option>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select><small>{rollupMonth === "all" ? "Showing all available invoice months." : `Showing only ${monthLabel(rollupMonth)}; totals are not cumulative.`}</small></div><div className="rollup-card"><div className="master-title"><h4>Cost History by Month</h4><span>{rollupMonth === "all" ? "Spend + match rate · all months" : `Spend + match rate · ${monthLabel(rollupMonth)}`}</span></div><table className="master-table"><thead><tr><th>Month</th><th>Spend</th><th>Lines</th><th>Matched</th></tr></thead><tbody>{monthRollup.map(([month, v]) => <tr key={month}><td>{month === "Unknown" ? month : monthLabel(month)}</td><td>{money(v.spend)}</td><td>{v.lines}</td><td>{v.lines ? `${Math.round(v.matched / v.lines * 100)}%` : "—"}</td></tr>)}</tbody></table></div><div className="rollup-card"><div className="master-title"><h4>Vendor Summary</h4><span>{rollupMonth === "all" ? "All-time spend / lines / last purchase" : `${monthLabel(rollupMonth)} spend / lines / last purchase`}</span></div><table className="master-table"><thead><tr><th>Vendor</th><th>Spend</th><th>Lines</th><th>Last</th></tr></thead><tbody>{vendorRollup.map(([vendor, v]) => <tr key={vendor}><td><strong>{vendor}</strong></td><td>{money(v.spend)}</td><td>{v.lines}</td><td>{v.last ? new Date(v.last).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div><div className="rollup-card rollup-wide"><div className="master-title"><h4>Monthly Purchased Feed</h4><span>{rollupMonth === "all" ? "Top 30 · all months combined" : `Top 30 · ${monthLabel(rollupMonth)}`}</span></div><table className="master-table"><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Spend</th></tr></thead><tbody>{itemRollup.map(([item, v]) => <tr key={item}><td><strong>{item}</strong></td><td>{v.category}</td><td>{qty(v.qty)}</td><td>{money(v.spend)}</td></tr>)}</tbody></table></div></div>}

      {tab === "master" && <div className="master-grid"><div><div className="master-title"><h4>Item Master</h4><span>{items.length} items</span></div><div className="master-table-wrap"><table className="master-table"><thead><tr><th>Item</th><th>Category</th><th>Canonical unit</th><th>Aliases</th></tr></thead><tbody>{items.map(i => <tr key={i.id}><td><strong>{i.item}</strong></td><td>{i.category}</td><td>{i.count_by_unit}</td><td>{i.invoice_name_aliases?.length ? i.invoice_name_aliases.join(", ") : "—"}</td></tr>)}</tbody></table></div><AddItemForm onCreated={item => setItems(rows => [...rows, item].sort((a, b) => a.item.localeCompare(b.item)))} /></div><div><div className="master-title"><h4>Vendor Master</h4><span>{vendors.length} vendors</span></div><div className="vendor-list">{vendors.map(v => <div className="vendor-row" key={v.id}><strong>{v.vendor_name}</strong><span>{v.notes || "Active vendor"}</span></div>)}</div><AddVendorForm onCreated={vendor => setVendors(rows => [...rows, vendor].sort((a, b) => a.vendor_name.localeCompare(b.vendor_name)))} /></div></div>}
    </section>
    {editingInvoice && <div className="edit-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setEditingInvoice(null); }}><section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-edit-title"><div className="edit-modal-head"><div><p className="eyebrow">Vendor invoice</p><h3 id="invoice-edit-title">Edit invoice line</h3></div><button className="modal-close" onClick={() => setEditingInvoice(null)} aria-label="Close">×</button></div><div className="edit-modal-grid">{([["invoice_date","Invoice date","date"],["invoice_number","Invoice number","text"],["vendor","Vendor","text"],["item","Item","text"],["category","Category","text"],["count_by","Basis / unit","text"],["quantity","Quantity","number"],["unit_cost","Unit cost","number"],["total_cost","Total cost","number"],["notes","Notes","text"]] as const).map(([key,label,type]) => <label className="field-label" key={key}>{label}<input className="editor-input" type={type} step={type === "number" ? "any" : undefined} value={String(invoiceDraft[key] ?? "")} onChange={e => setInvoiceDraft(d => ({...d,[key]:e.target.value} as Partial<Invoice>))}/></label>)}</div>{invoiceEditError && <p className="save-error">{invoiceEditError}</p>}<div className="edit-modal-actions"><button className="secondary-button" onClick={() => setEditingInvoice(null)}>Cancel</button><button className="primary-button" disabled={busyId === editingInvoice.id} onClick={() => void saveInvoiceEdit()}>{busyId === editingInvoice.id ? "Saving…" : "Save changes"}</button></div></section></div>}
    {deletingInvoice && <div className="edit-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setDeletingInvoice(null); }}><section className="edit-modal delete-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-delete-title"><div className="edit-modal-head"><div><p className="eyebrow">Vendor invoice</p><h3 id="invoice-delete-title">Delete invoice line?</h3></div><button className="modal-close" onClick={() => setDeletingInvoice(null)} aria-label="Close">×</button></div><p>Delete <strong>{deletingInvoice.vendor || "Unknown vendor"} · {deletingInvoice.item || "Unmatched item"}</strong> · {deletingInvoice.invoice_number || "No invoice number"}? This permanently removes the selected row from the invoice log. The uploaded source file will remain.</p><div className="edit-modal-actions"><button className="secondary-button" onClick={() => setDeletingInvoice(null)}>Cancel</button><button className="primary-button delete-confirm-button" disabled={busyId===deletingInvoice.id} onClick={async () => { const r = deletingInvoice; setBusyId(r.id); try { const response = await fetch(`/api/invoices/${encodeURIComponent(r.id)}`, {method:"DELETE"}); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Could not delete invoice line."); setInvoices(rows => rows.filter(row => row.id !== r.id)); setDeletingInvoice(null); setUploadMessage("Invoice line deleted. The uploaded source file was kept."); } catch(e) { setUploadMessage(e instanceof Error ? e.message : "Could not delete invoice line."); } finally { setBusyId(null); } }}>{busyId===deletingInvoice.id ? "Deleting…" : "Delete permanently"}</button></div></section></div>}
    {deletingUpload && <div className="edit-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setDeletingUpload(null); }}><section className="edit-modal delete-modal" role="dialog" aria-modal="true" aria-labelledby="upload-delete-title"><div className="edit-modal-head"><div><p className="eyebrow">Uploaded source file</p><h3 id="upload-delete-title">Delete uploaded file?</h3></div><button className="modal-close" onClick={() => setDeletingUpload(null)} aria-label="Close">×</button></div><p>Delete <strong>{deletingUpload.source_file_name}</strong>? This removes the saved source document only; the invoice log lines will remain.</p><div className="edit-modal-actions"><button className="secondary-button" onClick={() => setDeletingUpload(null)}>Cancel</button><button className="primary-button delete-confirm-button" disabled={busyId === deletingUpload.id} onClick={() => void confirmDeleteUpload()}>{busyId === deletingUpload.id ? "Deleting…" : "Delete permanently"}</button></div></section></div>}
  </>;
}
