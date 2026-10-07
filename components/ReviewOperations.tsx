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
  written_feedback?: string | null;
  email_message_id?: string | null;
  email_sent_at?: string | null;
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

const GOOGLE_REVIEW_URL = "https://www.google.com/url?q=https://search.google.com/local/writereview?placeid%3D0x88c311f4bad29d81:0xf85d5930343730a0&source=gmail&ust=1791213228198000&sa=E";

function getFeedbackTone(review: Review): "positive" | "mixed" | "negative" {
  const text = cleanBentoBoxFeedback(review);
  const negativeWords = /\b(bad|poor|terrible|awful|dirty|unclean|cold|wrong|missing|late|slow|disappointed|disappointing|didn.?t like|did not like|not good|problem|issue|complaint|concern|unhappy|rude|overcooked|undercooked|stale|gross|refund)\b/i;
  if (negativeWords.test(text)) return "mixed";
  const ratings = review.category_ratings ? Object.values(review.category_ratings).filter(v => Number.isFinite(v)) : [];
  if (ratings.some(v => v <= 2)) return "negative";
  if (ratings.some(v => v === 3)) return "mixed";
  if (review.rating != null && review.rating <= 2) return "negative";
  if (review.rating != null && review.rating >= 4) return "positive";
  return "mixed";
}

function hasWrittenFeedback(review: Review) {
  return cleanBentoBoxFeedback(review) !== "No written note provided.";
}

function draftHasGoogleLink(draft: string) {
  return draft.includes(GOOGLE_REVIEW_URL);
}

function ensureGoogleReviewLink(draft: string) {
  if (draftHasGoogleLink(draft)) return draft;
  return `${draft.trim()}\n\nIf you have a minute, we’d be grateful if you shared your experience on Google. It really helps other folks on Anna Maria Island find us:\n${GOOGLE_REVIEW_URL}`;
}

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

function cleanBentoBoxFeedback(review: Review) {
  const raw = String(review.written_feedback || review.review_text || "").trim();
  if (!raw) return "No written note provided.";
  if (review.platform !== "bentobox") return raw;

  // Older BentoBox parser rows stored the whole email text in written_feedback.
  // Recover the actual diner note for display without changing the stored row.
  if (/rating-star|\[\s*David Carper|\bFOOD\b[\s\S]*\bPICKUP\b/i.test(raw)) {
    const marker = raw.search(/\b(?:Wife|Husband|I|We|They|The)\b/);
    if (marker >= 0) {
      const cleaned = raw.slice(marker)
        .replace(/\[[^\]]*$/g, "")
        .replace(/\s*\[[^\]]*\]?/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length > 10) return cleaned;
    }

    const serviceMarker = raw.lastIndexOf("Friendly Service");
    if (serviceMarker >= 0) {
      const tail = raw.slice(serviceMarker + "Friendly Service".length)
        .replace(/[\[\]]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (tail.length > 10) return tail;
    }
  }

  return raw;
}

export function ReviewOperations({ initialReviews, initialContext }: { initialReviews: Review[]; initialContext: ContextRow[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [context, setContext] = useState(initialContext);
  const [tab, setTab] = useState<"queue" | "google" | "bentobox" | "context">("queue");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ reviewer_name: "", reviewer_email: "", rating: "", review_text: "" });
  const [contextOpen, setContextOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [newContext, setNewContext] = useState({ topic: "", guidance: "" });

  const stats = useMemo(() => ({
    total: reviews.length,
    // Sent BentoBox emails are no longer awaiting human action.
    pending: reviews.filter(r =>
      !r.email_sent_at &&
      (r.status === "pending" || r.status === "manual_paste_ready")
    ).length,
    approved: reviews.filter(r => r.status === "approved").length,
    // Dashboard treats a successfully sent BentoBox email as completed/posted.
    posted: reviews.filter(r => r.status === "posted" || !!r.email_sent_at).length,
    google: reviews.filter(r => r.platform === "google").length,
    bentobox: reviews.filter(r => r.platform === "bentobox").length,
  }), [reviews]);

  const visibleReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter(r => {
      // Sent BentoBox emails are completed: hide them only from the approval queue,
      // but keep them visible in the BentoBox tab as sent history.
      if (tab === "queue" && (r.platform === "bentobox" && r.email_sent_at)) return false;
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

  async function sendBentoBoxEmail(review: Review, draft: string) {
    if (!review.reviewer_email) {
      setNotice("This BentoBox review has no diner email address.");
      return;
    }
    if (!draft.trim()) {
      setNotice("Write or generate the reply before sending the email.");
      return;
    }
    if (/\bkitchen\b/i.test(draft)) {
      setNotice('This draft is blocked because it contains the prohibited word “kitchen”.');
      return;
    }
    let sendDraft = draft.trim();
    if (getFeedbackTone(review) === "positive" && !draftHasGoogleLink(sendDraft)) {
      sendDraft = ensureGoogleReviewLink(sendDraft);
      setDraft(sendDraft);
    }

    setBusyId(review.id); setNotice(null);
    try {
      const response = await fetch(`/api/reviews/${review.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_reply: sendDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the email.");
      // Keep the sent review in local state so it disappears from Approval Queue
      // but remains visible in the BentoBox tab as sent history.
      setReviews(rows => rows.map(r =>
        r.id === review.id
          ? {
              ...r,
              email_sent_at: data.review?.email_sent_at || new Date().toISOString(),
              email_message_id: data.review?.email_message_id || r.email_message_id || null,
            }
          : r
      ));
      setNotice(`Email sent to ${review.reviewer_email}.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not send the email.");
    } finally {
      setBusyId(null);
    }
  }

  function deleteReview(review: Review) {
    setDeletingReview(review);
  }

  async function confirmDeleteReview() {
    if (!deletingReview) return;
    const review = deletingReview;
    setBusyId(review.id); setNotice(null);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete review.");
      setReviews(rows => rows.filter(r => r.id !== review.id));
      setDeletingReview(null);
      setNotice("Review deleted from the dashboard.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not delete review.");
    } finally {
      setBusyId(null);
    }
  }

  async function createManualReview(generateDraft: boolean) {
    setBusyId("manual"); setNotice(null);
    try {
      const response = await fetch("/api/reviews/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        reviewer_name: manual.reviewer_name,
        reviewer_email: manual.reviewer_email,
        rating: manual.rating ? Number(manual.rating) : null,
        review_text: manual.review_text,
        generateDraft,
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save BentoBox review.");
      setReviews(rows => [data.review, ...rows]);
      setManual({ reviewer_name: "", reviewer_email: "", rating: "", review_text: "" });
      setManualOpen(false);
      setNotice(generateDraft ? "BentoBox review submitted. The draft will appear when n8n finishes." : "Manual BentoBox item saved as paste-ready.");
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
    <div className="review-hero card">
      <div className="review-hero-copy">
        <h2>{stats.pending} {stats.pending === 1 ? "item" : "items"} need attention</h2><p></p>
      </div>
      <div className="health-points">
        <span>{stats.google} Google</span>
        <span>{stats.bentobox} BentoBox email</span>
        <span>{stats.posted} posted</span>
        <span>{stats.approved} awaiting publish</span>
      </div>
    </div>

    <div className="review-tabs card">
      {([['queue', 'Approval Queue'], ['google', 'Google'], ['bentobox', 'BentoBox'], ['context', 'Business Context']] as const).map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}{key === "queue" && stats.pending > 0 && <span className="tab-count">{stats.pending}</span>}</button>)}
      {tab !== "context" && <div className="review-toolbar"><input className="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reviews…"/><button className="secondary-button" onClick={() => setManualOpen(true)}>Manual BentoBox</button></div>}
    </div>

    {notice && <div className="review-notice">{notice}</div>}

    {tab === "context" ? <section className="card context-panel">
      <div className="panel-head"><div><h3>Business Context</h3></div><button className="primary-button" onClick={() => setContextOpen(!contextOpen)}>{contextOpen ? "Cancel" : "+ Add guidance"}</button></div>
      {contextOpen && <div className="context-add"><input className="editor-input" placeholder="Topic, e.g. Missing items" value={newContext.topic} onChange={e => setNewContext(v => ({ ...v, topic: e.target.value }))}/><textarea className="editor-textarea" placeholder="Guidance the assistant should follow" value={newContext.guidance} onChange={e => setNewContext(v => ({ ...v, guidance: e.target.value }))}/><button className="primary-button" disabled={busyId === "context-new"} onClick={addContext}>{busyId === "context-new" ? "Saving…" : "Save guidance"}</button></div>}
      <div className="context-list">{context.map(row => <div className="context-row" key={row.id}><input className="editor-input" value={row.topic} onChange={e => setContext(rows => rows.map(r => r.id === row.id ? { ...r, topic: e.target.value } : r))}/><textarea className="editor-textarea" value={row.guidance} onChange={e => setContext(rows => rows.map(r => r.id === row.id ? { ...r, guidance: e.target.value } : r))}/><div className="context-row-footer"><span>Updated {formatDate(row.updated_at)}</span><button className="secondary-button" disabled={busyId === `context-${row.id}`} onClick={() => saveContext(row)}>{busyId === `context-${row.id}` ? "Saving…" : "Save changes"}</button></div></div>)}</div>
      {!context.length && <div className="empty-review">No business context rows yet. Add service guidance, product specifics, common issue handling, and brand tone.</div>}
    </section> : <section className="review-list">{visibleReviews.map(review => <ReviewCard key={review.id} review={review} busy={busyId === review.id} onUpdate={updateReview} onSendEmail={sendBentoBoxEmail} onDelete={deleteReview}/>)}{!visibleReviews.length && <div className="card empty-review"><strong>No reviews in this view.</strong><p>New Google reviews and BentoBox feedback emails appear after the next scheduled intake run.</p></div>}</section>}

    {deletingReview && <div className="edit-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && busyId !== deletingReview.id) setDeletingReview(null); }}><section className="edit-modal delete-modal review-delete-modal" role="dialog" aria-modal="true" aria-labelledby="review-delete-title"><div className="edit-modal-head"><div><p className="eyebrow">Customer Experience</p><h3 id="review-delete-title">Delete review?</h3></div><button className="modal-close" onClick={() => setDeletingReview(null)} disabled={busyId === deletingReview.id} aria-label="Close">×</button></div><div className="delete-review-summary"><span className={`source-pill ${deletingReview.platform}`}>{deletingReview.platform === "google" ? "Google Business Profile" : "BentoBox"}</span><strong>{deletingReview.reviewer_name || "Customer"}</strong>{deletingReview.rating != null && <Stars rating={deletingReview.rating}/>}</div><p>Delete this <strong>{deletingReview.platform === "google" ? "Google" : "BentoBox"} review</strong> from the dashboard?</p><p className="delete-warning">This removes the review record from the dashboard database. It does not delete the customer's review from Google or BentoBox.</p><div className="edit-modal-actions"><button className="secondary-button" disabled={busyId === deletingReview.id} onClick={() => setDeletingReview(null)}>Cancel</button><button className="primary-button delete-confirm-button" disabled={busyId === deletingReview.id} onClick={() => void confirmDeleteReview()}>{busyId === deletingReview.id ? "Deleting…" : "Delete review"}</button></div></section></div>}

    {manualOpen && <div className="modal-backdrop" role="presentation"><div className="review-modal card"><div className="modal-head"><div><h3>Add manual BentoBox review</h3></div><button className="icon-button" onClick={() => setManualOpen(false)} aria-label="Close">×</button></div><label className="field-label">Reviewer name<input className="editor-input" value={manual.reviewer_name} onChange={e => setManual(v => ({ ...v, reviewer_name: e.target.value }))}/></label><label className="field-label">Diner email<input className="editor-input" type="email" value={manual.reviewer_email} onChange={e => setManual(v => ({ ...v, reviewer_email: e.target.value }))} placeholder="customer@example.com"/></label><label className="field-label">Rating (1–5)<input className="editor-input" type="number" min="1" max="5" value={manual.rating} onChange={e => setManual(v => ({ ...v, rating: e.target.value }))}/></label><label className="field-label">Written review <span className="field-optional">optional when a rating is provided</span><textarea className="editor-textarea" value={manual.review_text} onChange={e => setManual(v => ({ ...v, review_text: e.target.value }))} placeholder="Paste the customer's written feedback here. Leave blank for rating-only feedback."/></label><div className="manual-rule-note">Rating-only feedback is valid. The assistant will not invent food, service, pickup, or staff details that were not supplied.</div><div className="modal-actions"><button className="secondary-button" onClick={() => createManualReview(false)} disabled={busyId === "manual" || (!manual.review_text.trim() && !manual.rating) || !manual.reviewer_email.trim()}>Save for manual reply</button><button className="primary-button" onClick={() => createManualReview(true)} disabled={busyId === "manual" || (!manual.review_text.trim() && !manual.rating) || !manual.reviewer_email.trim()}>Generate draft</button></div></div></div>}
  </div>;
}

function ReviewCard({ review, busy, onUpdate, onSendEmail, onDelete }: { review: Review; busy: boolean; onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>; onSendEmail: (review: Review, draft: string) => Promise<void>; onDelete: (review: Review) => Promise<void> }) {
  const [draft, setDraft] = useState(review.draft_reply || "");
  const [copied, setCopied] = useState(false);
  const tone = getFeedbackTone(review);
  const written = hasWrittenFeedback(review);
  const isBento = review.platform === "bentobox";
  const isPositiveBento = isBento && tone === "positive";
  const googleLinkReady = draftHasGoogleLink(draft);
  const blockedByKitchen = /\bkitchen\b/i.test(draft);

  async function copyReply() {
    if (!draft.trim()) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <article className={`review-card card ${review.status === "pending" || review.status === "manual_paste_ready" ? "needs-action" : ""}`}>
    <div className="review-card-top">
      <div>
        <div className="review-source">
          <span className={`source-pill ${review.platform}`}>{review.platform === "google" ? "Google Business Profile" : "BentoBox"}</span>
          <span className={`feedback-tone ${tone}`}>{tone === "positive" ? "Positive" : tone === "negative" ? "Negative" : "Mixed"}</span>
          {isBento && <span className="feedback-kind">{written ? "Written feedback" : "Rating only"}</span>}
          <Stars rating={review.rating}/>
          <span className={`review-status ${review.email_sent_at ? "posted" : review.status}`}>{review.email_sent_at ? "Email sent" : (statusLabel[review.status] || review.status)}</span>
        </div>
        <h3>{review.reviewer_name || "Customer"}</h3>
        <p className="review-date">{formatDate(review.review_posted_at)}</p>
      </div>
      <div className="review-id">ID · {review.review_id}</div>
    </div>

    <div className="review-content">
      <div className="original-review">
        <span className="field-caption">{isBento ? (written ? "Written feedback" : "BentoBox rating feedback") : "Original Google review"}</span>
        <p>{cleanBentoBoxFeedback(review)}</p>

        {isBento && <div className="bentobox-details">
          <div className="detail-grid">
            {review.order_number && <div><span>Order</span><strong>#{review.order_number}</strong></div>}
            {review.item_count != null && <div><span>Items</span><strong>{review.item_count}</strong></div>}
            {review.order_total != null && <div><span>Order total</span><strong>${review.order_total.toFixed(2)}</strong></div>}
            {review.source === "bentobox_email" && <div><span>Source</span><strong>BentoBox email</strong></div>}
          </div>
          {review.feedback_summary && <div className="feedback-summary"><span>Feedback summary</span><strong>{review.feedback_summary}</strong></div>}
          {!!review.category_ratings && Object.keys(review.category_ratings).length > 0 && <div className="category-ratings"><span>Category ratings</span><div>{Object.entries(review.category_ratings).map(([key,value]) => <span key={key}>{key}: {"★".repeat(value)}{"☆".repeat(5-value)}</span>)}</div></div>}
          {review.reviewer_email && <div className="source-email"><span>Diner email</span><strong>{review.reviewer_email}</strong></div>}
          {review.email_sent_at && <div className="source-email"><span>Email sent</span><strong>{formatDate(review.email_sent_at)}</strong></div>}
        </div>}
      </div>

      <div className="reply-editor">
        <label className="field-caption" htmlFor={`reply-${review.id}`}>{isBento ? "Email draft" : "Google reply draft"}</label>
        <textarea id={`reply-${review.id}`} className="editor-textarea review-draft" value={draft} onChange={e => setDraft(e.target.value)} disabled={!!review.email_sent_at} placeholder={isBento ? (written ? "Paste or generate the email reply here…" : "Generate a short rating-only thank-you here…") : "Draft will appear here…"}/>

        {isBento && !review.email_sent_at && <div className="email-policy-panel">
          <div><strong>{written ? "Reply to the customer's words" : "Rating-only mode"}</strong><span>{written ? "Use the written feedback as the main source of what the diner experienced." : "Thank them for taking the time to rate the experience. Do not invent specifics from the stars alone."}</span></div>
          {isPositiveBento && <div className={googleLinkReady ? "policy-check good" : "policy-check bad"}>{googleLinkReady ? "✓ Google review link included" : "! Google review link required"}</div>}
          {blockedByKitchen && <div className="policy-check bad">! Blocked: prohibited word detected</div>}
        </div>}

        {isBento && draft.trim() && <div className="email-preview-card">
          <div className="email-preview-head"><span>Email preview</span><span>To: {review.reviewer_email || "diner"}</span></div>
          <div className="email-preview-body">{draft.split(/(https?:\/\/\S+)/g).map((part, i) => /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a> : <span key={i}>{part}</span>)}</div>
        </div>}

        <div className="review-card-footer">
          <span>{review.email_sent_at ? `Email sent · ${formatDate(review.email_sent_at)}` : `${draft.length} characters${review.turnaround_hours != null ? ` · ${review.turnaround_hours.toFixed(1)}h turnaround` : ""}`}</span>
          <div className="review-actions">
            {!review.email_sent_at && review.status !== "posted" && <button className="secondary-button" disabled={busy} onClick={() => onUpdate(review.id, { draft_reply: draft })}>Save draft</button>}
            {!review.email_sent_at && review.status !== "posted" && <button className="danger-button" disabled={busy} onClick={() => onUpdate(review.id, { action: "reject" })}>Reject</button>}
            <button className="danger-button" disabled={busy} onClick={() => onDelete(review)}>Delete</button>
            {!review.email_sent_at && review.status !== "posted" && review.platform === "google" && <button className="primary-button" disabled={busy || !draft.trim() || blockedByKitchen} onClick={() => onUpdate(review.id, { draft_reply: draft, action: "approve" })}>Approve & post</button>}
            {!review.email_sent_at && review.platform === "bentobox" && draft.trim() && <button className="secondary-button" disabled={busy} onClick={copyReply}>{copied ? "Copied" : "Copy reply"}</button>}
            {!review.email_sent_at && review.status !== "posted" && review.platform === "bentobox" && <button className="primary-button" disabled={busy || !draft.trim() || !review.reviewer_email || blockedByKitchen} onClick={() => onSendEmail(review, draft)}>Send email</button>}
          </div>
        </div>
      </div>
    </div>
  </article>;
}
