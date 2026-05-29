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

export async function GET(request: Request) {
  await ensureDemoDataForDevelopment();

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  const scenarios = await prisma.runtimeScenario.findMany({
    where: {
      status: "ACTIVE",
      ...(agentId ? { agentId } : {})
    },
    include: { agent: true },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ scenarios: scenarios.map(toScenarioDto) });
}

export async function POST(request: Request) {
  await ensureDemoDataForDevelopment();

  const parsed = scenarioSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid runtime scenario.", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.agentId) {
    const agent = await prisma.agentIdentity.findUnique({ where: { id: parsed.data.agentId } });
    if (!agent) return NextResponse.json({ error: "Agent identity not found." }, { status: 404 });
  }

  const scenario = await prisma.runtimeScenario.create({
    data: {
      scenarioKey: await uniqueScenarioKey(parsed.data.title),
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

  return NextResponse.json({ scenario: toScenarioDto(scenario) }, { status: 201 });
}

async function uniqueScenarioKey(title: string) {
  const base = slugify(title) || "runtime-scenario";
  let scenarioKey = base;
  let suffix = 1;

  while (await prisma.runtimeScenario.findUnique({ where: { scenarioKey } })) {
    suffix += 1;
    scenarioKey = `${base}-${suffix}`;
  }

  return scenarioKey;
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
