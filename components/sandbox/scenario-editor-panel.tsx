"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import type { RuntimeScenario } from "@/components/types";

export type ScenarioFormValue = {
  title: string;
  category: string;
  agentId: string | null;
  userGoal: string;
  sourceType: string;
  sourceName: string;
  sourceContent: string;
  status: "ACTIVE" | "ARCHIVED";
};

export function ScenarioEditorPanel({
  agentId,
  isSaving,
  mode,
  onCancel,
  onSave,
  scenario
}: {
  agentId: string;
  isSaving: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onSave: (value: ScenarioFormValue) => Promise<void>;
  scenario?: RuntimeScenario;
}) {
  const initialValue = useMemo(() => toScenarioFormValue(agentId, scenario), [agentId, scenario]);
  const [value, setValue] = useState<ScenarioFormValue>(initialValue);

  return (
    <form
      className="scenario-detail scenario-editor scenario-editor-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(value);
      }}
    >
      <div className="editor-hero compact">
        <div>
          <p className="section-kicker">{mode === "create" ? "New replay" : "Edit replay"}</p>
          <h2>{mode === "create" ? "Create runtime scenario" : value.title}</h2>
          <span>Stage the untrusted input the agent will receive. The tool plan is generated only when the gateway runs.</span>
        </div>
        <div className="editor-hero-actions">
          <button className="secondary-button compact" onClick={onCancel} type="button">
            <ArrowLeft size={15} />
            Back
          </button>
          <button className="primary-button compact" disabled={isSaving} type="submit">
            <Save size={15} />
            {isSaving ? "Saving" : "Save scenario"}
          </button>
        </div>
      </div>

      <div className="scenario-editor-body">
        <section className="editor-section">
          <div className="editor-section-heading">
            <h3>Replay metadata</h3>
            <p>Use a realistic source and category so the demo reads like an enterprise incident drill.</p>
          </div>
          <div className="editor-grid compact">
            <TextField label="Title" placeholder="Prompt injection email" value={value.title} onChange={(title) => setValue({ ...value, title })} />
            <TextField label="Category" placeholder="Indirect prompt injection" value={value.category} onChange={(category) => setValue({ ...value, category })} />
            <TextField label="Source type" placeholder="email" value={value.sourceType} onChange={(sourceType) => setValue({ ...value, sourceType })} />
            <TextField label="Source name" placeholder="Renewal Operations" value={value.sourceName} onChange={(sourceName) => setValue({ ...value, sourceName })} />
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-heading">
            <h3>Runtime input</h3>
            <p>The planner sees this content, then AgentShield intercepts the generated tool calls.</p>
          </div>
          <label className="editor-field">
            <span>User goal</span>
            <textarea
              placeholder="Triage this request and evaluate the proposed tool calls through AgentShield."
              value={value.userGoal}
              onChange={(event) => setValue({ ...value, userGoal: event.target.value })}
              rows={2}
            />
          </label>
          <label className="editor-field">
            <span>Untrusted input</span>
            <textarea
              placeholder="Paste the email, webpage text, tool response, or agent-to-agent message here."
              value={value.sourceContent}
              onChange={(event) => setValue({ ...value, sourceContent: event.target.value })}
              rows={7}
            />
          </label>
        </section>
      </div>
    </form>
  );
}

function TextField({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function toScenarioFormValue(agentId: string, scenario?: RuntimeScenario): ScenarioFormValue {
  return {
    title: scenario?.title ?? "",
    category: scenario?.category ?? "",
    agentId: scenario?.agentId ?? agentId,
    userGoal: scenario?.userGoal ?? "",
    sourceType: scenario?.sourceType ?? "",
    sourceName: scenario?.sourceName ?? "",
    sourceContent: scenario?.sourceContent ?? "",
    status: (scenario?.status as ScenarioFormValue["status"]) ?? "ACTIVE"
  };
}
