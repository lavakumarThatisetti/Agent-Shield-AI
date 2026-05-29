import type { AgentSnapshot } from "@/lib/agents/snapshot";
import { getToolManifest } from "@/lib/gateway/tool-registry";
import type { GatewayFinding, GatewayToolDecision, GatewayToolProposal, ThreatContext, ToolManifest } from "@/lib/gateway/types";

export function evaluateToolPolicy({
  agent,
  sourceType,
  threat,
  tool,
  sequence
}: {
  agent: AgentSnapshot;
  sourceType: string;
  threat: ThreatContext;
  tool: GatewayToolProposal;
  sequence: number;
}): GatewayToolDecision {
  const manifest = getToolManifest(tool.toolName);
  const findings = [...threat.findings];
  const reasons: string[] = [];
  let policyDecision: GatewayToolDecision["policyDecision"] = "ALLOWED";
  let policyName = "Least agency boundary";
  let riskScore = manifest.baseRisk + threat.tags.length * riskWeightFor(manifest);

  if (!agent.allowedTools.includes(tool.toolName)) {
    policyDecision = "BLOCKED";
    policyName = "Tool boundary enforcement";
    riskScore = Math.max(riskScore, 86);
    reasons.push(`${manifest.label} is not declared in this agent identity's allowed tool manifest.`);
    findings.push({
      id: "ASI02",
      name: "Tool Misuse",
      severity: "HIGH",
      evidence: `Unexpected tool requested: ${tool.toolName}`
    });
  }

  if (agent.deniedActions.includes(tool.toolName)) {
    policyDecision = "BLOCKED";
    policyName = "Explicit deny list";
    riskScore = Math.max(riskScore, 92);
    reasons.push(`${manifest.label} is explicitly denied for this agent.`);
  }

  if (touchesProhibitedData(agent, tool, manifest)) {
    policyDecision = "BLOCKED";
    policyName = "Data boundary enforcement";
    riskScore = Math.max(riskScore, 88);
    reasons.push("Tool input requests data outside this agent's permitted data boundary.");
  }

  if (shouldBlockForThreat(manifest, threat.tags)) {
    policyDecision = "BLOCKED";
    policyName = policyNameForThreat(threat.tags, manifest);
    riskScore = Math.max(riskScore, 90);
    reasons.push(reasonForThreat(threat.tags, manifest));
  }

  if (policyDecision === "ALLOWED" && shouldRequireApproval(agent, tool, manifest)) {
    policyDecision = "APPROVAL_REQUIRED";
    policyName = "Human approval checkpoint";
    riskScore = Math.max(riskScore, 64);
    reasons.push("This tool effect is permitted only through a human approval checkpoint.");
  }

  return {
    ...tool,
    sequence,
    requestedBy: tool.requestedBy ?? agent.displayName,
    stage: "Gateway evaluated",
    output: outputFor(policyDecision, manifest.label),
    evidence: threat.evidence || `Source type ${sourceType} was evaluated as untrusted context.`,
    policyName,
    riskScore: Math.min(riskScore, 100),
    policyDecision,
    reasons: reasons.length ? unique(reasons) : ["Tool call matches the agent manifest, tool manifest, and data boundary."],
    findings: uniqueFindings(findings)
  };
}

export function markToolNotReached(
  tool: GatewayToolProposal,
  sequence: number,
  agent: AgentSnapshot,
  haltedBy: GatewayToolDecision
): GatewayToolDecision {
  const manifest = getToolManifest(tool.toolName);
  const gate = haltedBy.policyDecision === "APPROVAL_REQUIRED" ? "approval checkpoint" : "blocked branch";

  return {
    ...tool,
    sequence,
    requestedBy: tool.requestedBy ?? agent.displayName,
    stage: "Not reached",
    output: { skipped: true, message: `${manifest.label} was not reached because ${haltedBy.toolName} triggered a ${gate}.` },
    evidence: `Runtime halted at tool ${haltedBy.sequence}: ${haltedBy.toolName}.`,
    policyName: "Downstream execution gate",
    riskScore: 0,
    policyDecision: "NOT_REACHED",
    reasons: [`Skipped because ${haltedBy.toolName} ${haltedBy.policyDecision === "APPROVAL_REQUIRED" ? "requires approval" : "was blocked"}.`],
    findings: []
  };
}

function shouldRequireApproval(agent: AgentSnapshot, tool: GatewayToolProposal, manifest: ToolManifest) {
  if (manifest.requiresApproval) return true;
  const requestedData = new Set([...(tool.dataAccess ?? []), ...manifest.dataClasses]);
  return agent.dataBoundary.approvalRequired.some((item) => requestedData.has(item));
}

function touchesProhibitedData(agent: AgentSnapshot, tool: GatewayToolProposal, manifest: ToolManifest) {
  const requestedData = new Set([...(tool.dataAccess ?? []), ...manifest.dataClasses]);
  return agent.dataBoundary.prohibited.some((item) => requestedData.has(item));
}

function shouldBlockForThreat(manifest: ToolManifest, tags: string[]) {
  if (tags.includes("credential_access") && manifest.dataClasses.includes("credential")) return true;
  if (tags.includes("exfiltration") && (manifest.effect === "bulk_export" || manifest.destination === "external")) return true;
  if (tags.includes("indirect_prompt_injection") && highImpactEffects.has(manifest.effect)) return true;
  if (tags.includes("destructive_action") && highImpactEffects.has(manifest.effect)) return true;
  return false;
}

function policyNameForThreat(tags: string[], manifest: ToolManifest) {
  if (tags.includes("exfiltration") || manifest.effect === "bulk_export") return "Data exfiltration shield";
  if (tags.includes("destructive_action")) return "Destructive action shield";
  if (tags.includes("credential_access")) return "Credential access shield";
  return "Prompt-injection isolation";
}

function reasonForThreat(tags: string[], manifest: ToolManifest) {
  if (tags.includes("exfiltration") || manifest.effect === "bulk_export") {
    return "Gateway blocked data movement from untrusted or adversarial context.";
  }

  if (tags.includes("credential_access")) {
    return "Gateway blocked a credential or secret access path.";
  }

  if (tags.includes("destructive_action")) {
    return "Autonomous destructive or financial state changes are outside this identity boundary.";
  }

  return "Untrusted content attempted to influence a high-impact tool call.";
}

function riskWeightFor(manifest: ToolManifest) {
  if (highImpactEffects.has(manifest.effect)) return 14;
  if (manifest.sideEffect) return 8;
  return 3;
}

function outputFor(decision: GatewayToolDecision["policyDecision"], label: string) {
  if (decision === "ALLOWED") return { permitted: true, message: `${label} may execute.` };
  if (decision === "APPROVAL_REQUIRED") return { held: true, message: `${label} paused for human approval.` };
  if (decision === "NOT_REACHED") return { skipped: true, message: `${label} was not reached.` };
  return { blocked: true, message: `${label} blocked before execution.` };
}

const highImpactEffects = new Set<ToolManifest["effect"]>([
  "external_send",
  "bulk_export",
  "code_execution",
  "destructive_update",
  "financial_update"
]);

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
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
