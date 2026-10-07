import { NextRequest, NextResponse } from "next/server";
// Automation 5 n8n endpoint configuration.
// Prefer the current N8N_AUTOMATION5_N8N_URL variable (host only),
// while keeping N8N_AUTOMATION5_BASE_URL compatible with older builds.
const BASE = () => {
  const raw = String(
    process.env.N8N_AUTOMATION5_N8N_URL ||
    process.env.N8N_AUTOMATION5_BASE_URL ||
    ""
  ).trim().replace(/\/$/, "");

  if (!raw) return "";

  // If a full /webhook base was supplied, keep it.
  // Otherwise n8n production webhooks live under /webhook.
  return /\/webhook$/i.test(raw) ? raw : `${raw}/webhook`;
};

const SECRET = process.env.N8N_WEBHOOK_SHARED_SECRET;
export async function POST(req:NextRequest){
 try{
  const contentType=req.headers.get("content-type")||"";
  let path="", body:any=null, headers:any={"x-topsail-secret":SECRET||""};
  if(contentType.includes("multipart/form-data")){const fd=await req.formData();path=String(fd.get("path")||"");const out=new FormData();for(const [k,v] of fd.entries())if(k!=="path")out.append(k,v as any);body=out;headers={"x-topsail-secret":SECRET||""};}
  else {const j=await req.json();path=String(j.path||"");body=j.body||{};headers={"Content-Type":"application/json","x-topsail-secret":SECRET||""};}
  if(!path||!BASE())return NextResponse.json({error:"Automation 5 n8n URL is not configured."},{status:500});
  const r=await fetch(`${BASE()}/${path}`,{method:"POST",headers,body:body instanceof FormData?body:JSON.stringify(body)});
  const text=await r.text();
  let data:any;
  try { data=JSON.parse(text); } catch { data={message:text}; }
  if (!r.ok) {
    const detail = data?.error?.message || data?.message || data?.errorMessage || data?.error || text || `n8n returned HTTP ${r.status}`;
    return NextResponse.json({
      error: String(detail),
      upstream_status: r.status,
      upstream: data,
    }, { status: r.status });
  }
  return NextResponse.json(data,{status:r.status});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Automation 5 request failed"},{status:500})}
}
