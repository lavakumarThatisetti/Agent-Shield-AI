"use client";

import { useEffect, useState } from "react";
import type { Agent } from "@/components/types";
import { SandboxGateway } from "@/components/sandbox/sandbox-gateway";

export function RuntimeGatewayClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const response = await fetch("/api/agents", { cache: "no-store" });
      const data = (await response.json()) as { agents: Agent[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load agents.");

      setAgents(data.agents);
      const defaultAgent = data.agents.find((agent) => agent.agentKey === "claude-support-agent") ?? data.agents[0];
      if (defaultAgent) setSelectedAgentId(defaultAgent.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load runtime gateway.");
    }
  }

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      <SandboxGateway
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={(agentId) => {
          setSelectedAgentId(agentId);
          setError("");
        }}
      />
    </>
  );
}
