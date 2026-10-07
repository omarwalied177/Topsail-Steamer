import { NextResponse } from "next/server";
import { randomUUID, createHash } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseFetch } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const webhook = process.env.N8N_INVOICE_UPLOAD_WEBHOOK_URL;
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secret = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_INVOICE_BUCKET || "invoice-source-files";
  if (!webhook) return NextResponse.json({ error: "N8N_INVOICE_UPLOAD_WEBHOOK_URL is not configured." }, { status: 503 });
  if (!supabaseUrl || !secret) return NextResponse.json({ error: "Supabase storage credentials are not configured." }, { status: 503 });

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a PDF or image file." }, { status: 400 });
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type.includes("pdf") || lowerName.endsWith(".pdf");
  const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic|heif|tif|tiff)$/.test(lowerName);
  if (!isPdf && !isImage) return NextResponse.json({ error: "Only PDF, JPG, JPEG, PNG, WEBP, HEIC/HEIF, or TIFF files are supported." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "File is larger than the 15 MB upload limit." }, { status: 400 });

  const fileBytes = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(fileBytes).digest("hex");
  try {
    const duplicates = await supabaseFetch<Array<{ id: string; source_file_name: string; status: string }>>(
      `invoice_source_uploads?select=id,source_file_name,status&source_file_hash=eq.${fileHash}&limit=1`
    );
    if (duplicates.length) return NextResponse.json({ error: `This exact file was already uploaded as “${duplicates[0].source_file_name}” (status: ${duplicates[0].status}). Duplicate upload blocked.`, duplicate: true, existing_upload_id: duplicates[0].id }, { status: 409 });
  } catch (error) {
    return NextResponse.json({ error: `Duplicate protection is not ready. Apply the invoice upload hash migration before uploading. ${error instanceof Error ? error.message : ""}` }, { status: 503 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${storagePath.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": file.type || (isPdf ? "application/pdf" : "application/octet-stream"), "x-upsert": "false" },
    body: fileBytes,
  });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    return NextResponse.json({ error: `Could not save invoice to Supabase Storage: ${detail}` }, { status: 502 });
  }

  let uploadRecordId = "";
  try {
    const rows = await supabaseFetch<Array<{ id: string }>>("invoice_source_uploads", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ source_file_name: file.name, source_file_hash: fileHash, source_storage_path: storagePath, source_storage_bucket: bucket, status: "processing", uploaded_by: session.user?.email || "dashboard_user" }),
    });
    uploadRecordId = rows[0]?.id || "";
    if (!uploadRecordId) throw new Error("Supabase did not return the created upload ID.");
  } catch (error) {
    return NextResponse.json({ error: `File was saved in Storage, but its upload record could not be created. Run the invoice_source_uploads SQL migration first. ${error instanceof Error ? error.message : ""}`, source_storage_path: storagePath }, { status: 503 });
  }

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("source", "dashboard_upload");
  form.append("uploaded_by", session.user?.email || "dashboard_user");
  form.append("source_file_name", file.name);
  form.append("source_storage_path", storagePath);
  form.append("source_storage_bucket", bucket);
  form.append("source_upload_id", uploadRecordId);
  const response = await fetch(webhook, { method: "POST", body: form });
  if (!response.ok) {
    await supabaseFetch(`invoice_source_uploads?id=eq.${encodeURIComponent(uploadRecordId)}`, { method: "PATCH", body: JSON.stringify({ status: "webhook_error", error_message: `n8n webhook returned ${response.status}` }) });
    return NextResponse.json({ error: `n8n webhook returned ${response.status}. The source file is stored and visible in Review Queue.`, upload_id: uploadRecordId }, { status: 502 });
  }
  return NextResponse.json({ ok: true, upload_id: uploadRecordId, source_storage_path: storagePath });
}
