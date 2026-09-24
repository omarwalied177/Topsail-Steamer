import { supabaseFetch } from "./supabase";

export type PayrollMonthly = {
  id: string;
  month: string;
  wages_ot: number | null;
  employer_taxes: number | null;
  payroll_fees: number | null;
  manager_allocation?: number | null;
  controllable_labor_cost: number | null;
  revenue: number | null;
  labor_cost_pct: number | null;
  internal_target_pct: number;
  franchise_band_low: number;
  franchise_band_high: number;
  variance_to_target: number | null;
  status?: string | null;
  tips_excluded?: number | null;
  source_file_ref: string | null;
};

export type EmployeeLaborDetail = {
  id: string;
  month: string;
  employee_name: string;
  role: string | null;
  hours: number | null;
  controllable_cost: number | null;
};

export type LaborGrowthPlan = {
  id: string;
  plan_year: number;
  growth_assumption_pct: number;
  projected_monthly_revenue: Record<string, number> | null;
  labor_budget_dollars: Record<string, number> | null;
  team_hours_budget: Record<string, number> | null;
  per_employee_hours_budget: Record<string, any> | null;
  blended_loaded_rate?: number | null;
  hours_mix?: Record<string, number> | null;
};

export async function getPayrollMonthly(): Promise<PayrollMonthly[]> {
  return supabaseFetch<PayrollMonthly[]>("payroll_monthly?select=*&order=month.asc");
}

export async function getEmployeeLaborDetail(): Promise<EmployeeLaborDetail[]> {
  return supabaseFetch<EmployeeLaborDetail[]>("employee_labor_detail?select=*&order=month.asc,employee_name.asc");
}

export async function getLaborGrowthPlans(): Promise<LaborGrowthPlan[]> {
  return supabaseFetch<LaborGrowthPlan[]>("labor_growth_plan?select=*&order=plan_year.desc");
}
