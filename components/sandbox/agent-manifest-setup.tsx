"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import type { Agent } from "@/components/types";
import { formatCapability } from "./gateway-format";

export function AgentManifestSetup({
  agents,
  selectedAgentId,
  onSelect
}: {
  agents: Agent[];
  selectedAgentId: string;
  onSelect: (agentId: string) => void;
}) {
  const selected = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const filteredAgents = useMemo(() => filterAgents(agents, query), [agents, query]);

  return (
    <section className="agent-identity-setup">
      <div className="setup-block-heading">
        <div>
          <p>Step 1</p>
          <h3>Agent manifest</h3>
          <span>Select the runtime identity. The gateway uses this manifest as the permission boundary.</span>
        </div>
      </div>

      <div className="identity-setup-grid">
        <IdentityPicker
          agents={filteredAgents}
          isOpen={isOpen}
          query={query}
          selected={selected}
          onOpenChange={setIsOpen}
          onQueryChange={setQuery}
          onSelect={onSelect}
        />
        {selected ? <ManifestCard agent={selected} /> : null}
      </div>
    </section>
  );
}

function IdentityPicker({
  agents,
  isOpen,
  query,
  selected,
  onOpenChange,
  onQueryChange,
  onSelect
}: {
  agents: Agent[];
  isOpen: boolean;
  query: string;
  selected?: Agent;
  onOpenChange: (next: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelect: (agentId: string) => void;
}) {
  return (
    <div className="identity-picker">
      <label htmlFor="agent-search">Agent identity</label>
      <div className="identity-search-box">
        <Search size={16} />
        <input
          id="agent-search"
          onBlur={() => window.setTimeout(() => onOpenChange(false), 120)}
          onChange={(event) => {
            onQueryChange(event.target.value);
            onOpenChange(true);
          }}
          onFocus={() => onOpenChange(true)}
          placeholder={selected?.displayName ?? "Search agents"}
          type="search"
          value={query}
        />
      </div>

      {isOpen ? (
        <div className="identity-menu">
          {agents.map((agent) => (
            <button
              className={agent.id === selected?.id ? "selected" : ""}
              key={agent.id}
              onClick={() => {
                onSelect(agent.id);
                onQueryChange("");
                onOpenChange(false);
              }}
              type="button"
            >
              <strong>{agent.displayName}</strong>
              <span>
                {agent.provider} · {agent.environment}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="identity-picker-note">
        <ShieldCheck size={16} />
        <span>Runtime scenarios are filtered to this identity; tool calls are generated only when evaluation starts.</span>
      </div>
    </div>
  );
}

function ManifestCard({ agent }: { agent: Agent }) {
  return (
    <article className="agent-manifest-card">
      <div className="agent-manifest-top">
        <div className="identity-avatar large">{agent.displayName.slice(0, 2).toUpperCase()}</div>
        <div>
          <h3>{agent.displayName}</h3>
          <p>{agent.provider} · {agent.environment}</p>
        </div>
      </div>

      <div className="manifest-stats">
        <ManifestStat label="Risk" value={toTitleCase(agent.riskTier)} />
        <ManifestStat label="Runtime" value={agent.modelName} />
        <ManifestStat label="Owner" value={agent.sponsorName} />
      </div>

      <div className="manifest-boundaries">
        <BoundaryGroup defaultOpen title="Allowed tools" items={agent.allowedTools} tone="allow" />
        <BoundaryGroup title="Human approval" items={agent.dataBoundary.approvalRequired} tone="approval" />
        <BoundaryGroup title="Hard denies" items={agent.deniedActions.slice(0, 5)} tone="deny" />
      </div>
    </article>
  );
}

function ManifestStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BoundaryGroup({ defaultOpen = false, title, items, tone }: { defaultOpen?: boolean; title: string; items: string[]; tone: "allow" | "approval" | "deny" }) {
  return (
    <details open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <strong>{items.length}</strong>
      </summary>
      <div className={`compact-chip-list ${tone === "deny" ? "danger" : tone}`}>
        {items.slice(0, 6).map((item) => (
          <span key={item} title={item}>
            {formatCapability(item)}
          </span>
        ))}
      </div>
    </details>
  );
}

function filterAgents(agents: Agent[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return agents;

  return agents.filter((agent) =>
    [agent.displayName, agent.provider, agent.modelName, agent.environment, agent.purpose].join(" ").toLowerCase().includes(normalized)
  );
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
