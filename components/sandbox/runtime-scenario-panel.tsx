"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Agent, GatewayEvaluationResult, RuntimeScenario } from "@/components/types";
import { ScenarioEditorPanel, type ScenarioFormValue } from "./scenario-editor-panel";
import { ScenarioPicker } from "./scenario-picker";
import { ScenarioPreview } from "./scenario-preview";

export function RuntimeScenarioPanel({
  agents,
  selectedAgentId,
  onResult,
  onRunningChange
}: {
  agents: Agent[];
  selectedAgentId: string;
  onResult: (result: GatewayEvaluationResult | null) => void;
  onRunningChange: (isRunning: boolean) => void;
}) {
  const [scenarios, setScenarios] = useState<RuntimeScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; scenario?: RuntimeScenario } | null>(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [latestResult, setLatestResult] = useState<GatewayEvaluationResult | null>(null);
  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0], [agents, selectedAgentId]);
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0];

  useEffect(() => {
    if (!selectedAgent?.id) return;
    void loadScenarios(selectedAgent.id);
  }, [selectedAgent?.id]);

  useEffect(() => {
    if (scenarios.length && !scenarios.some((scenario) => scenario.id === selectedScenarioId)) {
      setSelectedScenarioId(pickDefaultScenario(scenarios)?.id ?? "");
      setLatestResult(null);
      onResult(null);
    }
  }, [onResult, scenarios, selectedScenarioId]);

  async function loadScenarios(agentId: string) {
    setError("");
    setEditor(null);
    setLatestResult(null);
    onResult(null);

    try {
      const response = await fetch(`/api/scenarios?agentId=${encodeURIComponent(agentId)}`, { cache: "no-store" });
      const data = (await response.json()) as { scenarios: RuntimeScenario[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load runtime scenarios.");
      const orderedScenarios = orderScenariosForDemo(data.scenarios);
      setScenarios(orderedScenarios);
      setSelectedScenarioId(pickDefaultScenario(orderedScenarios)?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load runtime scenarios.");
      setScenarios([]);
      setSelectedScenarioId("");
    }
  }

  async function runScenario(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selectedAgent || !selectedScenario) return;

    setIsRunning(true);
    onRunningChange(true);
    setError("");
    setLatestResult(null);
    onResult(null);

    try {
      const response = await fetch("/api/gateway/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          userGoal: selectedScenario.userGoal,
          sourceType: selectedScenario.sourceType,
          sourceName: selectedScenario.sourceName,
          sourceContent: selectedScenario.sourceContent
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gateway evaluation failed.");
      setLatestResult(data as GatewayEvaluationResult);
      onResult(data as GatewayEvaluationResult);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Gateway evaluation failed.");
    } finally {
      setIsRunning(false);
      onRunningChange(false);
    }
  }

  async function saveScenario(value: ScenarioFormValue) {
    setIsSavingScenario(true);
    setError("");

    try {
      const response = await fetch(editor?.mode === "edit" && editor.scenario ? `/api/scenarios/${editor.scenario.id}` : "/api/scenarios", {
        method: editor?.mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value)
      });
      const data = (await response.json()) as { scenario: RuntimeScenario; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save runtime scenario.");
      setScenarios((current) =>
        current.some((scenario) => scenario.id === data.scenario.id)
          ? current.map((scenario) => (scenario.id === data.scenario.id ? data.scenario : scenario))
          : [...current, data.scenario]
      );
      setSelectedScenarioId(data.scenario.id);
      setEditor(null);
      setLatestResult(null);
      onResult(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save runtime scenario.");
    } finally {
      setIsSavingScenario(false);
    }
  }

  async function archiveScenario(scenario: RuntimeScenario) {
    setError("");

    try {
      const response = await fetch(`/api/scenarios/${scenario.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to archive runtime scenario.");
      setScenarios((current) => current.filter((item) => item.id !== scenario.id));
      setLatestResult(null);
      onResult(null);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive runtime scenario.");
    }
  }

  return (
    <section className="runtime-scenario-panel">
      <div className="setup-block-heading">
        <div>
          <p>Step 2</p>
          <h3>Untrusted input</h3>
          <span>Choose the inbound message the agent will try to handle before tool calls are intercepted.</span>
        </div>
      </div>

      <div className="runtime-scenario-grid">
        <ScenarioPicker
          scenarios={scenarios}
          selectedScenarioId={selectedScenario?.id ?? ""}
          onCreate={() => setEditor({ mode: "create" })}
          onDelete={archiveScenario}
          onEdit={(scenario) => setEditor({ mode: "edit", scenario })}
          onSelect={(scenarioId) => {
            setSelectedScenarioId(scenarioId);
            setLatestResult(null);
            onResult(null);
          }}
        />
        {editor ? (
          <ScenarioEditorPanel
            agentId={selectedAgent?.id ?? ""}
            isSaving={isSavingScenario}
            mode={editor.mode}
            scenario={editor.scenario}
            onCancel={() => setEditor(null)}
            onSave={saveScenario}
          />
        ) : (
          <ScenarioPreview
            error={error}
            isRunning={isRunning}
            latestResult={latestResult}
            scenario={selectedScenario}
            selectedAgent={selectedAgent}
            onRun={runScenario}
          />
        )}
      </div>
    </section>
  );
}

function orderScenariosForDemo(scenarios: RuntimeScenario[]) {
  return [...scenarios].sort((first, second) => scenarioRank(first) - scenarioRank(second));
}

function pickDefaultScenario(scenarios: RuntimeScenario[]) {
  return orderScenariosForDemo(scenarios)[0];
}

function scenarioRank(scenario: RuntimeScenario) {
  const text = `${scenario.title} ${scenario.category} ${scenario.sourceContent}`.toLowerCase();
  if (/prompt injection|exfiltration|spoofing|tool misuse|malicious|bypass|hidden instruction/.test(text)) return 0;
  if (/approval|send|external|payment/.test(text)) return 1;
  return 2;
}
