import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReviewReply, updateReviewReply } from "@/lib/supabase";
const GOOGLE_REVIEW_URL = "https://www.google.com/url?q=https://search.google.com/local/writereview?placeid%3D0x88c311f4bad29d81:0xf85d5930343730a0&source=gmail&ust=1791213228198000&sa=E";

function feedbackTone(review: any): "positive" | "mixed" | "negative" {
  const text = String(review.written_feedback || review.review_text || "");
  const negative = /\b(bad|poor|terrible|awful|dirty|unclean|cold|wrong|missing|late|slow|disappointed|disappointing|didn.?t like|did not like|not good|problem|issue|complaint|concern|unhappy|rude|overcooked|undercooked|stale|gross|refund)\b/i.test(text);
  if (negative) return "mixed";
  const ratings = review.category_ratings ? Object.values(review.category_ratings).map(Number).filter(Number.isFinite) : [];
  if (ratings.some((v:any) => v <= 2)) return "negative";
  if (ratings.some((v:any) => v === 3)) return "mixed";
  if (review.rating != null && Number(review.rating) <= 2) return "negative";
  if (review.rating != null && Number(review.rating) >= 4) return "positive";
  return "mixed";
}


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = await request.json();
    const review = await getReviewReply(id);
    const draftReply = String(data.draft_reply || review.draft_reply || "").trim();

    if (review.platform !== "bentobox") {
      return NextResponse.json({ error: "Only BentoBox feedback emails can be sent from this action." }, { status: 400 });
    }
    if (!review.reviewer_email) {
      return NextResponse.json({ error: "This BentoBox review has no diner email address." }, { status: 400 });
    }
    if (!draftReply) {
      return NextResponse.json({ error: "A reply draft is required before sending the email." }, { status: 400 });
    }
    if (/\bkitchen\b/i.test(draftReply)) {
      return NextResponse.json({ error: 'Draft blocked: the word "kitchen" is not allowed for this location.' }, { status: 400 });
    }
    let finalDraft = draftReply;
    if (feedbackTone(review) === "positive" && !finalDraft.includes(GOOGLE_REVIEW_URL)) {
      finalDraft = `${finalDraft.trim()}\n\nIf you have a minute, we’d be grateful if you shared your experience on Google. It really helps other folks on Anna Maria Island find us:\n${GOOGLE_REVIEW_URL}`;
    }

    const webhook = process.env.N8N_REVIEW_MANUAL_SEND_WEBHOOK_URL;
    if (!webhook) {
      return NextResponse.json({
        error: "N8N_REVIEW_MANUAL_SEND_WEBHOOK_URL is not configured. Add the n8n Gmail-send webhook, then try again."
      }, { status: 503 });
    }

    const name = String(review.reviewer_name || "").trim();
    const first = name ? name.split(/\s+/)[0] : "there";
    const subject = String(data.subject || `Thank you for your feedback, ${first}`).trim();

    const upstream = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_bentobox_email",
        reviewId: review.id,
        platform: review.platform,
        review_id: review.review_id,
        to: review.reviewer_email,
        subject,
        body: finalDraft,
        reviewer_name: review.reviewer_name,
        order_number: review.order_number,
        source: review.source || "bentobox_email",
        sent_by: session.user?.email || session.user?.name || "dashboard_user",
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      throw new Error(`n8n email webhook returned ${upstream.status}${detail ? `: ${detail.slice(0, 300)}` : "."}`);
    }

    // The email has already been accepted by n8n at this point.
    // Do NOT change review_replies.status to a custom "emailed" value;
    // that column is constrained by Supabase. Store the send event separately.
    let gmailMessageId: string | null = null;
    try {
      const result = await upstream.clone().json();
      gmailMessageId =
        result?.id ||
        result?.messageId ||
        result?.gmail_message_id ||
        null;
    } catch {
      // The n8n webhook may return a non-JSON response. email_sent_at is still authoritative.
    }

    const updated = await updateReviewReply(id, {
      draft_reply: finalDraft,
      email_sent_at: new Date().toISOString(),
      ...(gmailMessageId ? { email_message_id: gmailMessageId } : {}),
    });

    return NextResponse.json({ ok: true, review: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not send the email." }, { status: 500 });
  }
}
