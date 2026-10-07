import { supabaseFetch } from "@/lib/supabase";
import ComplianceWorkspace from "./ComplianceWorkspace";

export const dynamic = "force-dynamic";

type Royalty = { id:string; week_of:string; week_end:string; gross_revenue:number|null; royalty_pct:number; brand_fund_pct:number; royalty_fee_due:number; brand_fund_due:number; technology_fee_due:number; digital_spend:number|null; credits:number|null; total_due:number; billed:boolean; paid:boolean; report_status:string; approved_by:string|null; submitted_at:string|null; ach_confirmed_amount:number|null; variance_flag:boolean; notes:string|null };
type Credit = { id:string; platform:string; period_month:string; gross_sales:number|null; commissions_fees:number|null; net_revenue_received:number|null; marketing_spend:number|null; amendments:number|null; credit_pct:number|null; royalty_credit_requested:number|null; no_activity:boolean; extraction_confidence:string|null; extraction_notes:string|null; statement_file_ref:string|null; form_file_ref:string|null; due_date:string|null; status:string; confirmed_at:string|null; posted_to_week:string|null; email_draft_id:string|null };

export default async function CompliancePage(){
  const [royalties, credits] = await Promise.all([
    supabaseFetch<Royalty[]>("royalty_reports?select=*&order=week_of.desc&limit=26"),
    supabaseFetch<Credit[]>("third_party_royalty_credit?select=*&order=period_month.desc,platform.asc&limit=36")
  ]);
  return <ComplianceWorkspace initialRoyalties={royalties} initialCredits={credits}/>;
}
