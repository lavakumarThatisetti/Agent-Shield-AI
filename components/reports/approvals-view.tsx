"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, CheckCircle2, ClipboardCheck } from "lucide-react";
import type { ApprovalRequest } from "@/components/types";
import { StatusPill } from "@/components/ui/status-pill";
import { formatPolicyName, formatToolName } from "@/components/sandbox/gateway-format";

export function ApprovalsView({
  approvals,
  selectedApprovalId,
  notes,
  reviewingId,
  onNoteChange,
  onReview
}: {
  approvals: ApprovalRequest[];
  selectedApprovalId: string;
  notes: Record<string, string>;
  reviewingId: string;
  onNoteChange: (id: string, note: string) => void;
  onReview: (id: string, status: "APPROVED" | "DENIED") => void;
}) {
  const pending = approvals.filter((approval) => approval.status === "PENDING").length;
  const approved = approvals.filter((approval) => approval.status === "APPROVED").length;
  const denied = approvals.filter((approval) => approval.status === "DENIED").length;
  const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending");
  const selectedApproval = useMemo(() => approvals.find((approval) => approval.id === selectedApprovalId), [approvals, selectedApprovalId]);
  const selectedTab = selectedApproval && selectedApproval.status !== "PENDING" ? "reviewed" : selectedApproval ? "pending" : null;
  const visibleApprovals = approvals.filter((approval) => (activeTab === "pending" ? approval.status === "PENDING" : approval.status !== "PENDING"));

  useEffect(() => {
    if (selectedTab) setActiveTab(selectedTab);
  }, [selectedTab]);

  return (
    <section className="surface approvals-surface">
      <div className="surface-heading approvals-heading">
        <div>
          <p className="section-kicker">Human control point</p>
          <h2>Approval Queue</h2>
          <span>Tool calls held by the runtime gateway before side effects reach enterprise systems.</span>
        </div>
        <div className="approval-metrics">
          <Metric label="Pending" value={pending} tone="pending" />
          <Metric label="Approved" value={approved} tone="approved" />
          <Metric label="Denied" value={denied} tone="denied" />
        </div>
      </div>

      <div className="approval-tabs" role="tablist" aria-label="Approval queue filters">
        <button aria-selected={activeTab === "pending"} className={activeTab === "pending" ? "active" : ""} onClick={() => setActiveTab("pending")} role="tab" type="button">
          Pending
          <span>{pending}</span>
        </button>
        <button aria-selected={activeTab === "reviewed"} className={activeTab === "reviewed" ? "active" : ""} onClick={() => setActiveTab("reviewed")} role="tab" type="button">
          Approved / Denied
          <span>{approved + denied}</span>
        </button>
      </div>

      {approvals.length === 0 ? (
        <div className="approval-empty">
          <ClipboardCheck size={22} />
          <strong>No approval requests yet</strong>
          <span>Run a scenario that proposes an approval-only tool, such as outbound email or payment update.</span>
        </div>
      ) : visibleApprovals.length === 0 ? (
        <div className="approval-empty compact">
          <ClipboardCheck size={20} />
          <strong>{activeTab === "pending" ? "No pending approvals" : "No reviewed decisions"}</strong>
          <span>{activeTab === "pending" ? "Held tool calls will appear here when the gateway pauses execution." : "Approved and denied decisions will appear here after review."}</span>
        </div>
      ) : (
        <div className="approval-list">
          {visibleApprovals.map((approval) => (
            <ApprovalCard
              approval={approval}
              key={approval.id}
              selected={approval.id === selectedApprovalId}
              note={notes[approval.id] ?? ""}
              reviewing={reviewingId === approval.id}
              onNoteChange={(note) => onNoteChange(approval.id, note)}
              onReview={(status) => onReview(approval.id, status)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "pending" | "approved" | "denied" }) {
  return (
    <div className={`approval-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ApprovalCard({
  approval,
  selected,
  note,
  reviewing,
  onNoteChange,
  onReview
}: {
  approval: ApprovalRequest;
  selected: boolean;
  note: string;
  reviewing: boolean;
  onNoteChange: (note: string) => void;
  onReview: (status: "APPROVED" | "DENIED") => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const toolName = approval.toolCall?.toolName ?? approval.requestedAction;
  const toolLabel = formatToolName(toolName);
  const toolInput = approval.toolCall?.input ?? {};
  const isPending = approval.status === "PENDING";

  useEffect(() => {
    if (!selected) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selected]);

  return (
    <article className={`approval-card approval-${approval.status.toLowerCase()} ${selected ? "selected" : ""}`} ref={cardRef}>
      <div className="approval-card-main">
        <div className="approval-titleline">
          <StatusPill status={approval.status} />
          <span>{formatPolicyName(approval.policyName)}</span>
          <time>{formatDate(approval.createdAt)}</time>
        </div>
        <h3>Human approval required for {toolLabel}</h3>
        <p>AgentShield held this proposed tool action before execution and routed it to a human reviewer.</p>

        <div className="approval-held-action">
          <div>
            <span>Held tool action</span>
            <strong>{toolLabel}</strong>
            <p>{approval.toolCall?.description ?? approval.reason}</p>
          </div>
          <div>
            <span>Approval trigger</span>
            <strong>{formatPolicyName(approval.policyName)}</strong>
            <p>{approval.reason}</p>
          </div>
          <div>
            <span>Tool payload</span>
            <code>{formatToolInput(toolInput)}</code>
          </div>
        </div>

        <div className="approval-facts">
          <Fact label="Agent" value={approval.agentName} />
          <Fact label="Risk" value={`${approval.riskScore}/100`} />
          <Fact label="Run" value={approval.runId} />
          <Fact label="Input" value={`Untrusted ${approval.sourceType}`} />
        </div>

        <div className="approval-evidence">
          <span>Gateway evidence</span>
          <p>{approval.evidence}</p>
        </div>
      </div>

      <aside className="approval-review-panel">
        <span>Reviewer decision</span>
        {isPending ? (
          <>
            <textarea
              aria-label={`Review note for ${formatToolName(toolName)}`}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Add business justification, reviewer rationale, or compensating control."
              value={note}
            />
            <div className="approval-actions">
              <button className="approval-action approve" disabled={reviewing} onClick={() => onReview("APPROVED")} type="button">
                <CheckCircle2 size={15} />
                Approve
              </button>
              <button className="approval-action deny" disabled={reviewing} onClick={() => onReview("DENIED")} type="button">
                <Ban size={15} />
                Deny
              </button>
            </div>
          </>
        ) : (
          <div className="approval-reviewed">
            <StatusPill status={approval.status} />
            <strong>{approval.reviewerName ?? "Security reviewer"}</strong>
            <p>{approval.reviewerNote || "No reviewer note captured."}</p>
            <time>{approval.reviewedAt ? formatDate(approval.reviewedAt) : "No review timestamp"}</time>
            <a className="approval-audit-link" href={`/home/audit-trail?runId=${encodeURIComponent(approval.runId)}`}>
              View audit record
            </a>
          </div>
        )}
      </aside>
    </article>
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatToolInput(input: Record<string, unknown>) {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "No structured input captured";

  return entries
    .slice(0, 4)
    .map(([key, value]) => `${formatInputKey(key)}: ${formatInputValue(value)}`)
    .join(" · ");
}

function formatInputKey(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase();
}

function formatInputValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
