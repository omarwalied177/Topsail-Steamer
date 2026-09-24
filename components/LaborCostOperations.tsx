"use client";

import { useMemo, useState } from "react";
import type { EmployeeLaborDetail, LaborGrowthPlan, PayrollMonthly } from "@/lib/automation4";

const money = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? "—" : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`;
const monthLabel = (m: string) => new Date(`${m.slice(0, 7)}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" });
const statusClass = (row?: PayrollMonthly) => {
  if (!row || row.revenue == null || row.revenue <= 0) return "labor-status neutral";
  if ((row.labor_cost_pct ?? 0) > (row.franchise_band_high ?? .18)) return "labor-status critical";
  if ((row.labor_cost_pct ?? 0) > (row.internal_target_pct ?? .13)) return "labor-status warning";
  return "labor-status good";
};
const statusText = (row?: PayrollMonthly) => {
  if (!row || !row.revenue) return "Awaiting revenue";
  if ((row.labor_cost_pct ?? 0) > (row.franchise_band_high ?? .18)) return "Above 18% band";
  if ((row.labor_cost_pct ?? 0) > (row.internal_target_pct ?? .13)) return "Over 13% target";
  return "Under 13% target";
};

const TRACKER_START_MONTH = "2025-12";

const getTrackerMonths = () => {
  const start = new Date(`${TRACKER_START_MONTH}-01T00:00:00`);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const result: string[] = [];

  for (const d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return result;
};

export function LaborCostOperations({ monthly, employees, plans }: { monthly: PayrollMonthly[]; employees: EmployeeLaborDetail[]; plans: LaborGrowthPlan[] }) {
  // Keep the month pickers usable even before a payroll row exists for a month.
  // The workbook tracks Dec 2025 onward; database months are merged in so
  // historical/backfilled rows remain selectable as well.
  const months = useMemo(() => {
    const available = new Set([
      ...getTrackerMonths(),
      ...monthly.map(r => r.month.slice(0, 7)),
    ]);

    return Array.from(available).sort().reverse();
  }, [monthly]);

  const [month, setMonth] = useState(months[0] || new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState<"tracker" | "employees" | "plan">("tracker");
  const [growth, setGrowth] = useState(String(plans[0]?.growth_assumption_pct ?? 50));
  const [file, setFile] = useState<File | null>(null);
  const [uploadMonth, setUploadMonth] = useState(month);
  const [payrollFees, setPayrollFees] = useState("0");
  const [managerAllocation, setManagerAllocation] = useState("458.33");
  const [targetPct, setTargetPct] = useState("13");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const row = monthly.find(r => r.month.startsWith(month));
  const employeeRows = employees.filter(r => r.month.startsWith(month));
  const latestPlan = plans[0];

  async function upload() {
    if (!file) return setMessage("Choose a Homebase payroll journal CSV first.");
    setBusy(true); setMessage("");
    const body = new FormData(); body.append("file", file); body.append("month", uploadMonth); body.append("payroll_fees", payrollFees); body.append("manager_allocation", managerAllocation); body.append("internal_target_pct", targetPct);
    const response = await fetch("/api/labor/upload", { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    setBusy(false); setMessage(response.ok ? "Payroll CSV accepted. Refresh after Automation 4 finishes." : data.error || "Upload failed.");
  }

  const latestPct = row?.labor_cost_pct ?? null;
  const target = row?.internal_target_pct ?? Number(targetPct) / 100;
  const variance = row?.variance_to_target ?? null;
  const planRevenue = latestPlan?.projected_monthly_revenue ?? {};
  const planBudget = latestPlan?.labor_budget_dollars ?? {};
  const planHours = latestPlan?.team_hours_budget ?? {};
  const planEmployees = latestPlan?.per_employee_hours_budget ?? {};
  const planMonths = Object.keys(planRevenue).sort();

  return <div className="labor-operations">
    <div className="labor-health-strip">
      <div><span className="section-kicker">Automation 4 · People / Ops</span><h3>Labor control center</h3><p>Homebase payroll + Clover net sales, aligned to the Labor Cost Tracker.</p></div>
      <div className="labor-definition"><span>Target</span><strong>{pct(target)}</strong><small>Franchise band 10–18%</small></div>
      <div className="labor-definition"><span>Selected month</span><strong>{row ? monthLabel(row.month) : "—"}</strong><small>{row?.source_file_ref || "No payroll upload yet"}</small></div>
    </div>

    <div className="labor-kpis">
      <div className="stat-card"><span>Labor Cost %</span><strong>{pct(latestPct)}</strong><small>{statusText(row)}</small></div>
      <div className="stat-card"><span>Controllable Cost</span><strong>{money(row?.controllable_labor_cost)}</strong><small>Wages + OT + taxes + fees + manager</small></div>
      <div className="stat-card"><span>Net Sales</span><strong>{money(row?.revenue)}</strong><small>Clover · tips excluded</small></div>
      <div className="stat-card"><span>Variance to Target</span><strong>{money(variance)}</strong><small>{variance != null && variance >= 0 ? "Budget remaining" : "Over target"}</small></div>
      <div className="stat-card"><span>Employee Hours</span><strong>{employeeRows.reduce((s, e) => s + Number(e.hours || 0), 0).toFixed(1)}</strong><small>Accrual-allocated hours</small></div>
    </div>

    <section className="card labor-upload-card">
      <div className="panel-head"><div><span className="section-kicker">Monthly input</span><h3 className="font-display">Upload Homebase payroll journal</h3><p>The workbook uses Homebase as the primary labor source. Upload the monthly CSV; Clover supplies Net Sales. Payroll processing fees are not in the Homebase journal, so they stay editable.</p></div><span className="close-badge">CSV ONLY</span></div>
      <div className="labor-upload-grid">
        <label className="field-label">Payroll month<select className="invoice-select" value={uploadMonth} onChange={e => setUploadMonth(e.target.value)}>{months.length ? months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>) : <option value={uploadMonth}>{monthLabel(uploadMonth)}</option>}</select></label>
        <label className="field-label">Homebase payroll journal<input className="editor-input" type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        <label className="field-label">Payroll fees ($)<input className="editor-input" type="number" min="0" step="0.01" value={payrollFees} onChange={e => setPayrollFees(e.target.value)} /><small className="field-help">Default $0 — enter Homebase billing fees when known.</small></label>
        <label className="field-label">Manager allocation ($/mo)<input className="editor-input" type="number" min="0" step="0.01" value={managerAllocation} onChange={e => setManagerAllocation(e.target.value)} /><small className="field-help">Tracker default: $458.33.</small></label>
        <label className="field-label">Internal target (%)<input className="editor-input" type="number" min="0" max="100" step="0.1" value={targetPct} onChange={e => setTargetPct(e.target.value)} /><small className="field-help">Tracker target: 13%.</small></label>
        <button className="primary-button labor-upload-button" disabled={busy || !file} onClick={upload}>{busy ? "Uploading…" : "Upload payroll CSV"}</button>
      </div>
      {file && <div className="selected-file"><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(0)} KB · ready for Automation 4</span></div>}
      {message && <p className={message.includes("accepted") ? "save-message" : "save-message save-error"}>{message}</p>}
    </section>

    <div className="inventory-switcher labor-switcher"><div className="invoice-tabs"><button className={tab === "tracker" ? "active" : ""} onClick={() => setTab("tracker")}>Monthly Tracker</button><button className={tab === "employees" ? "active" : ""} onClick={() => setTab("employees")}>Employee Detail</button><button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}>Growth & Hours Plan</button></div><div className="month-picker"><label>Month</label><select className="invoice-select" value={month} onChange={e => setMonth(e.target.value)}>{months.length ? months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>) : <option value={month}>{monthLabel(month)}</option>}</select></div></div>

    {tab === "tracker" && <section className="card labor-panel"><div className="panel-head"><div><span className="section-kicker">Monthly close</span><h3 className="font-display">Homebase → Clover labor view</h3><p>Matches the workbook's formula: Wages + OT + Employer Taxes + Payroll Fees + Manager Allocation. Tips stay excluded.</p></div></div><div className="table-shell"><table className="invoice-table labor-table"><thead><tr><th>Month</th><th>Net sales</th><th>Wages + OT</th><th>Employer taxes</th><th>Fees</th><th>Manager</th><th>Controllable</th><th>Labor %</th><th>Target variance</th><th>Status</th></tr></thead><tbody>{monthly.length ? monthly.map(r => <tr key={r.id}><td><strong>{monthLabel(r.month)}</strong></td><td>{money(r.revenue)}</td><td>{money(r.wages_ot)}</td><td>{money(r.employer_taxes)}</td><td>{money(r.payroll_fees)}</td><td>{money(r.manager_allocation)}</td><td>{money(r.controllable_labor_cost)}</td><td><strong>{pct(r.labor_cost_pct)}</strong></td><td>{money(r.variance_to_target)}</td><td><span className={statusClass(r)}>{statusText(r)}</span></td></tr>) : <tr><td colSpan={10} className="empty-cell">No payroll close rows yet. Upload a Homebase CSV to start the labor close.</td></tr>}</tbody></table></div></section>}

    {tab === "employees" && <section className="card labor-panel"><div className="panel-head"><div><span className="section-kicker">Employee Detail</span><h3 className="font-display">Hours & controllable labor cost</h3><p>Employee cost excludes tips and manager allocation, matching the tracker definition for employee detail.</p></div></div><div className="employee-grid">{employeeRows.length ? employeeRows.map(r => <div className="employee-card" key={r.id}><div className="employee-card-top"><div><strong>{r.employee_name}</strong><span>{r.role || "Team member"}</span></div><span className="employee-rate">{r.hours && r.controllable_cost != null ? money(r.controllable_cost / r.hours) : "—"}<small>loaded / hr</small></span></div><div className="employee-metrics"><div><span>Hours</span><strong>{r.hours == null ? "—" : r.hours.toFixed(1)}</strong></div><div><span>Controllable cost</span><strong>{money(r.controllable_cost)}</strong></div></div></div>) : <div className="empty-cell">No employee detail for this month yet.</div>}</div></section>}

    {tab === "plan" && <section className="card labor-panel"><div className="panel-head"><div><span className="section-kicker">2027 planning model</span><h3 className="font-display">Growth & hours budget</h3><p>Replicates the workbook: editable YoY growth, 13% labor target, blended fully-loaded rate, and the current employee hours mix.</p></div></div><div className="plan-controls"><label className="field-label">YoY growth assumption (%)<input className="editor-input" type="number" min="0" step="1" value={growth} onChange={e => setGrowth(e.target.value)} /></label><div className="plan-summary"><div><span>Blended loaded rate</span><strong>{money(latestPlan?.blended_loaded_rate ?? 21.58)}/hr</strong></div><div><span>Hours mix</span><strong>18.7% · 37.0% · 44.3%</strong><small>Ariadna · Carlos · Nicholas</small></div><div><span>Target</span><strong>{latestPlan?.growth_assumption_pct ?? growth}% growth / {latestPlan?.growth_assumption_pct ? "13% labor" : "13% target"}</strong></div></div></div><div className="table-shell"><table className="invoice-table labor-table plan-table"><thead><tr><th>Month</th><th>2027 Revenue</th><th>Labor Budget</th><th>Team Hours</th><th>Ariadna</th><th>Carlos</th><th>Nicholas</th></tr></thead><tbody>{planMonths.length ? planMonths.map(m => { const e=planEmployees[m] || {}; return <tr key={m}><td><strong>{monthLabel(m)}</strong></td><td>{money(planRevenue[m])}</td><td>{money(planBudget[m])}</td><td>{Number(planHours[m] || 0).toFixed(1)}</td><td>{Number(e['Ariadna Palacios'] || 0).toFixed(1)}</td><td>{Number(e['Carlos Martinez'] || 0).toFixed(1)}</td><td>{Number(e['Nicholas Viviani'] || 0).toFixed(1)}</td></tr>; }) : <tr><td colSpan={7} className="empty-cell">No saved growth plan yet. The monthly schedule will populate after the Automation 4 growth-plan run.</td></tr>}</tbody></table></div></section>}
  </div>;
}
