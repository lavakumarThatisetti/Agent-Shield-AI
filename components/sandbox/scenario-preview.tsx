import type { FormEvent } from "react";
import { Loader2, Play } from "lucide-react";
import type { Agent, GatewayEvaluationResult, RuntimeScenario } from "@/components/types";

export function ScenarioPreview({
  error,
  isRunning,
  latestResult,
  scenario,
  selectedAgent,
  onRun
}: {
  error: string;
  isRunning: boolean;
  latestResult: GatewayEvaluationResult | null;
  scenario?: RuntimeScenario;
  selectedAgent?: Agent;
  onRun: (event?: FormEvent<HTMLFormElement>) => void;
}) {
  if (!scenario) {
    return (
      <div className="scenario-detail empty-scenario">
        <strong>No runtime scenarios for this identity yet.</strong>
        <span>Add a scenario to evaluate this agent through the runtime gateway.</span>
      </div>
    );
  }

  return (
    <form className="scenario-detail" onSubmit={onRun}>
      <div className="scenario-meta">
        <ScenarioMeta label="Agent identity" value={selectedAgent?.displayName ?? "Loading agent"} />
        <ScenarioMeta label="Input" value={`Untrusted ${formatSourceType(scenario.sourceType)}`} />
        <ScenarioMeta label="Tool plan" value={latestResult ? `${latestResult.toolCalls.length} proposed` : "Generated on run"} />
      </div>

      <div className="attack-source">
        <span>Untrusted {formatSourceType(scenario.sourceType)} · {scenario.sourceName}</span>
        <pre>{scenario.sourceContent}</pre>
      </div>

      {latestResult ? (
        <div className="planner-note">
          <strong>{latestResult.planner.mode === "llm" ? "LLM planner" : "Local planner"}</strong>
          <p>{latestResult.planner.summary}</p>
        </div>
      ) : null}

      {error ? <div className="auth-error">{error}</div> : null}

      <button className={`run-button ${isRunning ? "running" : ""}`} disabled={isRunning || !selectedAgent} type="submit">
        {isRunning ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
        <span>{isRunning ? "Evaluating gateway" : "Run gateway evaluation"}</span>
      </button>
    </form>
  );
}

function ScenarioMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatSourceType(sourceType: string) {
  return sourceType.trim().toLowerCase() || "input";
}
