import { getLeads, getCalendarEntries, getInvoiceLog, getReviewReplies } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  let leads: Awaited<ReturnType<typeof getLeads>> = [];
  let calendar: Awaited<ReturnType<typeof getCalendarEntries>> = [];
  let invoices: Awaited<ReturnType<typeof getInvoiceLog>> = [];
  let reviews: Awaited<ReturnType<typeof getReviewReplies>> = [];
  try { leads = await getLeads(); } catch {}
  try { calendar = await getCalendarEntries(); } catch {}
  try { invoices = await getInvoiceLog(); } catch {}
  try { reviews = await getReviewReplies(); } catch {}
  const reviewQueue = invoices.filter((r) => r.match_status === "no_match" || r.match_status === "needs_review").length;

  const welcomeSent = leads.filter(l => l.welcome_sent).length;
  const remindersSent = leads.filter(l => l.remainder_sent === true).length;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  const pendingReminders = leads.filter((lead) => {
    const arrival = typeof lead.date_arrival === "string" ? lead.date_arrival.slice(0, 10) : "";
    return /^\d{4}-\d{2}-\d{2}$/.test(arrival) && arrival <= tomorrowKey && lead.remainder_sent !== true;
  }).length;

  const cards = [
    ["Total Leads", leads.length],
    ["Welcome Sent", welcomeSent],
    ["Reminders Sent", remindersSent],
    ["Reminder Queue", pendingReminders],
  ];

  return <div>
    <div className="mb-7"><p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--seafoam)", letterSpacing: "0.1em" }}>Operations Dashboard</p><h2 className="font-display text-3xl" style={{ color: "var(--navy)" }}>Overview</h2><p className="text-sm mt-1" style={{ color: "var(--navy-light)" }}>Live operational view powered by Supabase.</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">{cards.map(([label,value]) => <div key={String(label)} className="rounded-lg p-5" style={{ background: "white", border: "1px solid #d9d0bd" }}><div className="text-xs uppercase tracking-wide" style={{ color: "var(--seafoam)" }}>{label}</div><div className="font-display text-3xl mt-2" style={{ color: "var(--navy)" }}>{value}</div></div>)}</div>
    <div className="grid lg:grid-cols-2 gap-4 mb-4">
      <Link href="/dashboard/leads" className="rounded-lg p-6" style={{ background: "white", border: "1px solid #d9d0bd" }}><div className="text-xs uppercase" style={{ color: "var(--mustard-dark)" }}>Chamber</div><h3 className="font-display text-xl mt-1" style={{ color: "var(--navy)" }}>Leads</h3><p className="text-sm mt-2" style={{ color: "var(--navy-light)" }}>View visitor referrals, arrival dates, welcome status, and reminder status.</p></Link>
      <Link href="/dashboard/calendar" className="rounded-lg p-6" style={{ background: "white", border: "1px solid #d9d0bd" }}><div className="text-xs uppercase" style={{ color: "var(--mustard-dark)" }}>Content</div><h3 className="font-display text-xl mt-1" style={{ color: "var(--navy)" }}>Content Calendar</h3><p className="text-sm mt-2" style={{ color: "var(--navy-light)" }}>{calendar.length} calendar entries currently in Supabase.</p></Link>
    </div>
    <Link href="/dashboard/labor" className="card" style={{ display: "block", padding: "20px 22px", textDecoration: "none", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div><div className="text-xs uppercase" style={{ color: "var(--orange)", fontWeight: 800 }}>People / Ops</div><h3 className="font-display text-xl mt-1" style={{ color: "var(--navy)" }}>Labor Cost & Growth Planning</h3><p className="text-sm mt-2" style={{ color: "var(--navy-light)" }}>Upload Homebase payroll, track controllable labor cost against 13%, and review growth-hour budgets.</p></div>
        <span className="invoice-status matched">Open</span>
      </div>
    </Link>
    <Link href="/dashboard/reviews" className="card" style={{ display: "block", padding: "20px 22px", textDecoration: "none", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div><div className="text-xs uppercase" style={{ color: "var(--blue)", fontWeight: 800 }}>Customer Experience</div><h3 className="font-display text-xl mt-1" style={{ color: "var(--navy)" }}>Google & BentoBox Review Replies</h3><p className="text-sm mt-2" style={{ color: "var(--navy-light)" }}>Google reviews plus BentoBox feedback emails flow into one approval queue. Review queue: {reviews.filter(r => r.status === "pending" || r.status === "manual_paste_ready" || r.status === "approved").length}. Posted: {reviews.filter(r => r.status === "posted").length}.</p></div>
        <span className={`invoice-status ${reviews.filter(r => r.status === "pending" || r.status === "manual_paste_ready").length ? "needs_review" : "matched"}`}>{reviews.filter(r => r.status === "pending" || r.status === "manual_paste_ready").length ? "Needs attention" : "Queue clear"}</span>
      </div>
    </Link>
    <Link href="/dashboard/invoices" className="card" style={{ display: "block", padding: "20px 22px", textDecoration: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div><div className="text-xs uppercase" style={{ color: "var(--orange)", fontWeight: 800 }}>People / Ops</div><h3 className="font-display text-xl mt-1" style={{ color: "var(--navy)" }}>Vendor Invoice Filing & Log</h3><p className="text-sm mt-2" style={{ color: "var(--navy-light)" }}>Invoice lines logged: {invoices.length}. Review queue: {reviewQueue}.</p></div>
        <span className={`invoice-status ${reviewQueue ? "needs_review" : "matched"}`}>{reviewQueue ? `${reviewQueue} to review` : "Queue clear"}</span>
      </div>
    </Link>
  </div>;
}
