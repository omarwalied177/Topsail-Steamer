import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLeads, updateDiscountCode } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const leads = await getLeads();
    return NextResponse.json({ code: leads.find((lead) => lead.discount_code)?.discount_code || "" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load discount code." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await request.json();
    const code = String(data.code || "").trim();
    if (!code) return NextResponse.json({ error: "Discount code is required." }, { status: 400 });
    await updateDiscountCode(code);
    return NextResponse.json({ ok: true, code });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save discount code." }, { status: 500 });
  }
}
