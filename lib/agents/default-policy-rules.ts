import { toPrismaJson } from "@/lib/json";

type AgentRuleSource = {
  allowedTools: string[];
  deniedActions: string[];
  dataBoundary: {
    approvalRequired: string[];
  };
};

export function buildDefaultPolicyRules(agentId: string, source: AgentRuleSource) {
  return [
    {
      agentId,
      name: "Declared tool allow-list",
      description: "Only tools declared in the active agent identity may be requested at runtime.",
      action: "declared_tool_boundary",
      effect: "ALLOW" as const,
      severity: "LOW" as const,
      conditions: toPrismaJson({ tools: source.allowedTools })
    },
    {
      agentId,
      name: "Human approval checkpoint",
      description: "Sensitive side effects require an operator checkpoint before downstream execution can continue.",
      action: "human_approval_boundary",
      effect: "REQUIRE_APPROVAL" as const,
      severity: "MEDIUM" as const,
      conditions: toPrismaJson({ data: source.dataBoundary.approvalRequired })
    },
    {
      agentId,
      name: "Explicit deny boundary",
      description: "Denied tools and high-risk actions are stopped before execution.",
      action: "explicit_deny_boundary",
      effect: "DENY" as const,
      severity: "HIGH" as const,
      conditions: toPrismaJson({ tools: source.deniedActions })
    }
  ];
}
