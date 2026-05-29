import { evaluateToolPolicy, markToolNotReached } from "@/lib/gateway/policy-engine";
import { buildThreatContext, severityScore } from "@/lib/gateway/threat-detection";
import type { GatewayEvaluationInput, GatewayEvaluationResult, GatewayFinding, GatewayToolDecision } from "@/lib/gateway/types";

export type {
  GatewayEvaluationInput,
  GatewayEvaluationResult,
  GatewayFinding,
  GatewayToolDecision,
  GatewayToolProposal
} from "@/lib/gateway/types";

export function evaluateGatewayRequest(input: GatewayEvaluationInput): GatewayEvaluationResult {
  const threat = buildThreatContext(input.userGoal, input.sourceContent);
  const toolCalls: GatewayToolDecision[] = [];
  let haltedBy: GatewayToolDecision | null = null;

  for (const [index, tool] of input.proposedToolCalls.entries()) {
    if (haltedBy) {
      toolCalls.push(markToolNotReached(tool, index + 1, input.agent, haltedBy));
      continue;
    }

    const decision = evaluateToolPolicy({
      agent: input.agent,
      sourceType: input.sourceType,
      threat,
      tool,
      sequence: index + 1
    });
    toolCalls.push(decision);

    if (decision.policyDecision === "BLOCKED" || decision.policyDecision === "APPROVAL_REQUIRED") {
      haltedBy = decision;
    }
  }

  const status = statusFor(toolCalls);
  const riskScore = riskScoreFor(toolCalls, threat.findings);
  const decisionSummary = summarizeDecision(status, riskScore, toolCalls);

  return {
    agent: input.agent,
    userGoal: input.userGoal,
    sourceType: input.sourceType,
    sourceName: input.sourceName ?? input.sourceType,
    sourceContent: input.sourceContent,
    status,
    riskScore,
    decisionSummary,
    threatTags: threat.tags,
    findings: uniqueFindings([...threat.findings, ...toolCalls.flatMap((tool) => tool.findings)]),
    toolCalls,
    planner: input.planner ?? {
      mode: "deterministic",
      model: "unknown",
      summary: "Gateway evaluated a supplied tool plan."
    },
    finalReport: buildFinalReport(status, riskScore, toolCalls, input.agent.displayName)
  };
}

function statusFor(toolCalls: GatewayToolDecision[]): GatewayEvaluationResult["status"] {
  if (toolCalls.some((tool) => tool.policyDecision === "BLOCKED")) return "BLOCKED";
  if (toolCalls.some((tool) => tool.policyDecision === "APPROVAL_REQUIRED")) return "APPROVAL_REQUIRED";
  return "COMPLETED";
}

function riskScoreFor(toolCalls: GatewayToolDecision[], findings: GatewayFinding[]) {
  return Math.min(100, Math.max(18, ...toolCalls.map((tool) => tool.riskScore), ...findings.map((finding) => severityScore(finding.severity))));
}

function buildFinalReport(status: GatewayEvaluationResult["status"], riskScore: number, toolCalls: GatewayToolDecision[], agentName: string) {
  const completed = toolCalls.filter((tool) => tool.policyDecision === "ALLOWED").map((tool) => tool.toolName);
  const blocked = toolCalls.filter((tool) => tool.policyDecision === "BLOCKED").map((tool) => tool.toolName);
  const approvals = toolCalls.filter((tool) => tool.policyDecision === "APPROVAL_REQUIRED").map((tool) => tool.toolName);
  const notReached = toolCalls.filter((tool) => tool.policyDecision === "NOT_REACHED").map((tool) => tool.toolName);

  return {
    executiveSummary:
      status === "BLOCKED"
        ? `AgentShield blocked ${blocked.length} unsafe tool call${blocked.length === 1 ? "" : "s"} before ${agentName} could execute them.`
        : status === "APPROVAL_REQUIRED"
          ? `AgentShield paused execution at ${approvals[0] ?? "an approval checkpoint"} and prevented downstream tools from running.`
          : `AgentShield allowed every proposed tool call inside ${agentName}'s manifest.`,
    actionsCompleted: completed,
    actionsBlocked: blocked,
    approvalsRequired: approvals,
    actionsNotReached: notReached,
    businessOutcome: `Risk score ${riskScore}/100. Decision includes identity, policy, data-boundary, and attack-signal evidence.`,
    auditId: ""
  };
}

function summarizeDecision(status: GatewayEvaluationResult["status"], riskScore: number, toolCalls: GatewayToolDecision[]) {
  const blocked = toolCalls.filter((tool) => tool.policyDecision === "BLOCKED").length;
  const approvals = toolCalls.filter((tool) => tool.policyDecision === "APPROVAL_REQUIRED").length;
  const notReached = toolCalls.filter((tool) => tool.policyDecision === "NOT_REACHED").length;
  if (status === "BLOCKED") return `${blocked} tool call${blocked === 1 ? "" : "s"} stopped by runtime gateway. Risk ${riskScore}/100.`;
  if (status === "APPROVAL_REQUIRED") return `${approvals} tool call${approvals === 1 ? "" : "s"} held for approval; ${notReached} downstream step${notReached === 1 ? "" : "s"} not reached. Risk ${riskScore}/100.`;
  return `All proposed tool calls passed the runtime gateway. Risk ${riskScore}/100.`;
}

function uniqueFindings(findings: GatewayFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.id}:${finding.name}:${finding.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
