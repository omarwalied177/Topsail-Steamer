"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  discount_code: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  date_arrival: string | null;
  date_received: string | null;
  welcome_sent: boolean | null;
  reminder_sent: boolean | null;
};

type EmailType = "welcome" | "reminder";

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function BoolBadge({ value }: { value: boolean | null }) {
  const yes = value === true;
  return <span className={`status-pill ${yes ? "status-yes" : "status-no"}`}><span className="status-dot" />{yes ? "True" : "False"}</span>;
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function personalize(text: string, lead: Lead) {
  return text.replaceAll("{{first_name}}", lead.first_name || "").replaceAll("{{last_name}}", lead.last_name || "").replaceAll("{{email}}", lead.email || "").replaceAll("{{discount_code}}", lead.discount_code || "");
}

function Icon({ name }: { name: "mail" | "tag" | "search" | "download" | "save" | "eye" }) {
  const paths = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    tag: <><path d="M20 13 13 20l-9-9V4h7l9 9Z"/><circle cx="8" cy="8" r="1"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></>,
    save: <><path d="M5 4h12l3 3v13H5z"/><path d="M8 4v6h8V4"/><path d="M8 20v-6h8v6"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function LeadsTable({ rows }: { rows: Lead[] }) {
  const [query, setQuery] = useState("");
  const [emailType, setEmailType] = useState<EmailType>("welcome");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((lead) => [lead.first_name, lead.last_name, lead.email, lead.city, lead.state, lead.zip_code, lead.discount_code].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [rows, query]);

  useEffect(() => {
    setDiscountCode(rows.find((lead) => lead.discount_code)?.discount_code || "");
  }, [rows]);

  useEffect(() => {
    let cancelled = false;
    setLoadingTemplate(true);
    fetch(`/api/email-templates?type=${emailType}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load template.");
        if (!cancelled) { setSubject(data.subject || ""); setBody(data.body || ""); }
      })
      .catch((e) => !cancelled && setTemplateMessage(e instanceof Error ? e.message : "Could not load template."))
      .finally(() => !cancelled && setLoadingTemplate(false));
    return () => { cancelled = true; };
  }, [emailType]);

  function exportCsv() {
    const headers = ["id", "first_name", "last_name", "email", "phone", "discount_code", "city", "state", "zip_code", "date_arrival", "date_received", "welcome_sent", "reminder_sent"];
    const lines = [headers.map(csvCell).join(",")];
    for (const lead of filtered) lines.push(headers.map((key) => csvCell(lead[key as keyof Lead])).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `topsail-chamber-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  async function saveTemplate() {
    setSavingTemplate(true); setTemplateMessage("");
    try {
      const res = await fetch("/api/email-templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: emailType, subject, body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save email template.");
      setTemplateMessage("Saved successfully.");
    } catch (e) { setTemplateMessage(e instanceof Error ? e.message : "Could not save email template."); }
    finally { setSavingTemplate(false); }
  }

  async function saveDiscountCode() {
    setSavingCode(true); setCodeMessage("");
    try {
      const res = await fetch("/api/discount-code", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: discountCode }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save discount code.");
      setCodeMessage("Saved successfully.");
    } catch (e) { setCodeMessage(e instanceof Error ? e.message : "Could not save discount code."); }
    finally { setSavingCode(false); }
  }

  const previewLead = filtered[0] || rows[0];
  const previewSubject = previewLead ? personalize(subject, previewLead) : subject;
  const previewBody = previewLead ? personalize(body, previewLead) : body;

  return <div className="leads-workspace">
    <section className="lead-operations card">
      <div className="toolbar-card">
        <div><p className="eyebrow">Lead operations</p><h3 className="font-display text-xl" style={{ color: "var(--navy)" }}>Visitor referrals</h3><p className="text-xs mt-1" style={{ color: "var(--navy-light)" }}>{filtered.length} of {rows.length} leads</p></div>
        <div className="toolbar-actions"><div className="search-wrap"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads…" className="search-input"/></div><button onClick={exportCsv} className="primary-button"><Icon name="download"/>Export CSV</button></div>
      </div>
      <div className="table-shell">
        <table className="lead-table">
          <colgroup><col className="col-name"/><col className="col-email"/><col className="col-location"/><col className="col-arrival"/><col className="col-discount"/><col className="col-status"/><col className="col-status"/></colgroup>
          <thead><tr><th>Name</th><th>Email</th><th>Location</th><th>Arrival</th><th>Discount</th><th>Welcome</th><th>Reminder</th></tr></thead>
          <tbody>{filtered.map((lead) => <tr key={lead.id}>
            <td><div className="lead-name">{lead.first_name} {lead.last_name}</div></td>
            <td title={lead.email}><div className="cell-truncate">{lead.email}</div></td>
            <td title={[lead.city, lead.state, lead.zip_code].filter(Boolean).join(", ")}><div className="cell-truncate">{[lead.city, lead.state, lead.zip_code].filter(Boolean).join(", ") || "—"}</div></td>
            <td className="nowrap">{formatDate(lead.date_arrival)}</td>
            <td><span className="discount-pill">{lead.discount_code || "—"}</span></td>
            <td><BoolBadge value={lead.welcome_sent}/></td><td><BoolBadge value={lead.reminder_sent}/></td>
          </tr>)}{filtered.length === 0 && <tr><td colSpan={7} className="empty-cell">No matching leads.</td></tr>}</tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {filtered.length} of {rows.length}</span><span className="page-current">1</span></div>
    </section>

    <aside className="right-rail">
      <section className="side-card card">
        <div className="card-title-row"><span className="icon-tile blue"><Icon name="mail"/></span><h3 className="font-display text-2xl" style={{ color: "var(--navy)" }}>Email Templates</h3></div>
        <div className="template-tabs"><button className={emailType === "welcome" ? "active" : ""} onClick={() => { setEmailType("welcome"); setPreview(false); }}>Welcome Email</button><button className={emailType === "reminder" ? "active" : ""} onClick={() => { setEmailType("reminder"); setPreview(false); }}>Reminder Email</button></div>
        {loadingTemplate ? <div className="template-loading">Loading template…</div> : preview ? <div className="email-preview"><div className="preview-subject">{previewSubject}</div><div className="preview-to">Preview</div><iframe title="Email preview" sandbox="" className="preview-frame" srcDoc={previewBody}/></div> : <>
          <label className="field-label">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} className="editor-input"/></label>
          <label className="field-label">Email Body<textarea value={body} onChange={(e) => setBody(e.target.value)} className="editor-textarea inline-editor"/></label>
        </>}
        {templateMessage && <p className={`save-message ${templateMessage.includes("success") ? "" : "save-error"}`}>{templateMessage}</p>}
        <div className="side-actions"><button className="preview-button" onClick={() => setPreview(!preview)}><Icon name="eye"/>{preview ? "Edit" : "Preview"}</button><button className="primary-button" onClick={saveTemplate} disabled={savingTemplate || loadingTemplate}><Icon name="save"/>{savingTemplate ? "Saving…" : "Save Template"}</button></div>
      </section>

      <section className="side-card card discount-card">
        <div className="card-title-row"><span className="icon-tile orange"><Icon name="tag"/></span><h3 className="font-display text-2xl" style={{ color: "var(--navy)" }}>Discount Code</h3></div>
        <label className="field-label">Current Code<div className="code-row"><input value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())} className="editor-input" placeholder="Enter code"/><span className="code-edit" aria-hidden="true">✎</span></div></label>
        <div className="info-note">This code is shared across customer email templates and can be updated by signed-in staff.</div>
        {codeMessage && <p className={`save-message ${codeMessage.includes("success") ? "" : "save-error"}`}>{codeMessage}</p>}
        <button className="primary-button full-button" onClick={saveDiscountCode} disabled={savingCode || !discountCode.trim()}><Icon name="save"/>{savingCode ? "Saving…" : "Save Code"}</button>
      </section>
    </aside>
  </div>;
}
