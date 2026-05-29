import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, ArrowRight, BarChart3, ClipboardCheck, FileWarning, Fingerprint, Gauge, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";
import { StatusPill } from "@/components/ui/status-pill";
import { formatToolName } from "@/components/sandbox/gateway-format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureDemoDataForDevelopment();

  const [agentCount, activeAgents, pendingApprovals, openIncidents, blockedRuns, toolCallCount, monitorToolCalls, recentRuns, recentApprovals, recentIncidents] = await Promise.all([
    prisma.agentIdentity.count(),
    prisma.agentIdentity.count({ where: { status: "ACTIVE" } }),
    prisma.approvalRequest.count({ where: { status: "PENDING" } }),
    prisma.securityIncident.count(),
    prisma.agentRun.count({ where: { status: { in: ["BLOCKED", "DENIED"] } } }),
    prisma.toolCall.count(),
    prisma.toolCall.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      select: {
        policyDecision: true,
        policyName: true
      }
    }),
    prisma.agentRun.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { agent: true }
    }),
    prisma.approvalRequest.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { agent: true, toolCall: true }
    }),
    prisma.securityIncident.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { agent: true, run: true }
    })
  ]);
  const posture = buildPosture(monitorToolCalls);
  const policyPressure = buildPolicyPressure(monitorToolCalls);
  const postureTotal = posture.reduce((total, item) => total + item.value, 0);

  return (
    <div className="home-overview">
      <section className="monitor-hero surface">
        <div>
          <p className="section-kicker">AgentShield Monitor</p>
          <h2>Runtime posture across autonomous agent activity</h2>
          <span>Track tool-call decisions, approval pressure, blocked actions, and recent evidence from the gateway.</span>
        </div>
        <Link className="monitor-hero-action" href="/home/runtime-gateway">
          Run gateway evaluation
          <ArrowRight size={15} />
        </Link>
      </section>

      <section className="home-command-grid">
        <Link className="home-command-card primary" href="/home/agent-registry">
          <div>
            <span className="home-command-icon">
              <Fingerprint size={18} />
            </span>
            <p className="section-kicker">Step 1</p>
            <h2>Configure agent identities</h2>
            <p>Define owners, runtime models, allowed tools, approval checkpoints, and hard-deny boundaries.</p>
          </div>
          <ArrowRight size={18} />
        </Link>

        <Link className="home-command-card" href="/home/runtime-gateway">
          <div>
            <span className="home-command-icon">
              <ShieldCheck size={18} />
            </span>
            <p className="section-kicker">Step 2</p>
            <h2>Run the sandbox gateway</h2>
            <p>Choose untrusted input, generate the tool plan, and watch AgentShield decide pass, hold, block, or skip.</p>
          </div>
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="home-metric-grid" aria-label="Runtime monitor summary">
        <MetricCard label="Active agents" value={activeAgents} detail={`${agentCount} identities total`} />
        <MetricCard label="Tool calls evaluated" value={toolCallCount} detail="Runtime decisions" />
        <MetricCard label="Pending approvals" value={pendingApprovals} detail="Human checkpoints" tone={pendingApprovals ? "warning" : "neutral"} />
        <MetricCard label="Stopped runs" value={blockedRuns} detail={`${openIncidents} incidents recorded`} tone={blockedRuns ? "danger" : "neutral"} />
      </section>

      <section className="monitor-grid">
        <section className="surface monitor-card">
          <div className="surface-heading compact">
            <div>
              <p className="section-kicker">Runtime posture</p>
              <h2>Tool-call decision mix</h2>
              <span className="surface-subcopy">Latest {postureTotal} evaluated tool calls.</span>
            </div>
            <Gauge size={18} />
          </div>
          <div className="posture-stack" aria-label="Tool-call decision distribution">
            {posture.map((item) => (
              <span className={item.tone} key={item.label} style={{ width: `${percentage(item.value, postureTotal)}%` }} />
            ))}
          </div>
          <div className="posture-legend">
            {posture.map((item) => (
              <div key={item.label}>
                <span className={`legend-dot ${item.tone}`} />
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="surface monitor-card">
          <div className="surface-heading compact">
            <div>
              <p className="section-kicker">Policy pressure</p>
              <h2>Top triggered policies</h2>
              <span className="surface-subcopy">Most frequent policy outcomes across recent gateway decisions.</span>
            </div>
            <BarChart3 size={18} />
          </div>
          <div className="policy-pressure-list">
            {policyPressure.length ? (
              policyPressure.map((policy) => (
                <div className="policy-pressure-row" key={policy.name}>
                  <div>
                    <strong>{policy.name}</strong>
                    <span>{policy.count} decisions</span>
                  </div>
                  <i style={{ width: `${percentage(policy.count, policyPressure[0]?.count ?? 0)}%` }} />
                </div>
              ))
            ) : (
              <div className="home-empty-row">Run a gateway scenario to populate policy pressure.</div>
            )}
          </div>
        </section>
      </section>

      <section className="home-activity-grid">
        <RecentPanel
          title="Recent Audits"
          kicker="Runtime history"
          href="/home/audit-trail"
          icon={<Activity size={18} />}
          empty="No gateway runs yet."
        >
          {recentRuns.map((run) => (
            <Link className="home-list-row" href={`/home/audit-trail?runId=${encodeURIComponent(run.id)}`} key={run.id}>
              <div>
                <strong>{run.agent.displayName}</strong>
                <span>{run.userTask}</span>
              </div>
              <div className="home-list-meta">
                <StatusPill status={run.status} />
                <small>{run.riskScore}</small>
              </div>
            </Link>
          ))}
        </RecentPanel>

        <RecentPanel
          title="Approval Queue"
          kicker="Human control"
          href="/home/approvals"
          icon={<ClipboardCheck size={18} />}
          empty="No approval requests yet."
        >
          {recentApprovals.map((approval) => (
            <Link className="home-list-row" href={`/home/approvals?approvalId=${encodeURIComponent(approval.id)}`} key={approval.id}>
              <div>
                <strong>{formatToolName(approval.requestedAction)}</strong>
                <span>{approval.agent?.displayName ?? "Unknown agent"}</span>
              </div>
              <div className="home-list-meta">
                <StatusPill status={approval.status} />
                <small>{approval.riskScore}</small>
              </div>
            </Link>
          ))}
        </RecentPanel>

        <RecentPanel
          title="Incidents"
          kicker="Response queue"
          href="/home/incidents"
          icon={<FileWarning size={18} />}
          empty="No incidents recorded."
        >
          {recentIncidents.map((incident) => (
            <Link className="home-list-row" href="/home/incidents" key={incident.id}>
              <div>
                <strong>{incident.title}</strong>
                <span>{incident.agent?.displayName ?? incident.category}</span>
              </div>
              <div className="home-list-meta">
                <StatusPill status={incident.severity} />
                <small>{formatDate(incident.createdAt)}</small>
              </div>
            </Link>
          ))}
        </RecentPanel>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "neutral" }: { label: string; value: number; detail: string; tone?: "neutral" | "warning" | "danger" }) {
  return (
    <div className={`home-metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function RecentPanel({
  children,
  empty,
  href,
  icon,
  kicker,
  title
}: {
  children: ReactNode;
  empty: string;
  href: string;
  icon: ReactNode;
  kicker: string;
  title: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="surface home-activity-panel">
      <div className="surface-heading compact">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        {icon}
      </div>
      <div className="home-list">{hasRows ? children : <div className="home-empty-row">{empty}</div>}</div>
      <Link className="home-panel-link" href={href}>
        View all
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(value);
}

function buildPosture(toolCalls: Array<{ policyDecision: string }>) {
  const counts = {
    allowed: 0,
    held: 0,
    blocked: 0,
    skipped: 0
  };

  for (const tool of toolCalls) {
    if (tool.policyDecision === "ALLOWED" || tool.policyDecision === "APPROVED") counts.allowed += 1;
    else if (tool.policyDecision === "APPROVAL_REQUIRED") counts.held += 1;
    else if (tool.policyDecision === "BLOCKED" || tool.policyDecision === "DENIED") counts.blocked += 1;
    else counts.skipped += 1;
  }

  return [
    { label: "Allowed", value: counts.allowed, tone: "allowed" },
    { label: "Held", value: counts.held, tone: "held" },
    { label: "Blocked", value: counts.blocked, tone: "blocked" },
    { label: "Skipped", value: counts.skipped, tone: "skipped" }
  ];
}

function buildPolicyPressure(toolCalls: Array<{ policyName: string }>) {
  const counts = new Map<string, number>();
  for (const tool of toolCalls) {
    const policyName = tool.policyName || "Unlabeled policy";
    counts.set(policyName, (counts.get(policyName) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);
}

function percentage(value: number, total: number) {
  if (!total || value <= 0) return 0;
  return Math.max(4, Math.round((value / total) * 100));
}
