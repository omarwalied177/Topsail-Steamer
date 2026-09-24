export default function CalendarPage() {
  return <div>
    <div className="page-heading">
      <p className="eyebrow">Content</p>
      <h2 className="font-display text-4xl" style={{ color: "var(--navy)" }}>Content Calendar</h2>
      <p className="page-subtitle">Plan and organize upcoming Topsail Steamer content.</p>
    </div>
    <div className="card" style={{ padding: "48px", textAlign: "center", maxWidth: 760 }}>
      <div style={{ display:"inline-flex", padding:"9px 13px", borderRadius:999, background:"#eef3f6", color:"#6d8191", fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".12em" }}>Coming Soon</div>
      <h3 className="font-display" style={{ color:"var(--navy)", fontSize:28, margin:"16px 0 8px" }}>Content Calendar is coming soon.</h3>
      <p style={{ color:"var(--muted)", fontSize:14, margin:0 }}>This section will be available in a future update.</p>
    </div>
  </div>;
}
