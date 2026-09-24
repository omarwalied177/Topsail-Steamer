import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVendorMaster } from "@/lib/supabase";
export async function POST(request: Request) {
  const session = await getServerSession(authOptions); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const d=await request.json(); const vendor_name=String(d.vendor_name||"").trim(); if(!vendor_name) return NextResponse.json({error:"Vendor name is required."},{status:400}); const vendor=await createVendorMaster({vendor_name,notes:String(d.notes||"").trim()||null}); return NextResponse.json({ok:true,vendor}); } catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not create vendor."},{status:500});}
}
