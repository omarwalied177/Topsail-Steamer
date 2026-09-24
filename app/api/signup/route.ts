import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createDashboardUser, findDashboardUser } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    if (await findDashboardUser(email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await createDashboardUser({ name, email, passwordHash });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
