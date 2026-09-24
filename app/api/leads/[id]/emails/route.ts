import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateLeadEmail } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();
  const type = data.type === "reminder" ? "reminder" : "welcome";
  const subject = String(data.subject || "").trim();
  const body = String(data.body || "");
  if (!subject || !body) return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });
  try {
    await updateLeadEmail(id, type, subject, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save email." }, { status: 500 });
  }
}
