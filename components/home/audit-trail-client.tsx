"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AuditRun } from "@/components/types";
import { AuditTrailView } from "@/components/reports/audit-trail-view";

export function AuditTrailClient() {
  const searchParams = useSearchParams();
  const selectedRunId = searchParams.get("runId") ?? "";
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadRuns();
  }, []);

  async function loadRuns() {
    try {
      const response = await fetch("/api/runs", { cache: "no-store" });
      const data = (await response.json()) as { runs: AuditRun[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load audit trail.");
      setRuns(data.runs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load audit trail.");
    }
  }

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      <AuditTrailView runs={runs} selectedRunId={selectedRunId} />
    </>
  );
}
