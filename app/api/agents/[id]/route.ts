import { NextResponse } from "next/server";
import { z } from "zod";
import { toPrismaJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";
import { buildDefaultPolicyRules } from "@/lib/agents/default-policy-rules";
import { toAgentSnapshot } from "@/lib/agents/snapshot";

const agentSchema = z.object({
  displayName: z.string().min(2),
  provider: z.string().min(2),
  modelName: z.string().min(2),
  environment: z.string().min(2),
  sponsorName: z.string().min(2),
  sponsorEmail: z.string().email(),
  purpose: z.string().min(12),
  status: z.enum(["ACTIVE", "PAUSED", "REVOKED"]),
  riskTier: z.enum(["LOW", "MEDIUM", "HIGH"]),
  allowedTools: z.array(z.string().min(1)).min(1),
  deniedActions: z.array(z.string().min(1)),
  dataBoundary: z.object({
    allowed: z.array(z.string().min(1)),
    approvalRequired: z.array(z.string().min(1)),
    prohibited: z.array(z.string().min(1))
  })
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDemoDataForDevelopment();

  const { id } = await context.params;
  const parsed = agentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid agent identity.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.agentIdentity.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Agent identity not found." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.agentIdentity.update({
      where: { id },
      data: {
        displayName: parsed.data.displayName,
        provider: parsed.data.provider,
        modelName: parsed.data.modelName,
        environment: parsed.data.environment,
        sponsorName: parsed.data.sponsorName,
        sponsorEmail: parsed.data.sponsorEmail,
        purpose: parsed.data.purpose,
        status: parsed.data.status,
        riskTier: parsed.data.riskTier,
        allowedTools: toPrismaJson(parsed.data.allowedTools),
        deniedActions: toPrismaJson(parsed.data.deniedActions),
        dataBoundary: toPrismaJson(parsed.data.dataBoundary)
      }
    }),
    prisma.policyRule.deleteMany({ where: { agentId: id } }),
    prisma.policyRule.createMany({ data: buildDefaultPolicyRules(id, parsed.data) })
  ]);

  const agent = await prisma.agentIdentity.findUniqueOrThrow({
    where: { id },
    include: { policyRules: true }
  });

  return NextResponse.json({ agent: toAgentSnapshot(agent) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDemoDataForDevelopment();

  const { id } = await context.params;
  const existing = await prisma.agentIdentity.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Agent identity not found." }, { status: 404 });
  }

  const agent = await prisma.agentIdentity.update({
    where: { id },
    data: { status: "REVOKED" },
    include: { policyRules: true }
  });

  return NextResponse.json({ agent: toAgentSnapshot(agent) });
}
