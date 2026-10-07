import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseFetch } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const uploads = await supabaseFetch<Array<{ id: string; source_file_name: string; source_storage_path: string; source_storage_bucket: string; status: string; invoice_number: string | null; uploaded_at: string; error_message: string | null }>>(
      "invoice_source_uploads?select=id,source_file_name,source_storage_path,source_storage_bucket,status,invoice_number,uploaded_at,error_message&order=uploaded_at.desc&limit=100"
    );
    return NextResponse.json({ uploads });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load uploaded invoice files." }, { status: 500 });
  }
}
