import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseFetch } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type InventoryRow = {
  id: string;
  month: string;
  item_name: string;
  category: string;
  starting_qty: number | null;
  purchased_qty: number | null;
  starting_cost: number | null;
  purchased_cost: number | null;
  unit_cost: number | null;
  ending_qty: number | null;
  ending_cost: number | null;
  needs_review: boolean;
  review_note: string | null;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const year = Number(body.year);
    const monthNumber = Number(body.month);
    const item_name = String(body.item_name || "").trim();
    const category = String(body.category || "").trim();
    const field = body.field;
    const quantity = Number(body.quantity);

    if (!Number.isInteger(year) || year < 2000 || year > 2100 ||
        !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12 ||
        !item_name || !category ||
        !["starting_qty", "purchased_qty"].includes(field) ||
        !Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json({ error: "Provide a valid month, item, field, and non-negative quantity." }, { status: 400 });
    }

    const month = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
    const existing = await supabaseFetch<InventoryRow[]>(
      `monthly_food_cost?select=*&month=eq.${encodeURIComponent(month)}&item_name=eq.${encodeURIComponent(item_name)}&limit=1`
    );

    if (existing.length) {
      const current = existing[0];
      const patch: Record<string, unknown> = {
        [field]: quantity,
        updated_at: new Date().toISOString(),
      };
      if (field === "starting_qty" && current.starting_cost == null && current.unit_cost != null) {
        patch.starting_cost = quantity * Number(current.unit_cost);
      }
      if (field === "purchased_qty" && current.purchased_cost == null && current.unit_cost != null) {
        patch.purchased_cost = quantity * Number(current.unit_cost);
      }
      await supabaseFetch(
        `monthly_food_cost?id=eq.${encodeURIComponent(current.id)}`,
        { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) }
      );
    } else {
      const insert: Record<string, unknown> = {
        month, item_name, category,
        starting_qty: field === "starting_qty" ? quantity : null,
        purchased_qty: field === "purchased_qty" ? quantity : null,
        starting_cost: null,
        purchased_cost: null,
        unit_cost: null,
        ending_qty: null,
        ending_cost: null,
        needs_review: true,
        review_note: "Inventory quantity entered manually; costs and ending count still need validation.",
        updated_at: new Date().toISOString(),
      };
      await supabaseFetch("monthly_food_cost", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(insert),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save inventory quantity." },
      { status: 500 }
    );
  }
}
