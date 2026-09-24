import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    const month = String(data.month || "").trim();
    const item_name = String(data.item_name || "").trim();
    const category = String(data.category || "").trim();
    const ending_qty = Number(data.ending_qty);

    if (!/^\d{4}-\d{2}$/.test(month) || !item_name || !category || !Number.isFinite(ending_qty) || ending_qty < 0) {
      return NextResponse.json({ error: "Month, item, category, and a non-negative physical quantity are required." }, { status: 400 });
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const url = process.env.N8N_AUTOMATION3_ENDING_INVENTORY_WEBHOOK_URL;
    if (!url) return NextResponse.json({ error: "Ending Inventory n8n webhook is not configured." }, { status: 500 });

    const n8nResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month: monthNumber, item_name, category, ending_qty, requested_from: "topsail-dashboard" }),
      cache: "no-store",
    });

    const text = await n8nResponse.text();
    let result: unknown = null;
    try { result = text ? JSON.parse(text) : null; } catch { result = text; }

    if (!n8nResponse.ok) {
      return NextResponse.json(
        { error: typeof result === "string" && result ? result : `n8n returned HTTP ${n8nResponse.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, row: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save ending inventory." }, { status: 500 });
  }
}
