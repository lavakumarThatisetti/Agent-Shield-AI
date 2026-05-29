"use client";

import { useEffect, useState } from "react";
import type { Agent } from "@/components/types";
import { AgentEditorPanel, type AgentFormValue } from "@/components/agent-registry/agent-editor-panel";
import { AgentRegistryView } from "@/components/agent-registry/agent-registry-view";

export function AgentRegistryClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; agent?: Agent } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const response = await fetch("/api/agents", { cache: "no-store" });
      const data = (await response.json()) as { agents: Agent[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load agent registry.");

      setAgents(data.agents);
      const defaultAgent = data.agents.find((agent) => agent.agentKey === "claude-support-agent") ?? data.agents[0];
      if (defaultAgent) setSelectedAgentId(defaultAgent.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load agent registry.");
    }
  }

  async function saveAgent(value: AgentFormValue) {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(editor?.mode === "edit" && editor.agent ? `/api/agents/${editor.agent.id}` : "/api/agents", {
        method: editor?.mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value)
      });
      const data = (await response.json()) as { agent: Agent; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save agent identity.");

      setAgents((current) => (current.some((agent) => agent.id === data.agent.id) ? current.map((agent) => (agent.id === data.agent.id ? data.agent : agent)) : [...current, data.agent]));
      setSelectedAgentId(data.agent.id);
      setEditor(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save agent identity.");
    } finally {
      setIsSaving(false);
    }
  }

  async function revokeAgent(agent: Agent) {
    setError("");

    try {
      const response = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      const data = (await response.json()) as { agent: Agent; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to revoke agent identity.");
      setAgents((current) => current.map((item) => (item.id === data.agent.id ? data.agent : item)));
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke agent identity.");
    }
  }

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      {editor ? (
        <AgentEditorPanel agent={editor.agent} isSaving={isSaving} mode={editor.mode} onCancel={() => setEditor(null)} onSave={saveAgent} />
      ) : (
        <AgentRegistryView
          agents={agents}
          selectedAgentId={selectedAgentId}
          onCreate={() => setEditor({ mode: "create" })}
          onDuplicate={(agent) => setEditor({ mode: "create", agent: { ...agent, displayName: `${agent.displayName} Copy` } })}
          onEdit={(agent) => setEditor({ mode: "edit", agent })}
          onRevoke={revokeAgent}
          onSelect={setSelectedAgentId}
        />
      )}
    </>
  );
}
