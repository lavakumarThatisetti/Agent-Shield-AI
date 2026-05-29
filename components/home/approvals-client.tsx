"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ApprovalRequest } from "@/components/types";
import { ApprovalsView } from "@/components/reports/approvals-view";

export function ApprovalsClient() {
  const searchParams = useSearchParams();
  const selectedApprovalId = searchParams.get("approvalId") ?? "";
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadApprovals();
  }, []);

  async function loadApprovals() {
    try {
      const response = await fetch("/api/approvals", { cache: "no-store" });
      const data = (await response.json()) as { approvals: ApprovalRequest[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load approval queue.");
      setApprovals(data.approvals);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load approval queue.");
    }
  }

  async function reviewApproval(id: string, status: "APPROVED" | "DENIED") {
    setReviewingId(id);
    setError("");

    try {
      const response = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewerName: "Security reviewer",
          reviewerNote: notes[id] ?? ""
        })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to submit approval decision.");
      await loadApprovals();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to submit approval decision.");
    } finally {
      setReviewingId("");
    }
  }

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      <ApprovalsView
        approvals={approvals}
        selectedApprovalId={selectedApprovalId}
        notes={notes}
        reviewingId={reviewingId}
        onNoteChange={(id, note) => setNotes((current) => ({ ...current, [id]: note }))}
        onReview={reviewApproval}
      />
    </>
  );
}
