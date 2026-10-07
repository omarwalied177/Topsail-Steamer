import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseFetch } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const rows = await supabaseFetch<Array<{ source_storage_path: string; source_storage_bucket: string | null }>>(
      `invoice_source_uploads?select=source_storage_path,source_storage_bucket&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    const row = rows[0];
    if (!row?.source_storage_path) return NextResponse.json({ error: "Uploaded source file was not found." }, { status: 404 });
    const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!base || !key) return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
    const bucket = row.source_storage_bucket || process.env.SUPABASE_INVOICE_BUCKET || "invoice-source-files";
    const signed = await fetch(`${base}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${row.source_storage_path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 300 }), cache: "no-store"
    });
    if (!signed.ok) return NextResponse.json({ error: await signed.text() }, { status: 502 });
    const data = await signed.json() as { signedURL?: string; signedUrl?: string };
    const signedPath = data.signedURL || data.signedUrl;
    if (!signedPath) return NextResponse.json({ error: "Storage did not return a signed URL." }, { status: 502 });
    return NextResponse.redirect(signedPath.startsWith("http") ? signedPath : `${base}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not open uploaded source." }, { status: 500 });
  }
}
