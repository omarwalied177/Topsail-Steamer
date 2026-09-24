import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookUrl = process.env.N8N_LABOR_UPLOAD_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "N8N_LABOR_UPLOAD_WEBHOOK_URL is not configured." }, { status: 500 });
  }

  try {
    const incoming = await req.formData();
    const file = incoming.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A Homebase CSV file is required." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are accepted." }, { status: 400 });
    }

    const outgoing = new FormData();
    outgoing.append("data", file, file.name);

    for (const key of ["month", "payroll_fees", "manager_allocation", "internal_target_pct"]) {
      const value = incoming.get(key);
      if (typeof value === "string") outgoing.append(key, value);
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: outgoing,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : await response.text();

    if (!response.ok) {
      const detail = typeof payload === "string"
        ? payload
        : payload?.message || payload?.error || "n8n rejected the upload.";
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    return NextResponse.json({ ok: true, message: "Payroll CSV forwarded to n8n.", data: payload });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to forward the payroll CSV.",
    }, { status: 500 });
  }
}
