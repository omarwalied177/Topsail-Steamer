import { getLeads } from "@/lib/supabase";
import { LeadsTable } from "@/components/LeadsTable";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await getLeads();
  const welcomeSent = leads.filter((lead) => lead.welcome_sent === true).length;
  const remindersSent = leads.filter((lead) => lead.remainder_sent === true).length;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  const pendingReminders = leads.filter((lead) => {
    const arrival = typeof lead.date_arrival === "string" ? lead.date_arrival.slice(0, 10) : "";
    return /^\d{4}-\d{2}-\d{2}$/.test(arrival) && arrival <= tomorrowKey && lead.remainder_sent !== true;
  }).length;
  const stats = [
    ["Total Leads", leads.length],
    ["Welcome Sent", welcomeSent],
    ["Reminders Sent", remindersSent],
    ["Reminder Queue", pendingReminders],
  ] as const;

  return (
    <div>
      <div className="page-heading">
        <h2 className="font-display text-3xl" style={{ color: "var(--navy)" }}>Chamber Leads</h2>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <LeadsTable rows={leads} />
    </div>
  );
}
