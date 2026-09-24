"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard/leads", label: "Leads", icon: "⌂" },
  { href: "/dashboard/invoices", label: "Vendor Invoices", icon: "$" },
  { href: "/dashboard/inventory", label: "Inventory & Forecast", icon: "◫" },
  { href: "/dashboard/labor", label: "Labor Cost & Growth", icon: "◒" },
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="sidebar"><nav>{LINKS.map((link) => { const active = pathname?.startsWith(link.href); return <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}><span className="nav-icon">{link.icon}</span><span>{link.label}</span>{link.soon && <span className="soon-badge">Soon</span>}</Link>; })}</nav><div className="sidebar-wave" aria-hidden="true"/></aside>;
}
