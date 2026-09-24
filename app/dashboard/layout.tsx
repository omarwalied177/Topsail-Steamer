import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><img src="/topsail-logo.jpeg" alt="Topsail Steamer" className="brand-logo"/><div className="brand-divider"/><div><p className="brand-name">Topsail Steamer</p><p className="brand-subtitle">Operations Dashboard</p></div></div>
      <div className="account-area"><div className="avatar">{(session?.user?.name || "OW").slice(0,2).toUpperCase()}</div><span className="account-name">{session?.user?.name || "Staff"}</span><SignOutButton/></div>
    </header>
    <div className="dashboard-frame"><Sidebar/><main className="dashboard-main">{children}</main></div>
  </div>;
}
