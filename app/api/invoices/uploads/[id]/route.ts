import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseFetch } from "@/lib/supabase";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const rows = await supabaseFetch<Array<{ id: string; source_storage_path: string; source_storage_bucket: string | null }>>(
      `invoice_source_uploads?select=id,source_storage_path,source_storage_bucket&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Uploaded file not found." }, { status: 404 });
    const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!base || !key) return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
    const bucket = row.source_storage_bucket || process.env.SUPABASE_INVOICE_BUCKET || "invoice-source-files";
    if (row.source_storage_path) {
      const removed = await fetch(`${base}/storage/v1/object/${encodeURIComponent(bucket)}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [row.source_storage_path] }), cache: "no-store"
      });
      if (!removed.ok && removed.status !== 404) return NextResponse.json({ error: `Could not delete stored file: ${await removed.text()}` }, { status: 502 });
    }
    await supabaseFetch(`invoice_source_uploads?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete uploaded file." }, { status: 500 });
  }
}
