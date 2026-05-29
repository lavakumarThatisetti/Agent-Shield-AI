import type { AgentSnapshot } from "@/lib/agents/snapshot";

export type GatewayDecision = "ALLOWED" | "BLOCKED" | "APPROVAL_REQUIRED" | "NOT_REACHED";
export type GatewayStatus = "COMPLETED" | "BLOCKED" | "APPROVAL_REQUIRED";
export type FindingSeverity = "LOW" | "MEDIUM" | "HIGH";
export type PlannerMode = "llm" | "deterministic";

export type GatewayToolProposal = {
  toolName: string;
  description: string;
  input: Record<string, unknown>;
  requestedBy?: string;
  target?: string;
  dataAccess?: string[];
};

export type GatewayFinding = {
  id: string;
  name: string;
  severity: FindingSeverity;
  evidence: string;
};

export type GatewayToolDecision = GatewayToolProposal & {
  sequence: number;
  requestedBy: string;
  stage: string;
  output: Record<string, unknown>;
  evidence: string;
  policyName: string;
  riskScore: number;
  policyDecision: GatewayDecision;
  reasons: string[];
  findings: GatewayFinding[];
};

export type GatewayEvaluationInput = {
  agent: AgentSnapshot;
  userGoal: string;
  sourceType: string;
  sourceName?: string;
  sourceContent: string;
  proposedToolCalls: GatewayToolProposal[];
  planner?: {
    mode: PlannerMode;
    model: string;
    summary: string;
  };
};

export type GatewayEvaluationResult = {
  agent: AgentSnapshot;
  userGoal: string;
  sourceType: string;
  sourceName: string;
  sourceContent: string;
  status: GatewayStatus;
  riskScore: number;
  decisionSummary: string;
  threatTags: string[];
  findings: GatewayFinding[];
  toolCalls: GatewayToolDecision[];
  planner: {
    mode: PlannerMode;
    model: string;
    summary: string;
  };
  finalReport: {
    executiveSummary: string;
    actionsCompleted: string[];
    actionsBlocked: string[];
    approvalsRequired: string[];
    actionsNotReached: string[];
    businessOutcome: string;
    auditId: string;
  };
};

export type ToolEffect =
  | "read"
  | "internal_write"
  | "external_send"
  | "bulk_export"
  | "code_execution"
  | "destructive_update"
  | "financial_update";

export type DataClass =
  | "public"
  | "support_context"
  | "customer_profile"
  | "customer_record"
  | "bulk_customer_records"
  | "research_note"
  | "invoice"
  | "vendor_profile"
  | "financial_account"
  | "credential"
  | "local_system";

export type ToolManifest = {
  toolName: string;
  label: string;
  category: string;
  effect: ToolEffect;
  dataClasses: DataClass[];
  sideEffect: boolean;
  destination: "none" | "internal" | "external" | "unknown";
  requiresApproval: boolean;
  baseRisk: number;
};

export type ThreatContext = {
  tags: string[];
  findings: GatewayFinding[];
  evidence: string;
};
