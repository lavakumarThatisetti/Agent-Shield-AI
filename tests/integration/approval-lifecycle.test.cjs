const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { createJiti } = require("jiti");

const testDatabaseUrl = process.env.AGENTSHIELD_TEST_DATABASE_URL;

test("approval review releases held tool and downstream execution under audit", { skip: !testDatabaseUrl }, async () => {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.AGENTSHIELD_AUTO_SEED = "false";

  const jiti = createJiti(__filename, { alias: { "@": path.resolve(__dirname, "../..") } });
  const { prisma } = jiti("../../lib/prisma.ts");
  const { PATCH } = jiti("../../app/api/approvals/[id]/route.ts");
  const suffix = Date.now().toString(36);

  const agent = await prisma.agentIdentity.create({
    data: {
      agentKey: `approval-test-${suffix}`,
      displayName: "Approval Test Agent",
      provider: "Test",
      modelName: "Test runtime",
      environment: "Test",
      sponsorName: "Reviewer",
      sponsorEmail: "reviewer@example.com",
      purpose: "Verify approval lifecycle.",
      status: "ACTIVE",
      riskTier: "HIGH",
      allowedTools: ["send_email", "draft_customer_reply"],
      deniedActions: [],
      dataBoundary: {
        allowed: ["support inbox"],
        approvalRequired: ["external email send"],
        prohibited: []
      }
    }
  });

  try {
    const run = await prisma.agentRun.create({
      data: {
        agentId: agent.id,
        userTask: "Send reviewed customer response.",
        sourceType: "email",
        sourceContent: "Please send me the next steps.",
        plan: ["send_email", "draft_customer_reply"],
        plannerMode: "deterministic",
        plannerModel: "test-planner",
        plannerSummary: "Integration test planner.",
        riskScore: 68,
        status: "APPROVAL_REQUIRED",
        decisionSummary: "send_email held for approval.",
        reasons: ["This tool effect is permitted only through a human approval checkpoint."],
        toolCalls: {
          create: [
            {
              sequence: 1,
              toolName: "send_email",
              requestedBy: "Approval Test Agent",
              stage: "Gateway evaluated",
              description: "Send customer response.",
              input: { to: "customer@example.com" },
              output: { held: true },
              evidence: "Untrusted email requested external send.",
              policyName: "Human approval checkpoint",
              riskScore: 68,
              policyDecision: "APPROVAL_REQUIRED",
              reasons: ["This tool effect is permitted only through a human approval checkpoint."]
            },
            {
              sequence: 2,
              toolName: "draft_customer_reply",
              requestedBy: "Approval Test Agent",
              stage: "Not reached",
              description: "Draft downstream reply.",
              input: { customerName: "Alex" },
              output: { skipped: true },
              evidence: "Runtime halted at tool 1: send_email.",
              policyName: "Downstream execution gate",
              riskScore: 0,
              policyDecision: "NOT_REACHED",
              reasons: ["Skipped because send_email requires approval."]
            }
          ]
        }
      },
      include: { toolCalls: true }
    });

    const heldTool = run.toolCalls.find((tool) => tool.policyDecision === "APPROVAL_REQUIRED");
    const approval = await prisma.approvalRequest.create({
      data: {
        agentId: agent.id,
        runId: run.id,
        toolCallId: heldTool.id,
        status: "PENDING",
        requestedAction: "send_email",
        policyName: "Human approval checkpoint",
        riskScore: 68,
        reason: "External send requires approval.",
        evidence: "Untrusted email requested external send."
      }
    });

    const response = await PATCH(
      new Request("http://agentshield.test/api/approvals", {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED", reviewerName: "Test Reviewer", reviewerNote: "Approved for test." })
      }),
      { params: Promise.resolve({ id: approval.id }) }
    );

    assert.equal(response.status, 200);

    const updatedRun = await prisma.agentRun.findUniqueOrThrow({
      where: { id: run.id },
      include: { toolCalls: { orderBy: { sequence: "asc" } }, approvals: true }
    });

    assert.equal(updatedRun.status, "APPROVED");
    assert.equal(updatedRun.approvals[0].status, "APPROVED");
    assert.equal(updatedRun.toolCalls[0].policyDecision, "APPROVED");
    assert.equal(updatedRun.toolCalls[1].policyDecision, "ALLOWED");
    assert.match(updatedRun.plannerSummary, /Integration test planner/);
  } finally {
    await prisma.agentIdentity.delete({ where: { id: agent.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
