import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";
import { toAgentSnapshot } from "@/lib/agents/snapshot";
import { evaluateGatewayRequest } from "@/lib/gateway/evaluate";
import { planGatewayToolCalls } from "@/lib/gateway/planner";

const requestSchema = z.object({
  agentId: z.string().min(1),
  userGoal: z.string().min(3),
  sourceType: z.string().min(2),
  sourceName: z.string().optional(),
  sourceContent: z.string().min(1)
});

export async function POST(request: Request) {
  await ensureDemoDataForDevelopment();

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid gateway evaluation request.", details: parsed.error.flatten() }, { status: 400 });
  }

  const agentRecord = await prisma.agentIdentity.findUnique({
    where: { id: parsed.data.agentId },
    include: { policyRules: true }
  });

  if (!agentRecord) {
    return NextResponse.json({ error: "Agent identity not found." }, { status: 404 });
  }

  const agent = toAgentSnapshot(agentRecord);
  const plan = await planGatewayToolCalls({
    agent,
    userGoal: parsed.data.userGoal,
    sourceType: parsed.data.sourceType,
    sourceName: parsed.data.sourceName,
    sourceContent: parsed.data.sourceContent
  });
  const evaluation = evaluateGatewayRequest({
    agent,
    userGoal: parsed.data.userGoal,
    sourceType: parsed.data.sourceType,
    sourceName: parsed.data.sourceName,
    sourceContent: parsed.data.sourceContent,
    proposedToolCalls: plan.proposedToolCalls,
    planner: {
      mode: plan.mode,
      model: plan.model,
      summary: plan.summary
    }
  });

  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      userTask: evaluation.userGoal,
      sourceType: evaluation.sourceType,
      sourceContent: evaluation.sourceContent,
      plan: evaluation.toolCalls.map((tool) => tool.toolName),
      plannerMode: evaluation.planner.mode,
      plannerModel: evaluation.planner.model,
      plannerSummary: evaluation.planner.summary,
      riskScore: evaluation.riskScore,
      status: evaluation.status,
      decisionSummary: evaluation.decisionSummary,
      reasons: unique(evaluation.toolCalls.flatMap((tool) => tool.reasons)),
      toolCalls: {
        create: evaluation.toolCalls.map((tool) => ({
          sequence: tool.sequence,
          toolName: tool.toolName,
          requestedBy: tool.requestedBy,
          stage: tool.stage,
          description: tool.description,
          input: tool.input,
          output: tool.output,
          evidence: tool.evidence,
          policyName: tool.policyName,
          riskScore: tool.riskScore,
          policyDecision: tool.policyDecision,
          reasons: tool.reasons
        }))
      },
      incidents:
        evaluation.status === "BLOCKED"
          ? {
              create: {
                agentId: agent.id,
                title: `${evaluation.findings[0]?.name ?? "Runtime policy"} ${evaluation.status === "BLOCKED" ? "blocked" : "held"}`,
                severity: evaluation.riskScore >= 80 ? "HIGH" : "MEDIUM",
                category: evaluation.findings[0]?.name ?? "Gateway Policy",
                description: evaluation.decisionSummary,
                evidence: evaluation.findings[0]?.evidence ?? evaluation.sourceContent.slice(0, 240)
              }
            }
          : undefined
    },
    include: { toolCalls: true }
  });

  const approvalToolCalls = evaluation.toolCalls.filter((tool) => tool.policyDecision === "APPROVAL_REQUIRED");
  const approvalRequests = [];
  if (approvalToolCalls.length) {
    for (const tool of approvalToolCalls) {
      const persistedTool = run.toolCalls.find((candidate) => candidate.sequence === tool.sequence);

      approvalRequests.push(
        await prisma.approvalRequest.create({
          data: {
            agentId: agent.id,
            runId: run.id,
            toolCallId: persistedTool?.id ?? null,
            requestedAction: tool.toolName,
            policyName: tool.policyName,
            riskScore: tool.riskScore,
            reason: tool.reasons[0] ?? "Tool call requires a human approval checkpoint.",
            evidence: tool.evidence
          }
        })
      );
    }
  }

  return NextResponse.json({
    ...evaluation,
    runId: run.id,
    approvalRequests: approvalRequests.map((approval) => ({
      id: approval.id,
      toolName: approval.requestedAction,
      status: approval.status
    })),
    finalReport: { ...evaluation.finalReport, auditId: run.id }
  });
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}
