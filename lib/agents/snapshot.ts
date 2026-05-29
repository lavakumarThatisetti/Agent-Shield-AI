import type { AgentIdentity, PolicyRule } from "@prisma/client";
import { decodeJson } from "@/lib/json";

type AgentWithRules = AgentIdentity & {
  policyRules: PolicyRule[];
};

type DataBoundary = {
  allowed: string[];
  approvalRequired: string[];
  prohibited: string[];
};

export type AgentSnapshot = {
  id: string;
  agentKey: string;
  displayName: string;
  provider: string;
  modelName: string;
  environment: string;
  sponsorName: string;
  sponsorEmail: string;
  purpose: string;
  status: string;
  riskTier: string;
  allowedTools: string[];
  deniedActions: string[];
  dataBoundary: DataBoundary;
  policyRules: Array<{
    id: string;
    name: string;
    description: string;
    action: string;
    effect: string;
    severity: string;
    conditions: Record<string, unknown>;
  }>;
};

export function toAgentSnapshot(agent: AgentWithRules): AgentSnapshot {
  return {
    id: agent.id,
    agentKey: agent.agentKey,
    displayName: agent.displayName,
    provider: agent.provider,
    modelName: agent.modelName,
    environment: agent.environment,
    sponsorName: agent.sponsorName,
    sponsorEmail: agent.sponsorEmail,
    purpose: agent.purpose,
    status: agent.status,
    riskTier: agent.riskTier,
    allowedTools: decodeJson<string[]>(agent.allowedTools, []),
    deniedActions: decodeJson<string[]>(agent.deniedActions, []),
    dataBoundary: decodeJson<DataBoundary>(agent.dataBoundary, {
      allowed: [],
      approvalRequired: [],
      prohibited: []
    }),
    policyRules: agent.policyRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      action: rule.action,
      effect: rule.effect,
      severity: rule.severity,
      conditions: decodeJson<Record<string, unknown>>(rule.conditions, {})
    }))
  };
}
