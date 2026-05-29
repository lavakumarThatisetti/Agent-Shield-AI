import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const Icon =
    normalized.includes("blocked") || normalized === "high" || normalized === "denied"
      ? XCircle
      : normalized.includes("approval") || normalized === "pending"
        ? Clock3
        : normalized === "medium"
          ? AlertTriangle
          : CheckCircle2;

  return (
    <span className={`status-pill status-${normalized}`}>
      <Icon size={14} />
      {labelForStatus(normalized, status)}
    </span>
  );
}

function labelForStatus(normalized: string, original: string) {
  if (normalized === "approval_required" || normalized === "require_approval") return "Held";
  if (normalized === "approved") return "Approved";
  if (normalized === "denied") return "Denied";
  if (normalized === "not_reached") return "Skipped";
  return original.replaceAll("_", " ");
}
