"use client";

import { Activity, ClipboardCheck, FileWarning, Fingerprint, LayoutDashboard, PlugZap, ShieldCheck, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";

const routeHeaders: Array<{
  description: string;
  href: string;
  icon: LucideIcon;
  metric: string;
  title: string;
}> = [
  {
    href: "/home",
    icon: LayoutDashboard,
    metric: "Monitor",
    title: "AgentShield Monitor",
    description: "Runtime posture across agent identities, tool calls, approvals, and incidents."
  },
  {
    href: "/home/agent-registry",
    icon: Fingerprint,
    metric: "Identity layer",
    title: "Agent Identity Registry",
    description: "Govern runtime identities, owners, tool surfaces, and policy boundaries for autonomous agents."
  },
  {
    href: "/home/runtime-gateway",
    icon: ShieldCheck,
    metric: "Gateway",
    title: "Agent Runtime Gateway",
    description: "Evaluate untrusted content and tool calls before autonomous agents reach enterprise systems."
  },
  {
    href: "/home/approvals",
    icon: ClipboardCheck,
    metric: "Human review queue",
    title: "Approval Queue",
    description: "Review held tool calls, capture reviewer decisions, and preserve approval evidence for audit."
  },
  {
    href: "/home/audit-trail",
    icon: Activity,
    metric: "Audit stream",
    title: "Audit Trail",
    description: "Review runtime decisions, policy outcomes, and evidence captured by the gateway."
  },
  {
    href: "/home/incidents",
    icon: FileWarning,
    metric: "Response queue",
    title: "Security Incidents",
    description: "Triage blocked actions, identity abuse, data exfiltration attempts, and approval escalations."
  },
  {
    href: "/home/integrations",
    icon: PlugZap,
    metric: "Integrations",
    title: "Gateway Integrations",
    description: "Connect AgentShield as a REST gateway, MCP interceptor, webhook sink, or policy bundle control plane."
  }
];

export function TopHeader() {
  const pathname = usePathname();
  const routeHeader = routeHeaders.find((item) => (item.href === "/home" ? pathname === "/home" : pathname === item.href || pathname.startsWith(`${item.href}/`))) ?? routeHeaders[0];
  const Icon = routeHeader.icon;

  return (
    <header className="product-header">
      <div>
        <p className="section-kicker">AgentShield Control Plane</p>
        <h1>{routeHeader.title}</h1>
        <p>{routeHeader.description}</p>
      </div>
      <div className="header-metric">
        <Icon size={18} />
        <span>{routeHeader.metric}</span>
      </div>
    </header>
  );
}
