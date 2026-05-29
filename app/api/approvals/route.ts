import { NextResponse } from "next/server";
import { decodeJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";

export async function GET() {
  await ensureDemoDataForDevelopment();

  const approvals = await prisma.approvalRequest.findMany({
    take: 40,
    orderBy: { createdAt: "desc" },
    include: {
      agent: true,
      run: true,
      toolCall: true
    }
  });

  return NextResponse.json({
    approvals: approvals
      .map((approval) => ({
        id: approval.id,
        status: approval.status,
        requestedAction: approval.requestedAction,
        policyName: approval.policyName,
        riskScore: approval.riskScore,
        reason: approval.reason,
        evidence: approval.evidence,
        reviewerName: approval.reviewerName,
        reviewerNote: approval.reviewerNote,
        reviewedAt: approval.reviewedAt,
        createdAt: approval.createdAt,
        runId: approval.runId,
        agentName: approval.agent?.displayName ?? "Unknown agent",
        agentKey: approval.agent?.agentKey ?? "unknown-agent",
        sourceType: approval.run.sourceType,
        userTask: approval.run.userTask,
        toolCall: approval.toolCall
          ? {
              id: approval.toolCall.id,
              sequence: approval.toolCall.sequence,
              toolName: approval.toolCall.toolName,
              description: approval.toolCall.description,
              input: decodeJson<Record<string, unknown>>(approval.toolCall.input, {})
            }
          : null
      }))
      .sort((first, second) => statusRank(first.status) - statusRank(second.status))
  });
}

function statusRank(status: string) {
  if (status === "PENDING") return 0;
  if (status === "DENIED") return 1;
  return 2;
}
