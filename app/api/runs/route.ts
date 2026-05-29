import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeJson } from "@/lib/json";
import { ensureDemoDataForDevelopment } from "@/lib/seed";

export async function GET() {
  await ensureDemoDataForDevelopment();

  const runs = await prisma.agentRun.findMany({
    take: 12,
    orderBy: { createdAt: "desc" },
    include: {
      agent: true,
      emailMessage: true,
      toolCalls: { orderBy: { sequence: "asc" } },
      incidents: true
    }
  });

  return NextResponse.json({
    runs: runs.map((run) => ({
      id: run.id,
      agentName: run.agent.displayName,
      agentKey: run.agent.agentKey,
      userTask: run.userTask,
      sourceType: run.sourceType,
      emailSubject: run.emailMessage?.subject,
      riskScore: run.riskScore,
      status: run.status,
      decisionSummary: run.decisionSummary,
      plannerMode: run.plannerMode,
      plannerModel: run.plannerModel,
      plannerSummary: run.plannerSummary,
      reasons: decodeJson<string[]>(run.reasons, []),
      plan: decodeJson<string[]>(run.plan, []),
      createdAt: run.createdAt,
      toolCalls: run.toolCalls.map((tool) => ({
        id: tool.id,
        sequence: tool.sequence,
        toolName: tool.toolName,
        requestedBy: tool.requestedBy,
        stage: tool.stage,
        description: tool.description,
        input: decodeJson<Record<string, unknown>>(tool.input, {}),
        output: decodeJson<Record<string, unknown>>(tool.output, {}),
        evidence: tool.evidence,
        policyName: tool.policyName,
        riskScore: tool.riskScore,
        policyDecision: tool.policyDecision,
        reasons: decodeJson<string[]>(tool.reasons, [])
      })),
      incidents: run.incidents.map((incident) => ({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        category: incident.category,
        description: incident.description,
        evidence: incident.evidence,
        createdAt: incident.createdAt
      }))
    }))
  });
}
