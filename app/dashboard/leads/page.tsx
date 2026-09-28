import { getLeads } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { LeadsTable } from "@/components/LeadsTable";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  let leads: Awaited<ReturnType<typeof getLeads>> = [];
  let error: string | null = null;
  try { leads = await getLeads(); } catch (e) { error = e instanceof Error ? e.message : "Could not load leads."; }

  const welcomeSent = leads.filter((l) => l.welcome_sent === true).length;
  // Supabase column is intentionally named `remainder_sent` (not reminder_sent).
  const reminderSent = leads.filter((l) => l.remainder_sent === true).length;
  // Queue = unsent leads arriving today, tomorrow, or already overdue.
  // Leads without a valid arrival date and future arrivals are not actionable yet.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  const pending = leads.filter((lead) => {
    const arrival = typeof lead.date_arrival === "string" ? lead.date_arrival.slice(0, 10) : "";
    return /^\d{4}-\d{2}-\d{2}$/.test(arrival) && arrival <= tomorrowKey && lead.remainder_sent !== true;
  }).length;

  return (
    <div>
      <div className="page-heading">
        <div><p className="eyebrow">Operations Dashboard</p><h2 className="font-display text-3xl" style={{ color: "var(--navy)" }}>Leads</h2><p className="page-subtitle">View and manage incoming visitor referrals from the chamber form.</p></div>
      </div>
      {error ? <SetupNeeded message={error} /> : <>
        <div className="stats-grid">
          <div className="stat-card"><span>Total Leads</span><strong>{leads.length}</strong></div>
          <div className="stat-card"><span>Welcome Sent</span><strong>{welcomeSent}</strong></div>
          <div className="stat-card"><span>Reminders Sent</span><strong>{reminderSent}</strong></div>
          <div className="stat-card"><span>Reminder Queue</span><strong>{pending}</strong></div>
        </div>
        <LeadsTable rows={leads} />
      </>}
    </div>
  );
}
