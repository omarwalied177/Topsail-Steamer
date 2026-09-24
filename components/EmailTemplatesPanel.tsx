"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

type EmailType = "welcome" | "reminder";

export function EmailTemplatesPanel() {
  const [type, setType] = useState<EmailType>("welcome");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTemplate(nextType: EmailType) {
    setType(nextType);
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/email-templates?type=${nextType}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load template.");
      setSubject(data.subject || "");
      setBody(data.body || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load template.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const timer = window.setTimeout(() => { void loadTemplate("welcome"); }, 0); return () => window.clearTimeout(timer); }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/email-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save template.");
      setMessage("Saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel-card email-panel">
      <div className="panel-title-row">
        <div className="panel-icon panel-icon-blue"><Icon name="mail" size={22} /></div>
        <h3>Email Templates</h3>
      </div>

      <div className="template-tabs" role="tablist" aria-label="Email templates">
        <button className={type === "welcome" ? "active" : ""} onClick={() => void loadTemplate("welcome")}>Welcome Email</button>
        <button className={type === "reminder" ? "active" : ""} onClick={() => void loadTemplate("reminder")}>Reminder Email</button>
      </div>

      {loading ? <div className="panel-loading">Loading template…</div> : (
        <>
          <label className="form-label">Subject
            <input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="form-label">Email Body
            <textarea className="template-editor" value={body} onChange={(e) => setBody(e.target.value)} />
          </label>

          <div className="template-actions">
            <button className="button button-blue" onClick={() => setPreview((v) => !v)}><Icon name="eye" size={18} /> {preview ? "Back to Edit" : "Preview"}</button>
            <button className="button button-orange" onClick={save} disabled={saving}><Icon name="save" size={18} /> {saving ? "Saving…" : "Save Template"}</button>
          </div>

          {preview && <div className="template-preview">
            <div className="preview-meta">Preview</div>
            <div className="preview-subject">{subject}</div>
            <iframe title="Email preview" sandbox="" srcDoc={body} />
          </div>}
          {message && <p className={`panel-message ${message.includes("successfully") ? "success" : "error"}`}>{message}</p>}
        </>
      )}
    </section>
  );
}
