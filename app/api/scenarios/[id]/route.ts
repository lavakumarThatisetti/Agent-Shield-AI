import { NextResponse } from "next/server";
import type { AgentIdentity, RuntimeScenario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";

const scenarioSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(2),
  agentId: z.string().min(1).nullable().optional(),
  userGoal: z.string().min(3),
  sourceType: z.string().min(2),
  sourceName: z.string().min(2),
  sourceContent: z.string().min(8),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE")
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDemoDataForDevelopment();

  const { id } = await context.params;
  const parsed = scenarioSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid runtime scenario.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.runtimeScenario.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Runtime scenario not found." }, { status: 404 });
  }

  if (parsed.data.agentId) {
    const agent = await prisma.agentIdentity.findUnique({ where: { id: parsed.data.agentId } });
    if (!agent) return NextResponse.json({ error: "Agent identity not found." }, { status: 404 });
  }

  const scenario = await prisma.runtimeScenario.update({
    where: { id },
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      agentId: parsed.data.agentId ?? null,
      userGoal: parsed.data.userGoal,
      sourceType: parsed.data.sourceType,
      sourceName: parsed.data.sourceName,
      sourceContent: parsed.data.sourceContent,
      status: parsed.data.status
    },
    include: { agent: true }
  });

  return NextResponse.json({ scenario: toScenarioDto(scenario) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDemoDataForDevelopment();

  const { id } = await context.params;
  const existing = await prisma.runtimeScenario.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Runtime scenario not found." }, { status: 404 });
  }

  const scenario = await prisma.runtimeScenario.update({
    where: { id },
    data: { status: "ARCHIVED" },
    include: { agent: true }
  });

  return NextResponse.json({ scenario: toScenarioDto(scenario) });
}

type ScenarioWithAgent = RuntimeScenario & { agent: AgentIdentity | null };

function toScenarioDto(scenario: ScenarioWithAgent) {
  return {
    id: scenario.id,
    scenarioKey: scenario.scenarioKey,
    title: scenario.title,
    category: scenario.category,
    agentId: scenario.agentId,
    agentKey: scenario.agent?.agentKey,
    agentName: scenario.agent?.displayName,
    userGoal: scenario.userGoal,
    sourceType: scenario.sourceType,
    sourceName: scenario.sourceName,
    sourceContent: scenario.sourceContent,
    status: scenario.status,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt
  };
}
