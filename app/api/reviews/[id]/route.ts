import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateReviewReply } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const data = await request.json();
    const action = data.action;
    if (action === "approve" && !String(data.draft_reply || "").trim()) return NextResponse.json({ error: "A reply draft is required before approval." }, { status: 400 });
    if (action === "approve_manual" && !String(data.draft_reply || "").trim()) return NextResponse.json({ error: "A reply draft is required before marking it ready." }, { status: 400 });
    const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "approve_manual" ? "manual_paste_ready" : undefined;
    const review = await updateReviewReply(id, {
      ...(data.draft_reply !== undefined ? { draft_reply: String(data.draft_reply) } : {}),
      ...(status ? { status } : {}),
      ...(status === "approved" ? { approved_by: session.user?.email || session.user?.name || "dashboard_user" } : {}),
    });
    return NextResponse.json({ ok: true, review });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not update review." }, { status: 500 });
  }
}
