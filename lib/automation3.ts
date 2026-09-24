import { supabaseFetch } from "./supabase";

export type MonthlyFoodCost = {
  id: string;
  month: string;
  item_name: string;
  category: string;
  starting_qty: number | null;
  starting_cost: number | null;
  purchased_qty: number | null;
  purchased_cost: number | null;
  unit_cost: number | null;
  ending_qty: number | null;
  ending_cost: number | null;
  needs_review: boolean;
  review_note: string | null;
};

export type FoodCostSummary = {
  id: string;
  month: string;
  category: string;
  starting_cost: number;
  purchased_cost: number;
  ending_cost: number;
  food_cost: number;
  sales: number | null;
  food_cost_pct: number | null;
  goal_pct: number;
  franchise_confirmed: boolean;
  food_cost_pct_eligible?: boolean;
  status: string;
};

export type IngredientForecast = {
  id: string;
  week_of: string;
  ingredient: string;
  prior_year_qty: number | null;
  growth_rate_pct: number | null;
  forecast_qty: number | null;
  forecast_cost: number | null;
  unit: string | null;
};

export type SalesInventoryCheck = {
  id: string;
  year: number;
  month: number;
  ingredient: string;
  theoretical_usage: number | null;
  actual_usage: number | null;
  variance_qty: number | null;
  variance_pct: number | null;
  variance_dollars: number | null;
  flag: "ok" | "needs_review" | string;
  note: string | null;
};

export type VendorOrderPlan = {
  id: string;
  week_of: string;
  vendor: string;
  ingredient: string;
  unit: string | null;
  unit_cost: number | null;
  projected_qty: number | null;
  projected_spend: number | null;
  vendor_minimum: number | null;
  vendor_minimum_unit: string;
  meets_minimum: boolean | null;
};

export async function getMonthlyFoodCost(month?: string): Promise<MonthlyFoodCost[]> {
  const filter = month ? `&month=gte.${encodeURIComponent(month + "-01")}&month=lt.${encodeURIComponent(nextMonth(month))}` : "";
  return supabaseFetch<MonthlyFoodCost[]>(`monthly_food_cost?select=*&order=category.asc,item_name.asc${filter}`);
}

export async function getFoodCostSummary(month?: string): Promise<FoodCostSummary[]> {
  const filter = month ? `&month=eq.${encodeURIComponent(month + "-01")}` : "";
  return supabaseFetch<FoodCostSummary[]>(`food_cost_summary?select=*&order=category.asc${filter}`);
}

export async function getIngredientForecast(weekOf?: string): Promise<IngredientForecast[]> {
  const filter = weekOf ? `&week_of=eq.${encodeURIComponent(weekOf)}` : "";
  return supabaseFetch<IngredientForecast[]>(`ingredient_forecast?select=*&order=ingredient.asc${filter}`);
}

export async function getSalesInventoryCheck(month?: string): Promise<SalesInventoryCheck[]> {
  const filter = month
    ? `&year=eq.${encodeURIComponent(month.slice(0, 4))}&month=eq.${encodeURIComponent(Number(month.slice(5, 7)))}`
    : "";
  return supabaseFetch<SalesInventoryCheck[]>(`sales_to_inventory_check?select=*&order=year.desc,month.desc,ingredient.asc${filter}`);
}

export async function getVendorOrderPlan(weekOf?: string): Promise<VendorOrderPlan[]> {
  const filter = weekOf ? `&week_of=eq.${encodeURIComponent(weekOf)}` : "";
  return supabaseFetch<VendorOrderPlan[]>(`vendor_order_plan?select=*&order=vendor.asc,ingredient.asc${filter}`);
}

function nextMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m, 1));
  return d.toISOString().slice(0, 7) + "-01";
}

export async function upsertMonthlyInventory(input: {
  month: string;
  item_name: string;
  category: string;
  ending_qty: number;
  ending_cost?: number;
  needs_review?: boolean;
  review_note?: string | null;
}) {
  const monthKey = input.month + "-01";
  const existing = await supabaseFetch<MonthlyFoodCost[]>(
    `monthly_food_cost?select=*&month=eq.${encodeURIComponent(monthKey)}&item_name=eq.${encodeURIComponent(input.item_name)}&limit=1`
  );
  const current = existing[0];
  const derivedEndingCost = input.ending_cost ?? (current?.unit_cost != null ? input.ending_qty * Number(current.unit_cost) : null);
  const rows = await supabaseFetch<MonthlyFoodCost[]>(
    "monthly_food_cost?on_conflict=month,item_name",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        month: monthKey,
        item_name: input.item_name,
        category: input.category,
        ending_qty: input.ending_qty,
        ending_cost: derivedEndingCost,
        needs_review: input.needs_review ?? false,
        review_note: input.review_note ?? null,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  return rows[0];
}
