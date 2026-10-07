import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseFetch } from "@/lib/supabase";

const allowed = ["first_name","last_name","email","phone","discount_code","city","state","zip_code","date_arrival","date_received"];
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error:"Unauthorized"}, {status:401});
  const {id} = await params;
  try {
    const data = await request.json();
    const updates: Record<string, unknown> = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(data,key)) updates[key] = data[key];
    if (!Object.keys(updates).length) return NextResponse.json({error:"No editable fields."},{status:400});
    await supabaseFetch(`Leads?id=eq.${encodeURIComponent(id)}`, {method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(updates)});
    return NextResponse.json({ok:true});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Could not update lead."},{status:500}); }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error:"Unauthorized"}, {status:401});
  const {id} = await params;
  try {
    await supabaseFetch(`Leads?id=eq.${encodeURIComponent(id)}`, {method:"DELETE",headers:{Prefer:"return=minimal"}});
    return NextResponse.json({ok:true});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Could not delete lead."},{status:500}); }
}
