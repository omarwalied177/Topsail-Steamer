import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBusinessContext } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await request.json();
    const topic = String(data.topic || "").trim();
    const guidance = String(data.guidance || "").trim();
    if (!topic || !guidance) return NextResponse.json({ error: "Topic and guidance are required." }, { status: 400 });
    const context = await createBusinessContext({ topic, guidance });
    return NextResponse.json({ ok: true, context });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not add business context." }, { status: 500 }); }
}
