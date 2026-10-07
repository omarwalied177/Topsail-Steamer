import { LaborCostOperations } from "@/components/LaborCostOperations";
import { getEmployeeLaborDetail, getLaborGrowthPlans, getPayrollMonthly } from "@/lib/automation4";

export const dynamic = "force-dynamic";

export default async function LaborDashboardPage() {
  const [monthly, employees, plans] = await Promise.all([
    getPayrollMonthly().catch(() => []),
    getEmployeeLaborDetail().catch(() => []),
    getLaborGrowthPlans().catch(() => []),
  ]);

  return (
    <div>
      <div className="mb-7">
        <h2 className="font-display text-3xl" style={{ color: "var(--navy)" }}>
          Labor Cost &amp; Growth Planning
        </h2>
      </div>
      <LaborCostOperations monthly={monthly} employees={employees} plans={plans} />
    </div>
  );
}
