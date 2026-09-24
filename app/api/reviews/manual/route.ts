import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createReviewReply, getReviewReply } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await request.json();
    const reviewText = String(data.review_text || "").trim();
    if (!reviewText) return NextResponse.json({ error: "Review text is required." }, { status: 400 });
    const generateDraft = Boolean(data.generateDraft);
    const webhook = process.env.N8N_REVIEW_MANUAL_WEBHOOK_URL;
    if (generateDraft && !webhook) return NextResponse.json({ error: "N8N_REVIEW_MANUAL_WEBHOOK_URL is not configured. Use manual reply or configure the n8n webhook first." }, { status: 503 });
    const review = await createReviewReply({
      platform: "bentobox",
      review_id: `bentobox-${crypto.randomUUID()}`,
      review_text: reviewText,
      reviewer_name: String(data.reviewer_name || "BentoBox customer").trim(),
      rating: data.rating == null || data.rating === "" ? null : Number(data.rating),
      review_posted_at: new Date().toISOString(),
      draft_reply: null,
      status: generateDraft ? "pending" : "manual_paste_ready",
    });

    if (generateDraft && webhook) {
      const upstream = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id, platform: "bentobox", review_id: review.review_id, review_text: review.review_text, reviewer_name: review.reviewer_name, rating: review.rating, review_posted_at: review.review_posted_at }),
      });
      if (!upstream.ok) throw new Error(`n8n manual review webhook returned ${upstream.status}.`);
    }

    const latest = generateDraft ? await getReviewReply(review.id) : review;
    return NextResponse.json({ ok: true, review: latest });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save BentoBox review." }, { status: 500 }); }
}
