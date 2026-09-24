import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateBusinessContext } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const data = await request.json();
    const topic = String(data.topic || "").trim();
    const guidance = String(data.guidance || "").trim();
    if (!topic || !guidance) return NextResponse.json({ error: "Topic and guidance are required." }, { status: 400 });
    const context = await updateBusinessContext(id, topic, guidance);
    return NextResponse.json({ ok: true, context });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not update business context." }, { status: 500 }); }
}
