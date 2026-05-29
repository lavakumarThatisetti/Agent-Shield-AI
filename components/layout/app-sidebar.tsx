"use client";

import { Activity, ClipboardCheck, FileWarning, Fingerprint, LayoutDashboard, LogOut, PlugZap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type AppRoute = "monitor" | "agent-registry" | "runtime-gateway" | "approvals" | "audit-trail" | "incidents" | "integrations";

const navItems = [
  { id: "monitor" as const, label: "Monitor", href: "/home", icon: LayoutDashboard },
  { id: "agent-registry" as const, label: "Agent Registry", href: "/home/agent-registry", icon: Fingerprint },
  { id: "runtime-gateway" as const, label: "Runtime Gateway", href: "/home/runtime-gateway", icon: ShieldCheck },
  { id: "approvals" as const, label: "Approvals", href: "/home/approvals", icon: ClipboardCheck },
  { id: "audit-trail" as const, label: "Audit Trail", href: "/home/audit-trail", icon: Activity },
  { id: "incidents" as const, label: "Incidents", href: "/home/incidents", icon: FileWarning },
  { id: "integrations" as const, label: "Integrations", href: "/home/integrations", icon: PlugZap }
];

export function AppSidebar() {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-symbol">AS</div>
        <div>
          <strong>AgentShield AI</strong>
          <span>Runtime security control plane</span>
        </div>
      </div>

      <div className="sidebar-section-label">Workspace</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/home" ? pathname === "/home" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link className={isActive ? "active" : ""} href={item.href} key={item.id}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-status">
        <span>Enforcement mode</span>
        <strong>Zero trust active</strong>
      </div>

      <button className="sidebar-logout" onClick={logout} type="button">
        <LogOut size={17} />
        Sign out
      </button>
    </aside>
  );
}
