import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";

export async function GET() {
  await ensureDemoDataForDevelopment();

  const incidents = await prisma.securityIncident.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      agent: true,
      run: {
        include: {
          emailMessage: true
        }
      }
    }
  });

  return NextResponse.json({
    incidents: incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      severity: incident.severity,
      category: incident.category,
      description: incident.description,
      evidence: incident.evidence,
      createdAt: incident.createdAt,
      agentName: incident.agent?.displayName ?? "Unknown agent",
      emailSubject: incident.run?.emailMessage?.subject ?? "Unknown source"
    }))
  });
}
