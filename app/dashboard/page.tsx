import Link from "next/link";
import { getLeads, getInvoiceLog, getReviewReplies, supabaseFetch } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type PayrollRow = {
  month?: string;
  revenue?: number | string;
  controllable_labor_cost?: number | string;
  labor_cost_pct?: number | string;
};

const money = (value: unknown) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value))
    : "—";

const pct = (value: unknown) =>
  Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : "—";

export default async function DashboardHome() {
  const [leadsResult, invoicesResult, reviewsResult, payrollResult] = await Promise.allSettled([
    getLeads(), getInvoiceLog(), getReviewReplies(),
    supabaseFetch<PayrollRow[]>("payroll_monthly?select=month,revenue,controllable_labor_cost,labor_cost_pct&order=month.desc&limit=12")
  ]);

  const leads = leadsResult.status === "fulfilled" ? leadsResult.value : [];
  const invoices = invoicesResult.status === "fulfilled" ? invoicesResult.value : [];
  const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value : [];
  const payroll = payrollResult.status === "fulfilled" ? payrollResult.value : [];
  const latestPayroll = payroll[0];
  const reviewQueue = invoices.filter(x => x.match_status === "needs_review" || x.match_status === "no_match").length;
  const pendingReplies = reviews.filter(x => ["draft", "pending", "needs_approval", "awaiting_approval"].includes(String(x.status || "").toLowerCase())).length;
  const dataErrors = [leadsResult, invoicesResult, reviewsResult, payrollResult].filter(x => x.status === "rejected").length;

  const cards = [
    { href: "/dashboard/leads", n: "01", title: "Chamber Leads", metric: String(leads.length), label: "Visitor referrals", detail: `${leads.filter(x => !x.welcome_sent).length} welcome emails pending`, icon: "✉" },
    { href: "/dashboard/invoices", n: "02", title: "Vendor Invoices", metric: String(invoices.length), label: "Invoice lines logged", detail: `${reviewQueue} lines need review`, icon: "$" },
    { href: "/dashboard/inventory", n: "03", title: "Inventory & Food Cost", metric: "Open", label: "Inventory workspace", detail: "View counts and monthly close", icon: "◫" },
    { href: "/dashboard/labor", n: "04", title: "Labor Cost & Growth", metric: latestPayroll ? pct(latestPayroll.labor_cost_pct) : "—", label: "Latest labor cost", detail: latestPayroll?.month ? `Period ${latestPayroll.month}` : "No payroll close found", icon: "◒" },
    { href: "/dashboard/reviews", n: "05", title: "Review Replies", metric: String(reviews.length), label: "Review records", detail: `${pendingReplies} awaiting action`, icon: "★" },
    { href: "/dashboard/compliance", n: "06", title: "Royalty & Delivery", metric: "Open", label: "Compliance workspace", detail: "Weekly royalty + monthly credits", icon: "▣" },
  ];

  return <div className="overview-page">
    <div className="overview-header">
      <div><p className="overview-eyebrow">TOPSAIL STEAMER · ANNA MARIA ISLAND</p><h1>Business Dashboard</h1><p className="overview-sub">Operations overview</p></div>
      <div className="overview-date"><span className="live-dot"/>{new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
    </div>

    {dataErrors > 0 && <div className="overview-notice">Some live data could not be loaded. Open the related section to check its connection.</div>}

    <section className="overview-kpis">
      <div className="overview-kpi"><span>NET SALES</span><strong>{latestPayroll ? money(latestPayroll.revenue) : "—"}</strong><small>{latestPayroll?.month ? `Latest payroll close · ${latestPayroll.month}` : "No monthly close available"}</small></div>
      <div className="overview-kpi"><span>LABOR COST</span><strong>{latestPayroll ? pct(latestPayroll.labor_cost_pct) : "—"}</strong><small>{latestPayroll ? money(latestPayroll.controllable_labor_cost) + " controllable cost" : "No monthly close available"}</small></div>
      <div className="overview-kpi"><span>INVOICE REVIEW</span><strong>{reviewQueue}</strong><small>Lines requiring review</small></div>
      <div className="overview-kpi"><span>LEADS</span><strong>{leads.length}</strong><small>Records in lead tracker</small></div>
    </section>

    <div className="overview-section-title"><h2>Operations</h2><span>Choose a workspace</span></div>
    <section className="overview-cards">
      {cards.map(card => <Link href={card.href} className="overview-card" key={card.href}>
        <div className="overview-card-top"><span className="overview-card-icon">{card.icon}</span><span className="overview-card-number">{card.n}</span></div>
        <h3>{card.title}</h3><strong className="overview-card-metric">{card.metric}</strong><span className="overview-card-label">{card.label}</span>
        <div className="overview-card-bottom"><span>{card.detail}</span><b>Open <span aria-hidden>→</span></b></div>
      </Link>)}
    </section>
  </div>;
}
