"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: "⌂" },
  { href: "/dashboard/leads", label: "Chamber Leads", icon: "✉" },
  { href: "/dashboard/invoices", label: "Vendor Invoices", icon: "$" },
  { href: "/dashboard/inventory", label: "Inventory & Forecast", icon: "◫" },
  { href: "/dashboard/labor", label: "Labor Cost & Growth", icon: "◒" },
  { href: "/dashboard/reviews", label: "Review Replies", icon: "★" },
  { href: "/dashboard/compliance", label: "Royalty & Delivery", icon: "▣" },
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="sidebar"><nav>{LINKS.map(link => {
    const active = link.href === "/dashboard" ? pathname === link.href : pathname?.startsWith(link.href);
    return <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}>
      <span className="nav-icon">{link.icon}</span><span>{link.label}</span>
    </Link>;
  })}</nav><div className="sidebar-wave" aria-hidden="true" /></aside>;
}
