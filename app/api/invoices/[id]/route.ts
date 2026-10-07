import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseFetch, updateInvoiceReview } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const data = await request.json();
    if (data.action === "matched" || data.action === "excluded") {
      await updateInvoiceReview(id, data.action, session.user?.email || "dashboard_user");
      return NextResponse.json({ ok: true });
    }
    const allowed = ["invoice_date", "vendor", "item", "category", "count_by", "quantity", "unit_cost", "total_cost", "invoice_number", "notes"];
    const updates: Record<string, unknown> = {};
    for (const field of allowed) if (Object.prototype.hasOwnProperty.call(data, field)) updates[field] = data[field];
    if (!Object.keys(updates).length) return NextResponse.json({ error: "No editable fields provided." }, { status: 400 });
    if (updates.invoice_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(updates.invoice_date))) return NextResponse.json({ error: "Invoice date must use YYYY-MM-DD." }, { status: 400 });
    if (typeof updates.invoice_date === "string") updates.month = Number(updates.invoice_date.slice(5, 7));
    for (const field of ["quantity", "unit_cost", "total_cost"]) if (updates[field] !== null && updates[field] !== undefined && (typeof updates[field] !== "number" || !Number.isFinite(updates[field] as number))) return NextResponse.json({ error: `${field} must be a valid number.` }, { status: 400 });
    await supabaseFetch(`vendor_invoice_log?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(updates) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not update invoice row." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await supabaseFetch(`vendor_invoice_log?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not delete invoice row." }, { status: 500 });
  }
}
