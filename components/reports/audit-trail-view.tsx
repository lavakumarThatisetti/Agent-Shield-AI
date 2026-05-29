"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import type { AuditRun } from "@/components/types";
import { StatusPill } from "@/components/ui/status-pill";
import { formatPolicyName, formatToolName } from "@/components/sandbox/gateway-format";

export function AuditTrailView({ runs, selectedRunId = "" }: { runs: AuditRun[]; selectedRunId?: string }) {
  const [activeRunId, setActiveRunId] = useState(selectedRunId);
  const selectedRun = useMemo(() => runs.find((run) => run.id === activeRunId) ?? runs[0], [runs, activeRunId]);

  useEffect(() => {
    if (selectedRunId) setActiveRunId(selectedRunId);
  }, [selectedRunId]);

  return (
    <section className="surface table-surface">
      <div className="surface-heading">
        <div>
          <p className="section-kicker">Immutable evidence</p>
          <h2>Run History</h2>
        </div>
        <div className="audit-heading-meta">
          <span>{runs.length} runs</span>
          <Activity size={20} />
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="empty-copy">No gateway runs have been recorded yet.</div>
      ) : (
        <div className="audit-trail-grid">
          <div className="data-table">
            <div className="table-head">
              <span>Time</span>
              <span>Agent</span>
              <span>Run</span>
              <span>Decision</span>
              <span>Risk</span>
            </div>
            {runs.map((run) => (
              <button
                className={`table-row audit-row audit-${run.status.toLowerCase()} ${run.id === selectedRun?.id ? "selected" : ""}`}
                key={run.id}
                onClick={() => setActiveRunId(run.id)}
                type="button"
              >
                <span className="audit-time">
                  <strong>{formatAuditDay(run.createdAt)}</strong>
                  <small>{formatAuditTime(run.createdAt)}</small>
                </span>
                <span className="audit-agent-cell">
                  <strong>{run.agentName}</strong>
                </span>
                <span className="audit-run-cell" title={run.emailSubject ?? run.userTask}>
                  {run.emailSubject ?? run.userTask}
                </span>
                <StatusPill status={run.status} />
                <b className={`audit-risk risk-${riskTone(run.riskScore)}`}>
                  <span />
                  {run.riskScore}
                </b>
              </button>
            ))}
          </div>

          {selectedRun ? <AuditDetail run={selectedRun} /> : null}
        </div>
      )}
    </section>
  );
}

function AuditDetail({ run }: { run: AuditRun }) {
  const primaryReason = run.reasons[0] ?? run.decisionSummary;
  const blocked = run.toolCalls.filter((tool) => tool.policyDecision === "BLOCKED" || tool.policyDecision === "DENIED").length;
  const held = run.toolCalls.filter((tool) => tool.policyDecision === "APPROVAL_REQUIRED").length;
  const allowed = run.toolCalls.filter((tool) => tool.policyDecision === "ALLOWED" || tool.policyDecision === "APPROVED").length;

  return (
    <aside className={`audit-detail-panel audit-${run.status.toLowerCase()}`}>
      <div className="audit-detail-top">
        <div>
          <p className="section-kicker">Run detail</p>
          <h3>{run.agentName}</h3>
        </div>
        <StatusPill status={run.status} />
      </div>

      <div className="audit-score-row">
        <div>
          <span>Risk</span>
          <strong className={`risk-${riskTone(run.riskScore)}`}>{run.riskScore}</strong>
        </div>
        <div>
          <span>Allowed</span>
          <strong>{allowed}</strong>
        </div>
        <div>
          <span>Held</span>
          <strong>{held}</strong>
        </div>
        <div>
          <span>Blocked</span>
          <strong>{blocked}</strong>
        </div>
      </div>

      <p className="audit-summary">{run.decisionSummary}</p>

      <div className="audit-detail-facts">
        <Fact label="Source" value={`Untrusted ${run.sourceType}`} />
        <Fact label="Tools" value={`${run.toolCalls.length}`} />
        <Fact label="Planner" value={plannerLabel(run)} />
        <Fact label="Audit ID" value={shortId(run.id)} />
      </div>

      <div className="audit-primary-reason">
        <span>Primary reason</span>
        <p title={primaryReason}>{primaryReason}</p>
      </div>

      <section className="audit-detail-section">
        <h4>Tool decisions</h4>
        <div className="audit-tool-list">
          {run.toolCalls.map((tool) => (
            <article className={`audit-tool-row decision-${tool.policyDecision.toLowerCase()}`} key={tool.id}>
              <span className="audit-tool-index">{tool.sequence}</span>
              <div>
                <strong>{formatToolName(tool.toolName)}</strong>
                <span>{formatPolicyName(tool.policyName)}</span>
              </div>
              <StatusPill status={tool.policyDecision} />
            </article>
          ))}
        </div>
      </section>

      <details className="audit-collapsible">
        <summary>
          Evidence packet
          <ChevronDown size={14} />
        </summary>
        <div className="audit-evidence-compact">
          {run.reasons.slice(0, 4).map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
          {run.incidents.map((incident) => (
            <div className="audit-incident" key={incident.id}>
              <StatusPill status={incident.severity} />
              <strong>{incident.title}</strong>
              <p>{incident.evidence}</p>
            </div>
          ))}
          {!run.reasons.length && !run.incidents.length ? <em>No additional evidence attached.</em> : null}
        </div>
      </details>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function formatAuditDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

function shortId(value: string) {
  return value.length > 10 ? value.slice(-8) : value;
}

function plannerLabel(run: AuditRun) {
  if (run.plannerMode === "llm") return run.plannerModel || "LLM";
  return "Local fallback";
}

function riskTone(score: number) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}
