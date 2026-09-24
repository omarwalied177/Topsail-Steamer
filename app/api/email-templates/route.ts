import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmailTemplate, updateEmailTemplate } from "@/lib/supabase";

function validType(value: unknown): "welcome" | "reminder" | null {
  return value === "welcome" || value === "reminder" ? value : null;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = validType(new URL(request.url).searchParams.get("type"));
  if (!type) return NextResponse.json({ error: "type must be welcome or reminder." }, { status: 400 });

  try {
    const template = await getEmailTemplate(type);
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json(template);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load email template." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    const type = validType(data.type);
    const subject = String(data.subject || "").trim();
    const body = String(data.body || "");

    if (!type) return NextResponse.json({ error: "type must be welcome or reminder." }, { status: 400 });
    if (!subject || !body) return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });

    const template = await updateEmailTemplate(type, subject, body);
    return NextResponse.json({ ok: true, template });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save email template." },
      { status: 500 }
    );
  }
}
