import { Code2, Network, ShieldCheck, Webhook } from "lucide-react";

const sdkExample = `const decision = await agentShield.checkToolCall({
  agentId: "claude-support-agent",
  sourceType: "email",
  sourceContent: email.body,
  toolCall: {
    name: "send_email",
    input: { to: "attacker@example.com" }
  }
});

if (decision.status === "ALLOWED") {
  await sendEmail(decision.toolCall.input);
}`;

const requestExample = `{
  "agentId": "agent_identity_id",
  "userGoal": "Triage this inbound request",
  "sourceType": "email",
  "sourceName": "Renewal Operations",
  "sourceContent": "Untrusted content from email, webpage, tool response, or agent message"
}`;

const responseExample = `{
  "status": "BLOCKED | APPROVAL_REQUIRED | COMPLETED",
  "riskScore": 92,
  "toolCalls": [
    {
      "toolName": "export_customer_records",
      "policyDecision": "BLOCKED",
      "policyName": "Data exfiltration shield"
    }
  ],
  "finalReport": {
    "auditId": "run_id"
  }
}`;

export function IntegrationsView() {
  return (
    <section className="surface integrations-surface">
      <div className="surface-heading integrations-heading">
        <div>
          <p className="section-kicker">Deployment surface</p>
          <h2>Connect AgentShield to agent runtimes</h2>
          <span>Use the same gateway decision contract for SDK wrappers, REST callers, MCP tool brokers, and security event pipelines.</span>
        </div>
        <ShieldCheck size={20} />
      </div>

      <div className="integration-grid">
        <article className="integration-card primary">
          <div>
            <Code2 size={18} />
            <span>SDK wrapper pattern</span>
          </div>
          <h3>Check first, forward only if allowed</h3>
          <p>
            Developers wrap agent tools with AgentShield. The SDK asks the gateway for a decision before the real email, CRM, finance, browser, or internal API call runs.
          </p>
          <div className="integration-code-grid">
            <CodeBlock title="Tool wrapper" value={sdkExample} />
          </div>
          <dl>
            <Row label="Agent identity" value="Owner, model, allowed tools, denied actions" />
            <Row label="Untrusted input" value="Email, webpage, invoice, tool response" />
            <Row label="Decision" value="Allow, block, approval required, not reached" />
          </dl>
        </article>

        <article className="integration-card">
          <div>
            <ShieldCheck size={18} />
            <span>REST enforcement point</span>
          </div>
          <h3>POST /api/gateway/evaluate</h3>
          <p>The current demo endpoint evaluates runtime context, generates proposed tool calls, and returns per-tool decisions, evidence, risk score, and audit ID.</p>
          <div className="integration-code-grid">
            <CodeBlock title="Request" value={requestExample} />
            <CodeBlock title="Decision response" value={responseExample} />
          </div>
        </article>

        <article className="integration-card">
          <div>
            <Network size={18} />
            <span>MCP interceptor</span>
          </div>
          <h3>Broker tool calls before execution</h3>
          <p>Place AgentShield inside the MCP broker. Every proposed tool call is checked before the broker forwards it to the actual MCP tool server.</p>
          <dl>
            <Row label="Input" value="Agent ID + proposed MCP tool call" />
            <Row label="Check" value="Policy, data boundary, threat signals" />
            <Row label="Forward" value="Only after allow or human approval" />
          </dl>
        </article>

        <article className="integration-card">
          <div>
            <Webhook size={18} />
            <span>Security event sink</span>
          </div>
          <h3>Ship decisions to SIEM or case management</h3>
          <p>Forward blocked calls, approval decisions, and incident evidence to the enterprise security workflow.</p>
          <dl>
            <Row label="Events" value="Run, tool decision, incident, approval" />
            <Row label="Destination" value="Webhook / SIEM / ticket queue" />
            <Row label="Audit key" value="AgentRun ID" />
          </dl>
        </article>
      </div>
    </section>
  );
}

function CodeBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="integration-code">
      <span>{title}</span>
      <pre>{value}</pre>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
