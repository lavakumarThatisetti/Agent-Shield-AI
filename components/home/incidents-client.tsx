"use client";

import { useEffect, useState } from "react";
import type { Incident } from "@/components/types";
import { IncidentsView } from "@/components/reports/incidents-view";

export function IncidentsClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadIncidents();
  }, []);

  async function loadIncidents() {
    try {
      const response = await fetch("/api/incidents", { cache: "no-store" });
      const data = (await response.json()) as { incidents: Incident[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load incidents.");
      setIncidents(data.incidents);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load incidents.");
    }
  }

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      <IncidentsView incidents={incidents} />
    </>
  );
}
