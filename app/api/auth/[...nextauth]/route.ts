import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// NextAuth v4 uses request-time cookies/session data.
// Keep this route on the Node runtime and never statically optimize it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { handler as GET, handler as POST };
