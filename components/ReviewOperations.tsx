"use client";

import { useMemo, useState } from "react";

type Review = {
  id: string;
  platform: "google" | "bentobox";
  review_id: string;
  review_text: string;
  reviewer_name: string | null;
  rating: number | null;
  review_posted_at: string | null;
  draft_reply: string | null;
  status: "pending" | "approved" | "rejected" | "posted" | "manual_paste_ready" | string;
  approved_by: string | null;
  posted_at: string | null;
  turnaround_hours: number | null;
  location_id: string | null;
  created_at?: string | null;
  source?: string | null;
  reviewer_email?: string | null;
  email_message_id?: string | null;
  email_thread_id?: string | null;
  email_subject?: string | null;
  email_from?: string | null;
  order_number?: string | null;
  item_count?: number | null;
  order_total?: number | null;
  category_ratings?: Record<string, number> | null;
  feedback_summary?: string | null;
};

type ContextRow = { id: string; topic: string; guidance: string; updated_at: string | null };

const statusLabel: Record<string, string> = {
  pending: "Needs approval",
  approved: "Approved · waiting to post",
  rejected: "Rejected",
  posted: "Posted",
  manual_paste_ready: "Manual action",
};

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="review-rating muted">No rating</span>;
  return <span className="review-rating" aria-label={`${rating} out of 5 stars`}>{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ReviewOperations({ initialReviews, initialContext }: { initialReviews: Review[]; initialContext: ContextRow[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [context, setContext] = useState(initialContext);
  const [tab, setTab] = useState<"queue" | "google" | "bentobox" | "context">("queue");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ reviewer_name: "", rating: "", review_text: "" });
  const [contextOpen, setContextOpen] = useState(false);
  const [newContext, setNewContext] = useState({ topic: "", guidance: "" });

  const stats = useMemo(() => ({
    total: reviews.length,
    pending: reviews.filter(r => r.status === "pending" || r.status === "manual_paste_ready").length,
    approved: reviews.filter(r => r.status === "approved").length,
    posted: reviews.filter(r => r.status === "posted").length,
    google: reviews.filter(r => r.platform === "google").length,
    bentobox: reviews.filter(r => r.platform === "bentobox").length,
  }), [reviews]);

  const visibleReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter(r => {
      if (tab === "queue" && !(r.status === "pending" || r.status === "manual_paste_ready" || r.status === "approved")) return false;
      if (tab === "google" && r.platform !== "google") return false;
      if (tab === "bentobox" && r.platform !== "bentobox") return false;
      if (!q) return true;
      return [r.reviewer_name, r.review_text, r.draft_reply, r.status, r.platform].some(v => String(v || "").toLowerCase().includes(q));
    }).sort((a, b) => new Date(b.review_posted_at || b.created_at || 0).getTime() - new Date(a.review_posted_at || a.created_at || 0).getTime());
  }, [reviews, tab, query]);

  async function updateReview(id: string, payload: Record<string, unknown>) {
    setBusyId(id); setNotice(null);
    try {
      const response = await fetch(`/api/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update review.");
      setReviews(rows => rows.map(r => r.id === id ? { ...r, ...data.review } : r));
      setNotice(payload.action === "approve" ? "Review approved. n8n will publish the Google reply on its next approval check." : payload.action === "reject" ? "Review rejected." : "Draft saved.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not update review."); }
    finally { setBusyId(null); }
  }

  async function createManualReview(generateDraft: boolean) {
    setBusyId("manual"); setNotice(null);
    try {
      const response = await fetch("/api/reviews/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        reviewer_name: manual.reviewer_name,
        rating: manual.rating ? Number(manual.rating) : null,
        review_text: manual.review_text,
        generateDraft,
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save BentoBox review.");
      setReviews(rows => [data.review, ...rows]);
      setManual({ reviewer_name: "", rating: "", review_text: "" });
      setManualOpen(false);
      setNotice(generateDraft ? "BentoBox review submitted. The draft will appear when n8n finishes." : "Manual fallback saved as a paste-ready item.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save BentoBox review."); }
    finally { setBusyId(null); }
  }

  async function saveContext(row: ContextRow) {
    setBusyId(`context-${row.id}`); setNotice(null);
    try {
      const response = await fetch(`/api/reviews/context/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: row.topic, guidance: row.guidance }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update business context.");
      setContext(rows => rows.map(r => r.id === row.id ? data.context : r));
      setNotice("Business context updated. New drafts will use the latest guidance.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not update business context."); }
    finally { setBusyId(null); }
  }

  async function addContext() {
    if (!newContext.topic.trim() || !newContext.guidance.trim()) return;
    setBusyId("context-new"); setNotice(null);
    try {
      const response = await fetch("/api/reviews/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newContext) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add business context.");
      setContext(rows => [...rows, data.context]); setNewContext({ topic: "", guidance: "" }); setContextOpen(false); setNotice("Business context row added.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not add business context."); }
    finally { setBusyId(null); }
  }

  return <div className="review-operations">
    <div className="review-health card">
      <div><span className="section-kicker">Automation 1 · Customer Experience</span><strong>{stats.pending} item{stats.pending === 1 ? "" : "s"} need attention</strong><p>Google reviews and BentoBox feedback emails are ingested every 4 hours, grounded with business context, and held for human approval.</p></div>
      <div className="health-points"><span>{stats.google} Google</span><span>{stats.bentobox} BentoBox email</span><span>{stats.posted} posted</span><span>{stats.approved} awaiting publish</span></div>
    </div>
    <div className="review-source-card card">
      <div className="source-icon">✉</div>
      <div className="source-copy"><span className="section-kicker">BentoBox email intake · live path</span><strong>Feedback arrives in the business Gmail inbox</strong><p>n8n reads messages from <code>topsailsteamerami@getbento.com</code>, extracts the diner, rating, order details, category ratings, and any written note, then generates the draft. The attached BentoBox example confirms the email contains the diner name, feedback date, order number/value, Food/Pickup ratings, and a Reply action.</p></div>
      <div className="source-meta"><span>Polls every 4h</span><span>Human approval</span></div>
    </div>

    <div className="review-tabs card">
      {([['queue', 'Approval Queue'], ['google', 'Google'], ['bentobox', 'BentoBox'], ['context', 'Business Context']] as const).map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}{key === "queue" && stats.pending > 0 && <span className="tab-count">{stats.pending}</span>}</button>)}
      {tab !== "context" && <div className="review-toolbar"><input className="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reviews…"/><button className="secondary-button" onClick={() => setManualOpen(true)}>Manual fallback</button></div>}
    </div>

    {notice && <div className="review-notice">{notice}</div>}

    {tab === "context" ? <section className="card context-panel">
      <div className="panel-head"><div><span className="section-kicker">Grounding source</span><h3>Business Context</h3><p>Maintain the short reference rows the system uses for every new review reply. This is intentionally editable from the client UI.</p></div><button className="primary-button" onClick={() => setContextOpen(!contextOpen)}>{contextOpen ? "Cancel" : "+ Add guidance"}</button></div>
      {contextOpen && <div className="context-add"><input className="editor-input" placeholder="Topic, e.g. Missing items" value={newContext.topic} onChange={e => setNewContext(v => ({ ...v, topic: e.target.value }))}/><textarea className="editor-textarea" placeholder="Guidance the assistant should follow" value={newContext.guidance} onChange={e => setNewContext(v => ({ ...v, guidance: e.target.value }))}/><button className="primary-button" disabled={busyId === "context-new"} onClick={addContext}>{busyId === "context-new" ? "Saving…" : "Save guidance"}</button></div>}
      <div className="context-list">{context.map(row => <div className="context-row" key={row.id}><input className="editor-input" value={row.topic} onChange={e => setContext(rows => rows.map(r => r.id === row.id ? { ...r, topic: e.target.value } : r))}/><textarea className="editor-textarea" value={row.guidance} onChange={e => setContext(rows => rows.map(r => r.id === row.id ? { ...r, guidance: e.target.value } : r))}/><div className="context-row-footer"><span>Updated {formatDate(row.updated_at)}</span><button className="secondary-button" disabled={busyId === `context-${row.id}`} onClick={() => saveContext(row)}>{busyId === `context-${row.id}` ? "Saving…" : "Save changes"}</button></div></div>)}</div>
      {!context.length && <div className="empty-review">No business context rows yet. Add service guidance, product specifics, common issue handling, and brand tone.</div>}
    </section> : <section className="review-list">{visibleReviews.map(review => <ReviewCard key={review.id} review={review} busy={busyId === review.id} onUpdate={updateReview}/>)}{!visibleReviews.length && <div className="card empty-review"><strong>No reviews in this view.</strong><p>New Google reviews and BentoBox feedback emails appear after the next scheduled intake run.</p></div>}</section>}

    {manualOpen && <div className="modal-backdrop" role="presentation"><div className="review-modal card"><div className="modal-head"><div><span className="section-kicker">Manual intake</span><h3>Add manual BentoBox review</h3><p>Use this only if a BentoBox email cannot be parsed. Normal BentoBox intake now comes from the business Gmail inbox automatically.</p></div><button className="icon-button" onClick={() => setManualOpen(false)} aria-label="Close">×</button></div><label className="field-label">Reviewer name<input className="editor-input" value={manual.reviewer_name} onChange={e => setManual(v => ({ ...v, reviewer_name: e.target.value }))}/></label><label className="field-label">Rating (1–5)<input className="editor-input" type="number" min="1" max="5" value={manual.rating} onChange={e => setManual(v => ({ ...v, rating: e.target.value }))}/></label><label className="field-label">Review<textarea className="editor-textarea" value={manual.review_text} onChange={e => setManual(v => ({ ...v, review_text: e.target.value }))} placeholder="Paste the review text or feedback details here…"/></label><div className="modal-actions"><button className="secondary-button" onClick={() => createManualReview(false)} disabled={busyId === "manual" || !manual.review_text.trim()}>Save for manual reply</button><button className="primary-button" onClick={() => createManualReview(true)} disabled={busyId === "manual" || !manual.review_text.trim()}>Generate draft</button></div></div></div>}
  </div>;
}

function ReviewCard({ review, busy, onUpdate }: { review: Review; busy: boolean; onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void> }) {
  const [draft, setDraft] = useState(review.draft_reply || "");
  const [copied, setCopied] = useState(false);
  async function copyReply() {
    if (!draft.trim()) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <article className={`review-card card ${review.status === "pending" || review.status === "manual_paste_ready" ? "needs-action" : ""}`}>
    <div className="review-card-top"><div><div className="review-source"><span className={`source-pill ${review.platform}`}>{review.platform === "google" ? "Google" : "BentoBox"}</span><Stars rating={review.rating}/><span className={`review-status ${review.status}`}>{statusLabel[review.status] || review.status}</span></div><h3>{review.reviewer_name || "Customer"}</h3><p className="review-date">{formatDate(review.review_posted_at)}</p></div><div className="review-id">ID · {review.review_id}</div></div>
    <div className="review-content"><div className="original-review">
      <span className="field-caption">Original feedback</span>
      <p>{review.review_text || "No written note provided."}</p>
      {review.platform === "bentobox" && <div className="bentobox-details">
        <div className="detail-grid">
          {review.order_number && <div><span>Order</span><strong>#{review.order_number}</strong></div>}
          {review.item_count != null && <div><span>Items</span><strong>{review.item_count}</strong></div>}
          {review.order_total != null && <div><span>Order total</span><strong>${review.order_total.toFixed(2)}</strong></div>}
          {review.source === "bentobox_email" && <div><span>Source</span><strong>Email intake</strong></div>}
        </div>
        {review.feedback_summary && <div className="feedback-summary"><span>Feedback summary</span><strong>{review.feedback_summary}</strong></div>}
        {!!review.category_ratings && Object.keys(review.category_ratings).length > 0 && <div className="category-ratings"><span>Category ratings</span><div>{Object.entries(review.category_ratings).map(([key,value]) => <span key={key}>{key}: {"★".repeat(value)}{"☆".repeat(5-value)}</span>)}</div></div>}
        {review.reviewer_email && <div className="source-email"><span>Diner email</span><strong>{review.reviewer_email}</strong></div>}
      </div>}
    </div><div className="reply-editor"><label className="field-caption" htmlFor={`reply-${review.id}`}>Draft reply</label><textarea id={`reply-${review.id}`} className="editor-textarea review-draft" value={draft} onChange={e => setDraft(e.target.value)} placeholder={review.platform === "bentobox" ? "Paste or generate the reply here…" : "Draft will appear here…"}/><div className="review-card-footer"><span>{draft.length} characters{review.turnaround_hours != null ? ` · ${review.turnaround_hours.toFixed(1)}h turnaround` : ""}</span><div className="review-actions">{review.status !== "posted" && <button className="secondary-button" disabled={busy} onClick={() => onUpdate(review.id, { draft_reply: draft })}>Save draft</button>}{review.status !== "posted" && <button className="danger-button" disabled={busy} onClick={() => onUpdate(review.id, { action: "reject" })}>Reject</button>}{review.status !== "posted" && review.platform === "google" && <button className="primary-button" disabled={busy || !draft.trim()} onClick={() => onUpdate(review.id, { draft_reply: draft, action: "approve" })}>Approve & post</button>}{review.platform === "bentobox" && draft.trim() && <button className="secondary-button" disabled={busy} onClick={copyReply}>{copied ? "Copied" : "Copy reply"}</button>}{review.status !== "posted" && review.platform === "bentobox" && <button className="primary-button" disabled={busy || !draft.trim()} onClick={() => onUpdate(review.id, { draft_reply: draft, action: "approve_manual" })}>Mark ready to paste</button>}</div></div></div></div>
  </article>;
}
