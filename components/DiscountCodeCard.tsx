"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

export function DiscountCodeCard() {
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/discount-code", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load discount code.");
      setCode(data.code || "");
      setDraft(data.code || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load discount code.");
    } finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  async function save() {
    const next = draft.trim().toUpperCase();
    if (!next) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/discount-code", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save discount code.");
      setCode(data.code || next);
      setDraft(data.code || next);
      setEditing(false);
      setMessage("Saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save discount code.");
    } finally { setSaving(false); }
  }

  return (
    <section className="panel-card discount-panel">
      <div className="panel-title-row">
        <div className="panel-icon panel-icon-orange"><Icon name="tag" size={22} /></div>
        <h3>Discount Code</h3>
      </div>
      <label className="form-label">Current Code
        <div className="code-row">
          <input className="form-input code-input" value={editing ? draft : (loading ? "Loading…" : code)} onChange={(e) => setDraft(e.target.value)} readOnly={!editing} />
          <button className="icon-button" aria-label="Edit discount code" onClick={() => { setEditing(true); setDraft(code); }}><Icon name="edit" size={18} /></button>
        </div>
      </label>
      <div className="info-note"><Icon name="info" size={18} /> <span>This code is shared across customer email templates and can be updated by signed-in staff.</span></div>
      {editing && <div className="code-actions">
        <button className="button button-light" onClick={() => { setEditing(false); setDraft(code); }}>Cancel</button>
        <button className="button button-orange" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Code"}</button>
      </div>}
      {message && <p className={`panel-message ${message.includes("successfully") ? "success" : "error"}`}>{message}</p>}
    </section>
  );
}
