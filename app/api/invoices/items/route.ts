import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createItemMaster } from "@/lib/supabase";
export async function POST(request: Request) {
  const session = await getServerSession(authOptions); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const d=await request.json(); const item=String(d.item||"").trim(), category=String(d.category||"").trim(), count_by_unit=String(d.count_by_unit||"").trim(); if(!item||!category||!count_by_unit) return NextResponse.json({error:"Item, category, and canonical unit are required."},{status:400}); const created=await createItemMaster({item,category,count_by_unit,invoice_name_aliases:Array.isArray(d.invoice_name_aliases)?d.invoice_name_aliases:[],conversion_rules:d.conversion_rules||{}}); return NextResponse.json({ok:true,item:created}); } catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not create item."},{status:500});}
}
