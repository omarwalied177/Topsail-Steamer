import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function callN8n(payload: Record<string, unknown>) {
  const url = process.env.N8N_AUTOMATION3_MONTHLY_CLOSE_WEBHOOK_URL;
  if (!url) throw new Error("N8N_AUTOMATION3_MONTHLY_CLOSE_WEBHOOK_URL is not configured.");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: unknown }).message)
        : text || `n8n returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const year = Number(body.year);
    const month = Number(body.month);

    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "A valid year and month are required." }, { status: 400 });
    }

    const result = await callN8n({ year, month, requested_from: "topsail-dashboard" });
    return NextResponse.json({ ok: true, workflow: "monthly-close", result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not run Monthly Close automation." },
      { status: 502 }
    );
  }
}
