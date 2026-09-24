import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateInvoiceReview } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();
  const action = data.action === "matched" || data.action === "excluded" ? data.action : null;
  if (!action) return NextResponse.json({ error: "action must be matched or excluded." }, { status: 400 });
  try {
    await updateInvoiceReview(id, action === "matched" ? "matched" : "no_match", session.user?.email || "dashboard_user");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not update invoice row." }, { status: 500 });
  }
}
