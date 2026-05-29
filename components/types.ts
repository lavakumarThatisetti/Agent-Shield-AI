export type Agent = {
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
  dataBoundary: {
    allowed: string[];
    approvalRequired: string[];
    prohibited: string[];
  };
  policyRules: Array<{
    id: string;
    name: string;
    description: string;
    action: string;
    effect: string;
    severity: string;
  }>;
};

export type EmailMessage = {
  id: string;
  emailId: string;
  fromName: string;
  fromEmail: string;
  customerName: string;
  subject: string;
  content: string;
  scenario: string;
  riskLabel: string;
  receivedAt: string;
  customer: CustomerProfile | null;
};

export type CustomerProfile = {
  id: string;
  externalId: string;
  name: string;
  email: string;
  company: string;
  plan: string;
  healthScore: number;
  openTickets: number;
  annualValue: number;
  notes: string;
};

export type ToolDecision = "ALLOWED" | "BLOCKED" | "APPROVAL_REQUIRED" | "NOT_REACHED" | "APPROVED" | "DENIED";
export type PlannerMode = "llm" | "deterministic";

export type GuardedToolCall = {
  sequence: number;
  toolName: string;
  requestedBy: string;
  stage: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  evidence: string;
  policyName: string;
  riskScore: number;
  policyDecision: ToolDecision;
  reasons: string[];
};

export type GuardedRunResult = {
  runId: string;
  agent: Agent;
  email: EmailMessage;
  customer: CustomerProfile | null;
  status: "COMPLETED" | "BLOCKED" | "APPROVAL_REQUIRED" | "APPROVED" | "DENIED";
  riskScore: number;
  decisionSummary: string;
  liveTimeline: Array<{
    title: string;
    detail: string;
    state: "complete" | "blocked" | "approval" | "skipped";
  }>;
  toolCalls: GuardedToolCall[];
  finalReport: {
    executiveSummary: string;
    actionsCompleted: string[];
    actionsBlocked: string[];
    approvalsRequired: string[];
    actionsNotReached?: string[];
    businessOutcome: string;
    auditId: string;
  };
  approvalRequests?: Array<{
    id: string;
    toolName: string;
    status: string;
  }>;
  incident: null | {
    title: string;
    severity: string;
    category: string;
    description: string;
    evidence: string;
  };
  aiPlannerUsed: boolean;
  planner?: {
    mode: PlannerMode;
    model: string;
    summary: string;
  };
};

export type GatewayFinding = {
  id: string;
  name: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  evidence: string;
};

export type GatewayToolProposal = {
  toolName: string;
  description: string;
  input: Record<string, unknown>;
  requestedBy?: string;
  target?: string;
  dataAccess?: string[];
};

export type GatewayEvaluationResult = {
  runId: string;
  approvalRequests?: Array<{
    id: string;
    toolName: string;
    status: string;
  }>;
  agent: Agent;
  userGoal: string;
  sourceType: string;
  sourceName: string;
  sourceContent: string;
  status: "COMPLETED" | "BLOCKED" | "APPROVAL_REQUIRED" | "APPROVED" | "DENIED";
  riskScore: number;
  decisionSummary: string;
  threatTags: string[];
  findings: GatewayFinding[];
  toolCalls: Array<GuardedToolCall & { findings: GatewayFinding[] }>;
  planner: {
    mode: PlannerMode;
    model: string;
    summary: string;
  };
  finalReport: GuardedRunResult["finalReport"];
};

export type RuntimeScenario = {
  id: string;
  scenarioKey: string;
  title: string;
  category: string;
  agentId: string | null;
  agentKey?: string;
  agentName?: string;
  userGoal: string;
  sourceType: string;
  sourceName: string;
  sourceContent: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditRun = {
  id: string;
  agentName: string;
  agentKey: string;
  userTask: string;
  sourceType: string;
  emailSubject?: string;
  riskScore: number;
  status: string;
  decisionSummary: string;
  plannerMode: PlannerMode;
  plannerModel: string;
  plannerSummary: string;
  reasons: string[];
  plan: string[];
  createdAt: string;
  toolCalls: Array<GuardedToolCall & { id: string }>;
  incidents: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    description: string;
    evidence: string;
    createdAt: string;
  }>;
};

export type Incident = {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string;
  createdAt: string;
  agentName: string;
  emailSubject: string;
};

export type ApprovalRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  requestedAction: string;
  policyName: string;
  riskScore: number;
  reason: string;
  evidence: string;
  reviewerName: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  runId: string;
  agentName: string;
  agentKey: string;
  sourceType: string;
  userTask: string;
  toolCall: {
    id: string;
    sequence: number;
    toolName: string;
    description: string;
    input: Record<string, unknown>;
  } | null;
};
