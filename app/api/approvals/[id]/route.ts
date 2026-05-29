import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "DENIED"]),
  reviewerName: z.string().trim().min(2).default("Security reviewer"),
  reviewerNote: z.string().trim().max(700).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDemoDataForDevelopment();

  const { id } = await context.params;
  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid approval review.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      agent: true,
      run: {
        include: {
          toolCalls: true
        }
      },
      toolCall: true
    }
  });
  if (!existing) {
    return NextResponse.json({ error: "Approval request not found." }, { status: 404 });
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Approval request has already been reviewed.", approval: existing }, { status: 409 });
  }

  const reviewedAt = new Date();
  const reviewedAtIso = reviewedAt.toISOString();
  const reviewerNote = parsed.data.reviewerNote ?? "";
  const reviewedReason =
    parsed.data.status === "APPROVED"
      ? `Human approval granted by ${parsed.data.reviewerName}${reviewerNote ? `: ${reviewerNote}` : "."}`
      : `Human approval denied by ${parsed.data.reviewerName}${reviewerNote ? `: ${reviewerNote}` : "."}`;

  const approval = await prisma.$transaction(async (tx) => {
    const heldSequence = existing.toolCall?.sequence ?? 0;
    const downstreamTools =
      parsed.data.status === "APPROVED"
        ? existing.run.toolCalls.filter((tool) => tool.sequence > heldSequence && tool.policyDecision === "NOT_REACHED")
        : [];

    const updatedApproval = await tx.approvalRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reviewerName: parsed.data.reviewerName,
        reviewerNote,
        reviewedAt
      }
    });

    if (existing.toolCallId) {
      await tx.toolCall.update({
        where: { id: existing.toolCallId },
        data: {
          stage: parsed.data.status === "APPROVED" ? "Human approved" : "Human denied",
          policyDecision: parsed.data.status,
          policyName: parsed.data.status === "APPROVED" ? "Human approval granted" : "Human approval denied",
          output:
            parsed.data.status === "APPROVED"
              ? { approved: true, released: true, reviewer: parsed.data.reviewerName, reviewedAt: reviewedAtIso }
              : { denied: true, reviewer: parsed.data.reviewerName, reviewedAt: reviewedAtIso },
          reasons: [reviewedReason, existing.reason]
        }
      });
    }

    if (parsed.data.status === "APPROVED") {
      for (const tool of downstreamTools) {
        await tx.toolCall.update({
          where: { id: tool.id },
          data: {
            stage: "Resumed after approval",
            policyDecision: "ALLOWED",
            policyName: "Post-approval execution",
            riskScore: Math.max(tool.riskScore, 18),
            output: {
              resumed: true,
              reviewer: parsed.data.reviewerName,
              reviewedAt: reviewedAtIso,
              message: `${tool.toolName} executed after human approval released ${existing.requestedAction}.`
            },
            reasons: [`Released after human approval for ${existing.requestedAction}.`, existing.reason]
          }
        });
      }
    }

    await tx.agentRun.update({
      where: { id: existing.runId },
      data: {
        status: parsed.data.status,
        decisionSummary:
          parsed.data.status === "APPROVED"
            ? approvedSummary(existing.requestedAction, downstreamTools.length)
            : `${existing.requestedAction} was denied by a human reviewer. Runtime execution remains stopped.`,
        reasons: [reviewedReason, existing.reason]
      }
    });

    if (parsed.data.status === "DENIED") {
      await tx.securityIncident.create({
        data: {
          agentId: existing.agentId,
          runId: existing.runId,
          title: `Human denied ${existing.requestedAction}`,
          severity: existing.riskScore >= 80 ? "HIGH" : "MEDIUM",
          category: "Human Approval Denied",
          description: `${existing.requestedAction} was denied during human review.`,
          evidence: reviewerNote || existing.reason
        }
      });
    }

    return updatedApproval;
  });

  return NextResponse.json({ approval });
}

function approvedSummary(requestedAction: string, downstreamCount: number) {
  if (!downstreamCount) {
    return `${requestedAction} was approved by a human reviewer and released under audit.`;
  }

  return `${requestedAction} was approved by a human reviewer. ${downstreamCount} downstream tool call${downstreamCount === 1 ? "" : "s"} resumed under audit.`;
}
