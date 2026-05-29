"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Copy,
  Database,
  Fingerprint,
  KeyRound,
  Layers3,
  LockKeyhole,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
  XCircle,
  type LucideIcon
} from "lucide-react";
import type { Agent } from "@/components/types";
import { formatToolName } from "@/components/sandbox/gateway-format";
import { StatusPill } from "@/components/ui/status-pill";

export function AgentRegistryView({
  agents,
  onCreate,
  onDuplicate,
  onEdit,
  onRevoke,
  selectedAgentId,
  onSelect
}: {
  agents: Agent[];
  onCreate: () => void;
  onDuplicate: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onRevoke: (agent: Agent) => void;
  selectedAgentId: string;
  onSelect: (agentId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const registryStats = useMemo(() => {
    const activeAgents = agents.filter((agent) => agent.status.toLowerCase() === "active").length;
    const highRiskAgents = agents.filter((agent) => agent.riskTier.toLowerCase() === "high").length;
    const allowedTools = agents.reduce((total, agent) => total + agent.allowedTools.length, 0);

    return [
      { label: "Active", value: activeAgents },
      { label: "High risk", value: highRiskAgents },
      { label: "Allowed tools", value: allowedTools }
    ];
  }, [agents]);
  const filteredAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return agents;

    return agents.filter((agent) =>
      [agent.displayName, agent.provider, agent.modelName, agent.environment, agent.sponsorName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [agents, query]);

  return (
    <section className="registry-grid">
      <div className="registry-list surface registry-panel">
        <div className="registry-panel-top">
          <div>
            <p className="section-kicker">Identity governance</p>
            <h2>Agent identities</h2>
            <span className="surface-subcopy">{agents.length} manifests under runtime enforcement</span>
          </div>
          <button className="primary-button compact" onClick={onCreate} type="button">
            <Plus size={18} />
            New identity
          </button>
        </div>

        <div className="registry-mini-metrics" aria-label="Agent registry summary">
          {registryStats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <label className="registry-search">
          <Search size={15} />
          <input aria-label="Search agent identities" placeholder="Search identity, owner, runtime" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>

        <div className="identity-list">
          {filteredAgents.map((agent) => (
            <button className={`identity-card ${agent.id === selectedAgent?.id ? "selected" : ""}`} key={agent.id} onClick={() => onSelect(agent.id)} type="button">
              <div className="identity-card-main">
                <div className="identity-avatar">{getInitials(agent.displayName)}</div>
                <div className="identity-card-copy">
                  <strong>{agent.displayName}</strong>
                  <span className="identity-provider-line">
                    {agent.provider}
                    <RiskTag riskTier={agent.riskTier} />
                  </span>
                  <small>{agent.environment} runtime</small>
                  <em>{agent.allowedTools.length} allowed / {agent.deniedActions.length} denied</em>
                </div>
              </div>
            </button>
          ))}
          {!filteredAgents.length ? <div className="empty-list-note">No identities match that search.</div> : null}
        </div>
      </div>

      {selectedAgent ? (
        <div className="identity-detail surface identity-manifest">
          <div className="identity-hero">
            <div className="identity-hero-main">
              <div className="identity-avatar xl">{getInitials(selectedAgent.displayName)}</div>
              <div>
                <p className="section-kicker">Applied identity profile</p>
                <h2>{selectedAgent.displayName}</h2>
                <p>{selectedAgent.purpose}</p>
              </div>
            </div>
            <div className="identity-actions">
              <StatusPill status={selectedAgent.status} />
              <button className="secondary-button compact" onClick={() => onEdit(selectedAgent)} type="button">
                <Pencil size={15} />
                Edit
              </button>
              <button className="secondary-button compact" onClick={() => onDuplicate(selectedAgent)} type="button">
                <Copy size={15} />
                Duplicate
              </button>
              <button className="danger-button compact" onClick={() => onRevoke(selectedAgent)} type="button">
                <Ban size={15} />
                Revoke
              </button>
            </div>
          </div>

          <div className="identity-manifest-strip">
            <div>
              <Fingerprint size={17} />
              <span>Trust tier</span>
              <StatusPill status={selectedAgent.riskTier} />
            </div>
            <div>
              <Layers3 size={17} />
              <span>Allowed surface</span>
              <strong>{selectedAgent.allowedTools.length} tools</strong>
            </div>
            <div>
              <XCircle size={17} />
              <span>Hard denies</span>
              <strong>{selectedAgent.deniedActions.length} actions</strong>
            </div>
            <div>
              <ShieldCheck size={17} />
              <span>Policy checks</span>
              <strong>{selectedAgent.policyRules.length} rules</strong>
            </div>
          </div>

          <div className="identity-overview">
            <InfoTile icon={KeyRound} label="Provider" value={selectedAgent.provider} />
            <InfoTile icon={Database} label="Model" value={selectedAgent.modelName} />
            <InfoTile icon={UserRoundCheck} label="Sponsor" value={selectedAgent.sponsorName} />
            <InfoTile icon={Power} label="Environment" value={selectedAgent.environment} />
          </div>

          <div className="identity-boundary-board">
            <BoundaryColumn description="Tools available without interruption." icon={CheckCircle2} title="Allowed Surface" items={selectedAgent.allowedTools} tone="allow" />
            <BoundaryColumn description="Actions paused for a human decision." icon={TriangleAlert} title="Approval Boundary" items={selectedAgent.dataBoundary.approvalRequired} tone="approval" />
            <BoundaryColumn description="Requests blocked before execution." icon={LockKeyhole} title="Hard Denies" items={selectedAgent.deniedActions} tone="deny" />
          </div>

          <div className="policy-section">
            <div className="surface-heading compact">
              <div>
                <p className="section-kicker">Runtime policies</p>
                <h3>Gateway rules attached to this identity</h3>
                <span className="surface-subcopy">Evaluated before the agent reaches tools, data, or external APIs.</span>
              </div>
              <ShieldCheck size={18} />
            </div>
            <div className="policy-list">
              {selectedAgent.policyRules.map((rule) => (
                <div className="policy-row" key={rule.id}>
                  <StatusPill status={rule.effect} />
                  <div>
                    <strong>{rule.name}</strong>
                    <span>{rule.description}</span>
                    <small>{formatPolicyAction(rule.action)} · {rule.severity.toLowerCase()} severity</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="info-tile">
      <Icon size={17} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function RiskTag({ riskTier }: { riskTier: string }) {
  return <span className={`identity-risk-tag risk-${riskTier.toLowerCase()}`}>{riskTier.toLowerCase()}</span>;
}

function BoundaryColumn({
  description,
  icon: Icon,
  title,
  items,
  tone
}: {
  description: string;
  icon: LucideIcon;
  title: string;
  items: string[];
  tone: "allow" | "approval" | "deny";
}) {
  return (
    <div className={`boundary-column ${tone}`}>
      <div className="boundary-column-heading">
        <span>
          <Icon size={16} />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <strong>{items.length}</strong>
      </div>
      <div className="chip-cloud">
        {items.length ? items.map((item) => (
          <span className={`boundary-chip ${tone}`} key={item}>
            {formatBoundaryItem(item)}
          </span>
        )) : <span className="empty-boundary">None</span>}
      </div>
    </div>
  );
}

function formatBoundaryItem(item: string) {
  return item.includes("_") ? formatToolName(item) : item;
}

function formatPolicyAction(action: string) {
  return action.includes("_") ? formatToolName(action) : action;
}
