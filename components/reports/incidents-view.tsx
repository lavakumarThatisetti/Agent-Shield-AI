import { FileWarning } from "lucide-react";
import type { Incident } from "@/components/types";
import { StatusPill } from "@/components/ui/status-pill";

export function IncidentsView({ incidents }: { incidents: Incident[] }) {
  return (
    <section className="surface incidents-surface">
      <div className="surface-heading">
        <div>
          <p className="section-kicker">Flagged actions</p>
          <h2>Security Incidents</h2>
        </div>
        <div className="incident-heading-meta">
          <span>{incidents.length} recorded</span>
          <FileWarning size={18} />
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="empty-copy">No incidents have been recorded yet.</div>
      ) : (
        <div className="incident-list">
          {incidents.map((incident) => (
            <article className={`incident-card severity-${incident.severity.toLowerCase()}`} key={incident.id}>
              <div className="incident-card-main">
                <div className="incident-titleline">
                  <StatusPill status={incident.severity} />
                  <span>{formatLabel(incident.category)}</span>
                </div>
                <h3>{incident.title}</h3>
                <p>{incident.description}</p>
              </div>
              <dl>
                <div>
                  <dt>Reported</dt>
                  <dd>{formatDate(incident.createdAt)}</dd>
                </div>
                <div>
                  <dt>Agent</dt>
                  <dd>{incident.agentName}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{incident.emailSubject}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{incident.evidence}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
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
