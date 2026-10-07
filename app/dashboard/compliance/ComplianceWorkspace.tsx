"use client";
import { useMemo, useState } from "react";

type Royalty = { id:string; week_of:string; week_end:string; gross_revenue:number|null; royalty_pct:number; brand_fund_pct:number; royalty_fee_due:number; brand_fund_due:number; technology_fee_due:number; digital_spend:number|null; credits:number|null; total_due:number; billed:boolean; paid:boolean; report_status:string; approved_by:string|null; submitted_at:string|null; ach_confirmed_amount:number|null; variance_flag:boolean; notes:string|null };
type Credit = { id:string; platform:string; period_month:string; gross_sales:number|null; commissions_fees:number|null; net_revenue_received:number|null; marketing_spend:number|null; amendments:number|null; credit_pct:number|null; royalty_credit_requested:number|null; no_activity:boolean; extraction_confidence:string|null; extraction_notes:string|null; statement_file_ref:string|null; form_file_ref:string|null; due_date:string|null; status:string; confirmed_at:string|null; posted_to_week:string|null; email_draft_id:string|null };
type WebhookSpec = {
  name:string;
  path:string;
  purpose:string;
  payload:string;
  action:string;
};
const WEBHOOKS:WebhookSpec[] = [
  {name:"Weekly Run",path:"topsail/automation5/weekly-run",purpose:"Build the weekly royalty draft from Clover + credits.",payload:"week_of? · gross_revenue_override? · requested_by?",action:"Run weekly"},
  {name:"Weekly Submit",path:"topsail/automation5/weekly-submit",purpose:"Generate the franchisor CSV and send the approved report.",payload:"id · approved_by?",action:"Approve & submit"},
  {name:"Statement Upload",path:"topsail/automation5/third-party-upload",purpose:"Upload DoorDash/Uber Eats/Other statements and process them.",payload:"period_month · binary: doordash / ubereats / other",action:"Open upload"},
  {name:"Regenerate",path:"topsail/automation5/third-party-generate",purpose:"Rebuild the form + Gmail draft for an existing month.",payload:"period_month",action:"Regenerate"},
  {name:"Confirm Credit",path:"topsail/automation5/third-party-confirm",purpose:"Confirm the monthly credit and post it to the correct royalty week when allowed.",payload:"period_month · applied_on? · confirmed_by?",action:"Confirm"},
];

const money=(n:number|null|undefined)=>n==null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(Number(n));
const date=(s:string)=>new Date(s+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const month=(s:string)=>new Date(s+"T00:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});
const status=(s:string)=>s.replaceAll("_"," ");

export default function ComplianceWorkspace({initialRoyalties,initialCredits}:{initialRoyalties:Royalty[];initialCredits:Credit[]}){
 const [royalties,setRoyalties]=useState(initialRoyalties),[credits,setCredits]=useState(initialCredits),[tab,setTab]=useState<"weekly"|"credit">("weekly"),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[week,setWeek]=useState(""),[revenueOverride,setRevenueOverride]=useState(""),[monthValue,setMonthValue]=useState(""),[showReportingMonth,setShowReportingMonth]=useState(false),[file,setFile]=useState<File|null>(null),[platform,setPlatform]=useState("doordash"),[appliedOn,setAppliedOn]=useState("");
 const latest=royalties[0];
 const openDrafts=royalties.filter(r=>["draft","generated"].includes(r.report_status));
 const reviewCredits=credits.filter(c=>c.status==="needs_review");
 const currentCredit=credits.find(c=>c.period_month===monthValue+"-01" && c.platform===platform);
 const run=async(path:string,body?:any)=>{setBusy(true);setMessage("");try{const r=await fetch("/api/automation5",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path,body})});const j=await r.json();if(!r.ok)throw new Error(j.error||j.message||j.errorMessage||`Automation request failed (HTTP ${r.status})`);setMessage(j.message||"Automation completed.");location.reload();}catch(e){setMessage(e instanceof Error?e.message:"Request failed")}finally{setBusy(false)}};
 const copyWebhookPath=async(path:string)=>{try{await navigator.clipboard.writeText(path);setMessage(`Copied ${path}`)}catch{setMessage(path)}};
 const triggerWebhook=async(spec:WebhookSpec)=>{
   if(spec.name==="Weekly Run"){await run(spec.path,{week_of:week||undefined,gross_revenue_override:revenueOverride===""?undefined:Number(revenueOverride),requested_by:"dashboard"});return;}
   if(spec.name==="Weekly Submit"){
     if(!latest){setMessage("No weekly report is available to submit.");return;}
     await run(spec.path,{id:latest.id,approved_by:"dashboard"});return;
   }
   if(spec.name==="Statement Upload"){setTab("credit");setMessage("Use the Monthly Delivery Credit upload form below to send the statement webhook.");return;}
   if(spec.name==="Regenerate"){
     if(!currentCredit){setMessage("Select a reporting month/platform with an existing credit row first.");return;}
     await run(spec.path,{period_month:monthValue});return;
   }
   if(spec.name==="Confirm Credit"){
     if(!currentCredit){setMessage("Select a reporting month/platform with an existing credit row first.");return;}
     await run(spec.path,{period_month:monthValue,applied_on:appliedOn||undefined,confirmed_by:"dashboard"});return;
   }
 };

 const upload=async()=>{if(!file)return;setBusy(true);setMessage("");try{const fd=new FormData();fd.append("path","topsail/automation5/third-party-upload");fd.append("period_month",monthValue);fd.append("platform",platform);fd.append(platform,file);const r=await fetch("/api/automation5",{method:"POST",body:fd});const j=await r.json();if(!r.ok)throw new Error(j.error||j.message||j.errorMessage||`Upload failed (HTTP ${r.status})`);setMessage(j.message||"Statement uploaded and processed.");location.reload()}catch(e){setMessage(e instanceof Error?e.message:"Upload failed")}finally{setBusy(false)}};
 return <div className="compliance-page">
  <div className="page-heading"><h2>Royalty & Delivery</h2></div>
  <div className="compliance-tabs"><button className={tab==="weekly"?"active":""} onClick={()=>setTab("weekly")}>Weekly Royalty</button><button className={tab==="credit"?"active":""} onClick={()=>setTab("credit")}>Monthly Delivery Credit</button></div>
  {message&&<div className="compliance-message">{message}</div>}
  {tab==="weekly"?<>
   <section className="weekly-run-card card">
    <div className="weekly-run-top">
      <div>
        <span className="eyebrow">WEEKLY ROYALTY RUN</span>
        <h3>Prepare the weekly report</h3>
      </div>
      <div className="weekly-run-status">
        <span>Current week</span>
        <strong>{latest?`${date(latest.week_of)} – ${date(latest.week_end)}`:"No report yet"}</strong>
        <small>{latest?.report_status?status(latest.report_status):"Ready to run"}</small>
      </div>
    </div>
    <div className="weekly-run-controls">
      <label>
        <span>Reporting week</span>
        <input type="date" value={week} onChange={e=>setWeek(e.target.value)} />
      </label>
      <label>
        <span>Gross revenue override <em>optional</em></span>
        <input type="number" min="0" step="0.01" placeholder="Leave blank to use Clover" value={revenueOverride} onChange={e=>setRevenueOverride(e.target.value)} />
      </label>
      <button className="primary-button weekly-run-button" disabled={busy} onClick={()=>run("topsail/automation5/weekly-run",{week_of:week||undefined,gross_revenue_override:revenueOverride===""?undefined:Number(revenueOverride),requested_by:"dashboard"})}>
        {busy?"Running…":"Run weekly report"}
      </button>
    </div>
    <div className="weekly-run-footer">
      <div><span>Royalty due</span><strong>{money(latest?.total_due)}</strong></div>
      <div><span>Report status</span><strong>{latest?.report_status?status(latest.report_status):"No report"}</strong></div>
    </div>
   </section>
   {latest&&<section className="royalty-breakdown card"><div className="section-head"><div><h3>Report for week of {date(latest.week_of)}</h3><span className={`state-pill state-${latest.report_status}`}>{status(latest.report_status)}</span></div><div className="royalty-head-actions">{latest.report_status==="draft"||latest.report_status==="generated"?<button className="primary-button" disabled={busy} onClick={()=>run("topsail/automation5/weekly-submit",{id:latest.id,approved_by:"dashboard"})}>Approve & submit</button>:null}</div></div><div className="breakdown-grid"><div><span>Gross revenue</span><b>{money(latest.gross_revenue)}</b></div><div><span>Royalty · {latest.royalty_pct}%</span><b>{money(latest.royalty_fee_due)}</b></div><div><span>Brand fund · {latest.brand_fund_pct}%</span><b>{money(latest.brand_fund_due)}</b></div><div><span>Technology fee</span><b>{money(latest.technology_fee_due)}</b></div><div><span>Digital spend</span><b>{money(latest.digital_spend)}</b></div><div><span>Credits</span><b>{money(latest.credits)}</b></div><div className="total"><span>Total due</span><b>{money(latest.total_due)}</b></div></div>{latest.variance_flag&&<div className="warning-box">ACH variance flagged — review the confirmed amount before closing.</div>}</section>}
   <section className="table-card card"><div className="section-head"><div><h3>Weekly royalty history</h3></div><span>{openDrafts.length} draft{openDrafts.length===1?"":"s"}</span></div><div className="table-shell"><table><thead><tr><th>Week</th><th>Gross revenue</th><th>Royalty</th><th>Brand fund</th><th>Credits</th><th>Total due</th><th>Status</th></tr></thead><tbody>{royalties.map(r=><tr key={r.id}><td>{date(r.week_of)} – {date(r.week_end)}</td><td>{money(r.gross_revenue)}</td><td>{money(r.royalty_fee_due)}</td><td>{money(r.brand_fund_due)}</td><td>{money(r.credits)}</td><td><b>{money(r.total_due)}</b></td><td><span className={`state-pill state-${r.report_status}`}>{status(r.report_status)}</span></td></tr>)}</tbody></table></div></section>
  </>:<>
   <section className="credit-upload card"><div className="section-head"><div><h3>Monthly delivery statement</h3></div><span className="credit-rate">7% credit rate</span></div><div className="upload-grid"><label>Reporting month<input type="month" value={monthValue} onChange={e=>{setMonthValue(e.target.value);setShowReportingMonth(false)}}/></label><label>Platform<select value={platform} onChange={e=>{setPlatform(e.target.value);setShowReportingMonth(false)}}><option value="doordash">DoorDash</option><option value="ubereats">Uber Eats</option><option value="other">Other</option></select></label><label className="file-field">Statement PDF<input type="file" accept="application/pdf,image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="secondary-button upload-button" disabled={busy||!monthValue} onClick={()=>{if(!currentCredit){setMessage("No reporting month record found for the selected month and platform.");return;}setShowReportingMonth(true)}}>Show reporting month</button><button className="primary-button upload-button" disabled={busy||!file||!monthValue} onClick={upload}>{busy?"Processing…":"Upload & process"}</button></div></section>
   {currentCredit&&showReportingMonth&&<section className="credit-detail card"><div className="section-head"><div><h3>{month(currentCredit.period_month)} · {currentCredit.platform}</h3><span className={`state-pill state-${currentCredit.status}`}>{status(currentCredit.status)}</span></div><div className="credit-total">{money(currentCredit.royalty_credit_requested)} <small>requested credit</small></div></div><div className="credit-metrics"><div><span>Gross sales</span><b>{money(currentCredit.gross_sales)}</b></div><div><span>Commission & fees</span><b>{money(currentCredit.commissions_fees)}</b></div><div><span>Net revenue received</span><b>{money(currentCredit.net_revenue_received)}</b></div><div><span>Credit</span><b>{money(currentCredit.royalty_credit_requested)}</b></div></div>{currentCredit.extraction_notes&&<p className="notes">{currentCredit.extraction_notes}</p>}<div className="credit-actions">{currentCredit&&<button className="secondary-button" disabled={busy} onClick={()=>run("topsail/automation5/third-party-generate",{period_month:monthValue})}>Regenerate form & draft</button>}{["draft_created","form_generated"].includes(currentCredit.status)&&<><input type="date" value={appliedOn} onChange={e=>setAppliedOn(e.target.value)}/><button className="primary-button" disabled={busy} onClick={()=>run("topsail/automation5/third-party-confirm",{period_month:monthValue,applied_on:appliedOn||undefined,confirmed_by:"dashboard"})}>Mark confirmed</button></>}</div></section>}
   <section className="table-card card"><div className="section-head"><div><h3>Delivery credit history</h3></div><span>{reviewCredits.length} need review</span></div><div className="table-shell"><table><thead><tr><th>Month</th><th>Platform</th><th>Commission & fees</th><th>Credit</th><th>Due</th><th>Status</th><th>Posted week</th></tr></thead><tbody>{credits.map(c=><tr key={c.id}><td>{month(c.period_month)}</td><td>{c.platform}</td><td>{money(c.commissions_fees)}</td><td><b>{money(c.royalty_credit_requested)}</b></td><td>{c.due_date?date(c.due_date):"—"}</td><td><span className={`state-pill state-${c.status}`}>{status(c.status)}</span></td><td>{c.posted_to_week?date(c.posted_to_week):"—"}</td></tr>)}</tbody></table></div></section>
  </>}
 </div>
}
