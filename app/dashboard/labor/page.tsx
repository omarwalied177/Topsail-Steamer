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
        <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--seafoam)", letterSpacing: "0.1em" }}>
          People / Ops
        </p>
        <h2 className="font-display text-3xl" style={{ color: "var(--navy)" }}>
          Labor Cost &amp; Growth Planning
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--navy-light)" }}>
          Homebase payroll + Clover net sales. Tips are excluded from controllable labor cost.
        </p>
      </div>
      <LaborCostOperations monthly={monthly} employees={employees} plans={plans} />
    </div>
  );
}
