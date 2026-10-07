import { SetupNeeded } from "@/components/SetupNeeded";
import { getItemMaster } from "@/lib/supabase";
import { getFoodCostSummary, getIngredientForecast, getMonthlyFoodCost, getSalesInventoryCheck, getVendorOrderPlan } from "@/lib/automation3";
import { InventoryForecast } from "@/components/InventoryForecast";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  let error: string | null = null;
  let items: Awaited<ReturnType<typeof getItemMaster>> = [];
  let monthly: Awaited<ReturnType<typeof getMonthlyFoodCost>> = [];
  let summaries: Awaited<ReturnType<typeof getFoodCostSummary>> = [];
  let forecasts: Awaited<ReturnType<typeof getIngredientForecast>> = [];
  let orderPlan: Awaited<ReturnType<typeof getVendorOrderPlan>> = [];
  let reconciliation: Awaited<ReturnType<typeof getSalesInventoryCheck>> = [];

  try {
    [items, monthly, summaries, forecasts, orderPlan, reconciliation] = await Promise.all([
      getItemMaster(),
      getMonthlyFoodCost(),
      getFoodCostSummary(),
      getIngredientForecast(),
      getVendorOrderPlan(),
      getSalesInventoryCheck(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load inventory data.";
  }

  return <div>
    <div className="page-heading inventory-heading">
      <div>
        <h2 className="font-display" style={{ color: "var(--navy)" }}>Inventory & Forecast</h2>
      </div>
      
    </div>
    {error ? <SetupNeeded message={error} /> : <InventoryForecast items={items} monthly={monthly} summaries={summaries} forecasts={forecasts} orderPlan={orderPlan} reconciliation={reconciliation} />}
  </div>;
}
