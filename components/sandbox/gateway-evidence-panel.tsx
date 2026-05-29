"use client";

import { useMemo, useState } from "react";
import { Check, Code2, Copy } from "lucide-react";
import type { GatewayEvaluationResult, GatewayFinding } from "@/components/types";
import { StatusPill } from "@/components/ui/status-pill";
import { formatThreatTag } from "./gateway-format";

export function GatewayEvidencePanel({ result }: { result: GatewayEvaluationResult | null }) {
  if (!result) {
    return (
      <section className="gateway-evidence surface">
        <EvidenceHeading />
        <div className="empty-copy">Run an evaluation to generate OWASP mappings, policy reasons, and audit evidence.</div>
      </section>
    );
  }

  return (
    <section className="gateway-evidence surface">
      <EvidenceHeading status={result.status} />

      <div className="evidence-grid">
        <FindingsList findings={result.findings} />
        <GatewayContract result={result} />
      </div>
    </section>
  );
}

function EvidenceHeading({ status }: { status?: GatewayEvaluationResult["status"] }) {
  return (
    <div className="surface-heading compact">
      <div>
        <p className="section-kicker">Evidence packet</p>
        <h2>Policy evidence and attack signals</h2>
      </div>
      {status ? <StatusPill status={status} /> : <Code2 size={19} />}
    </div>
  );
}

function FindingsList({ findings }: { findings: GatewayFinding[] }) {
  if (!findings.length) {
    return (
      <div className="finding-list">
        <div className="empty-copy">No high-risk findings detected.</div>
      </div>
    );
  }

  return (
    <div className="finding-list">
      {findings.slice(0, 5).map((finding) => (
        <FindingCard finding={finding} key={`${finding.id}-${finding.name}`} />
      ))}
    </div>
  );
}

function FindingCard({ finding }: { finding: GatewayFinding }) {
  return (
    <article className={`finding-card ${finding.severity.toLowerCase()}`}>
      <span>{finding.id}</span>
      <strong>{finding.name}</strong>
      <p>{finding.evidence}</p>
    </article>
  );
}

function GatewayContract({ result }: { result: GatewayEvaluationResult }) {
  const [copied, setCopied] = useState(false);
  const evidencePacket = useMemo(() => buildEvidencePacket(result), [result]);

  async function copyEvidence() {
    try {
      await navigator.clipboard.writeText(evidencePacket);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="api-contract">
      <span>Gateway contract</span>
      <code>POST /api/gateway/evaluate</code>
      <p>{result.decisionSummary}</p>
      <p>
        Planner: {result.planner.mode === "llm" ? "LLM" : "local"}
      </p>
      <div className="threat-tag-row">
        {result.threatTags.length ? (
          result.threatTags.map((tag) => <span key={tag}>{formatThreatTag(tag)}</span>)
        ) : (
          <span>No attack signals</span>
        )}
      </div>
      <button className="copy-evidence-button" onClick={copyEvidence} type="button">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied evidence JSON" : "Copy evidence JSON"}
      </button>
      <details className="evidence-json">
        <summary>Evidence JSON</summary>
        <pre>{evidencePacket}</pre>
      </details>
    </div>
  );
}

function buildEvidencePacket(result: GatewayEvaluationResult) {
  return JSON.stringify(
    {
      auditId: result.runId,
      status: result.status,
      riskScore: result.riskScore,
      agent: {
        id: result.agent.id,
        name: result.agent.displayName,
        environment: result.agent.environment
      },
      source: {
        type: result.sourceType,
        name: result.sourceName
      },
      threatTags: result.threatTags,
      findings: result.findings,
      toolDecisions: result.toolCalls.map((tool) => ({
        sequence: tool.sequence,
        toolName: tool.toolName,
        decision: tool.policyDecision,
        policy: tool.policyName,
        riskScore: tool.riskScore,
        reasons: tool.reasons
      }))
    },
    null,
    2
  );
}
