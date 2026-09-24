import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const webhook = process.env.N8N_INVOICE_UPLOAD_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ error: "N8N_INVOICE_UPLOAD_WEBHOOK_URL is not configured." }, { status: 503 });

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a PDF or image file." }, { status: 400 });
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type.includes("pdf") || lowerName.endsWith(".pdf");
  const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic|heif|tif|tiff)$/.test(lowerName);
  if (!isPdf && !isImage) return NextResponse.json({ error: "Only PDF, JPG, JPEG, PNG, WEBP, HEIC/HEIF, or TIFF files are supported." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "File is larger than the 15 MB upload limit." }, { status: 400 });

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("source", "dashboard_upload");
  form.append("uploaded_by", session.user?.email || "dashboard_user");

  const response = await fetch(webhook, { method: "POST", body: form });
  if (!response.ok) return NextResponse.json({ error: `n8n webhook returned ${response.status}.` }, { status: 502 });
  return NextResponse.json({ ok: true });
}
