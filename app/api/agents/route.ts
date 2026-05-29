import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";
import { toAgentSnapshot } from "@/lib/agents/snapshot";
import { buildDefaultPolicyRules } from "@/lib/agents/default-policy-rules";

const agentSchema = z.object({
  displayName: z.string().min(2),
  provider: z.string().min(2),
  modelName: z.string().min(2),
  environment: z.string().min(2),
  sponsorName: z.string().min(2),
  sponsorEmail: z.string().email(),
  purpose: z.string().min(12),
  status: z.enum(["ACTIVE", "PAUSED", "REVOKED"]).default("ACTIVE"),
  riskTier: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  allowedTools: z.array(z.string().min(1)).min(1),
  deniedActions: z.array(z.string().min(1)).default([]),
  dataBoundary: z.object({
    allowed: z.array(z.string().min(1)).default([]),
    approvalRequired: z.array(z.string().min(1)).default([]),
    prohibited: z.array(z.string().min(1)).default([])
  })
});

export async function GET() {
  await ensureDemoDataForDevelopment();

  const agents = await prisma.agentIdentity.findMany({
    include: { policyRules: true },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ agents: agents.map(toAgentSnapshot) });
}

export async function POST(request: Request) {
  await ensureDemoDataForDevelopment();

  const parsed = agentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid agent identity.", details: parsed.error.flatten() }, { status: 400 });
  }

  const agentKey = await uniqueAgentKey(parsed.data.displayName);
  const created = await prisma.agentIdentity.create({
    data: {
      agentKey,
      displayName: parsed.data.displayName,
      provider: parsed.data.provider,
      modelName: parsed.data.modelName,
      environment: parsed.data.environment,
      sponsorName: parsed.data.sponsorName,
      sponsorEmail: parsed.data.sponsorEmail,
      purpose: parsed.data.purpose,
      status: parsed.data.status,
      riskTier: parsed.data.riskTier,
      allowedTools: parsed.data.allowedTools,
      deniedActions: parsed.data.deniedActions,
      dataBoundary: parsed.data.dataBoundary
    }
  });

  await prisma.policyRule.createMany({
    data: buildDefaultPolicyRules(created.id, parsed.data)
  });

  const agent = await prisma.agentIdentity.findUniqueOrThrow({
    where: { id: created.id },
    include: { policyRules: true }
  });

  return NextResponse.json({ agent: toAgentSnapshot(agent) }, { status: 201 });
}

async function uniqueAgentKey(displayName: string) {
  const base = slugify(displayName) || "agent";
  let agentKey = base;
  let suffix = 1;

  while (await prisma.agentIdentity.findUnique({ where: { agentKey } })) {
    suffix += 1;
    agentKey = `${base}-${suffix}`;
  }

  return agentKey;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
