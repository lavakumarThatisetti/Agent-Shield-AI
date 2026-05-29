import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataForDevelopment } from "@/lib/seed";

export async function GET() {
  await ensureDemoDataForDevelopment();

  const emails = await prisma.emailMessage.findMany({
    include: { customer: true },
    orderBy: { receivedAt: "asc" }
  });

  return NextResponse.json({
    emails: emails.map((email) => ({
      id: email.id,
      emailId: email.emailId,
      fromName: email.fromName,
      fromEmail: email.fromEmail,
      customerName: email.customerName,
      subject: email.subject,
      content: email.content,
      scenario: email.scenario,
      riskLabel: email.riskLabel,
      receivedAt: email.receivedAt,
      customer: email.customer
        ? {
            id: email.customer.id,
            externalId: email.customer.externalId,
            name: email.customer.name,
            email: email.customer.email,
            company: email.customer.company,
            plan: email.customer.plan,
            healthScore: email.customer.healthScore,
            openTickets: email.customer.openTickets,
            annualValue: email.customer.annualValue,
            notes: email.customer.notes
          }
        : null
    }))
  });
}
