import { FileCheck2 } from "lucide-react";
import type { GuardedRunResult } from "@/components/types";
import { StatusPill } from "@/components/ui/status-pill";
import { formatToolName } from "./gateway-format";

export function FinalReport({ result }: { result: GuardedRunResult | null }) {
  if (!result) return null;

  return (
    <section className="surface final-report">
      <div className="surface-heading compact">
        <div>
          <p className="section-kicker">Audit record</p>
          <h2>Incident and run summary</h2>
        </div>
        <FileCheck2 size={19} />
      </div>

      <div className="report-main">
        <div className="risk-dial" style={{ "--score": `${result.riskScore * 3.6}deg` } as React.CSSProperties}>
          <strong>{result.riskScore}</strong>
          <span>risk</span>
        </div>
        <div>
          <StatusPill status={result.status} />
          <p>{result.finalReport.executiveSummary}</p>
          <small>{result.finalReport.businessOutcome}</small>
        </div>
      </div>

      <div className="report-columns">
        <ReportList title="Completed" items={result.finalReport.actionsCompleted} />
        <ReportList title="Blocked" items={result.finalReport.actionsBlocked} />
        <ReportList title="Approval" items={result.finalReport.approvalsRequired} />
        <ReportList title="Not reached" items={result.finalReport.actionsNotReached ?? []} />
      </div>

      {result.status === "APPROVAL_REQUIRED" ? (
        <a className="approval-next-step" href={approvalQueueHref(result)}>
          Review held tool call in Approval Queue
        </a>
      ) : null}

      <div className="audit-id">Audit ID: {result.finalReport.auditId}</div>
    </section>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3>{title}</h3>
      {items.length ? items.map((item) => <span key={item} title={item}>{formatAction(item)}</span>) : <em>None</em>}
    </div>
  );
}

function formatAction(action: string) {
  return formatToolName(action);
}

function approvalQueueHref(result: GuardedRunResult) {
  const approvalId = result.approvalRequests?.[0]?.id;
  return approvalId ? `/home/approvals?approvalId=${encodeURIComponent(approvalId)}` : "/home/approvals";
}
