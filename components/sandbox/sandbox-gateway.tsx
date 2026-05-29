"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bot, Braces, Loader2, RadioTower, ScanLine } from "lucide-react";
import type { Agent, GatewayEvaluationResult, GuardedRunResult } from "@/components/types";
import { AgentManifestSetup } from "./agent-manifest-setup";
import { GatewayEvidencePanel } from "./gateway-evidence-panel";
import { GATEWAY_STEP_DELAY_MS, GatewayStateMachine } from "./gateway-state-machine";
import { RuntimeScenarioPanel } from "./runtime-scenario-panel";
import { FinalReport } from "./final-report";
import { formatPolicyName, formatToolName } from "./gateway-format";

export function SandboxGateway({
  agents,
  selectedAgentId,
  onSelectAgent,
  onRunComplete
}: {
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  onRunComplete?: () => void;
}) {
  const [gatewayResult, setGatewayResult] = useState<GatewayEvaluationResult | null>(null);
  const [replayRunning, setReplayRunning] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const machineResult = useMemo(() => (gatewayResult ? toMachineResult(gatewayResult) : null), [gatewayResult]);

  useEffect(() => {
    setShowEvidence(false);
    setShowReport(false);
    if (!machineResult) return;

    const evidenceTimer = window.setTimeout(() => {
      setShowEvidence(true);
    }, (machineResult.toolCalls.length + 1) * GATEWAY_STEP_DELAY_MS + 150);

    const reportTimer = window.setTimeout(() => {
      setShowReport(true);
    }, (machineResult.toolCalls.length + 1) * GATEWAY_STEP_DELAY_MS + 800);

    return () => {
      window.clearTimeout(evidenceTimer);
      window.clearTimeout(reportTimer);
    };
  }, [machineResult]);

  return (
    <section className="sandbox-grid">
      <section className="gateway-evaluation surface">
        <div className="runtime-demo-header">
          <div>
            <p className="section-kicker">Gateway evaluation</p>
            <h2>Runtime enforcement run</h2>
            <p>Watch AgentShield intercept each proposed tool call between the autonomous agent and enterprise systems.</p>
          </div>
          <div className="runtime-live-badge">
            <RadioTower size={16} />
            <span>{replayRunning ? "Evaluating live" : gatewayResult ? "Decision recorded" : "Ready to intercept"}</span>
          </div>
        </div>

        <div className="runtime-demo-grid">
          <div className="runtime-demo-panel runtime-demo-left">
            <AgentManifestSetup
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelect={(agentId) => {
                onSelectAgent(agentId);
                setGatewayResult(null);
              }}
            />
          </div>
          <div className="runtime-demo-panel runtime-demo-middle">
            <RuntimeScenarioPanel
              agents={agents}
              selectedAgentId={selectedAgentId}
              onResult={(nextResult) => {
                setGatewayResult(nextResult);
                if (nextResult) onRunComplete?.();
              }}
              onRunningChange={setReplayRunning}
            />
          </div>
          <ToolPlanPanel result={gatewayResult} isRunning={replayRunning} />
        </div>
      </section>
      {machineResult || replayRunning ? <GatewayStateMachine result={machineResult} isRunning={replayRunning} /> : null}
      {showEvidence && gatewayResult ? (
        <div className="runtime-evidence-row">
          <GatewayEvidencePanel result={gatewayResult} />
          <FinalReport result={showReport ? machineResult : null} />
        </div>
      ) : null}
    </section>
  );
}

function ToolPlanPanel({ result, isRunning }: { result: GatewayEvaluationResult | null; isRunning: boolean }) {
  return (
    <aside className={`runtime-tool-plan ${isRunning && !result ? "is-planning" : ""}`}>
      <div className="tool-plan-heading">
        <div>
          <p className="section-kicker">Generated plan</p>
          <h3>Agent tool calls</h3>
        </div>
        <Braces size={18} />
      </div>

      {!result ? (
        isRunning ? <PlanningState /> : <EmptyPlanState />
      ) : (
        <>
          <div className="tool-plan-meta">
            <span>{result.planner.mode === "llm" ? "LLM planner" : "Local planner"}</span>
            <strong>{result.toolCalls.length} calls proposed</strong>
          </div>
          <div className="tool-plan-list">
            {result.toolCalls.map((tool) => (
              <article className={`tool-plan-row decision-${tool.policyDecision.toLowerCase()}`} key={`${tool.sequence}-${tool.toolName}`}>
                <div className="tool-plan-index">{tool.sequence}</div>
                <div>
                  <strong>{formatToolName(tool.toolName)}</strong>
                  <span>{tool.description}</span>
                  <small>{formatPolicyName(tool.policyName)}</small>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

function EmptyPlanState() {
  return (
    <div className="tool-plan-empty">
      <Bot size={20} />
      <strong>No plan captured yet</strong>
      <span>The proposed tool calls appear here before the gateway decisions are shown below.</span>
    </div>
  );
}

function PlanningState() {
  const steps = ["Reading untrusted input", "Extracting tool intent", "Building proposed calls", "Preparing policy context"];

  return (
    <div className="tool-plan-planning" aria-live="polite">
      <div className="planner-pulse">
        <Loader2 className="spin" size={18} />
      </div>
      <strong>Generating tool plan</strong>
      <span>Planner is extracting proposed calls before the gateway checks them.</span>
      <div className="planning-lanes">
        {steps.map((step, index) => (
          <div className="planning-lane" key={step} style={{ "--delay": `${index * 120}ms` } as CSSProperties & Record<"--delay", string>}>
            <ScanLine size={14} />
            <span>{step}</span>
            <i />
          </div>
        ))}
      </div>
    </div>
  );
}

function toMachineResult(result: GatewayEvaluationResult): GuardedRunResult {
  return {
    runId: result.runId,
    agent: result.agent,
    email: {
      id: result.runId,
      emailId: result.sourceName,
      fromName: result.sourceName,
      fromEmail: `${result.sourceType}@untrusted.source`,
      customerName: result.sourceName,
      subject: result.userGoal,
      content: result.sourceContent,
      scenario: "Gateway attack replay",
      riskLabel: result.status === "COMPLETED" ? "LOW" : "HIGH",
      receivedAt: new Date().toISOString(),
      customer: null
    },
    customer: null,
    status: result.status,
    riskScore: result.riskScore,
    decisionSummary: result.decisionSummary,
    liveTimeline: result.toolCalls.map((tool) => ({
      title: `${tool.sequence}. ${tool.toolName}`,
      detail: `${tool.policyName}: ${tool.reasons[0]}`,
      state:
        tool.policyDecision === "BLOCKED"
          ? "blocked"
          : tool.policyDecision === "NOT_REACHED"
            ? "skipped"
            : tool.policyDecision === "APPROVAL_REQUIRED"
              ? "approval"
              : "complete"
    })),
    toolCalls: result.toolCalls,
    finalReport: result.finalReport,
    approvalRequests: result.approvalRequests,
    incident: result.findings[0]
      ? {
          title: result.findings[0].name,
          severity: result.findings[0].severity,
          category: result.findings[0].id,
          description: result.decisionSummary,
          evidence: result.findings[0].evidence
      }
      : null,
    aiPlannerUsed: result.planner.mode === "llm",
    planner: result.planner
  };
}
