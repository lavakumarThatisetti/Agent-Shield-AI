"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import type { Agent } from "@/components/types";
import { formatToolName } from "@/components/sandbox/gateway-format";
import { StatusPill } from "@/components/ui/status-pill";

export type AgentFormValue = {
  displayName: string;
  provider: string;
  modelName: string;
  environment: string;
  sponsorName: string;
  sponsorEmail: string;
  purpose: string;
  status: "ACTIVE" | "PAUSED" | "REVOKED";
  riskTier: "LOW" | "MEDIUM" | "HIGH";
  allowedTools: string[];
  deniedActions: string[];
  dataBoundary: {
    allowed: string[];
    approvalRequired: string[];
    prohibited: string[];
  };
};

export function AgentEditorPanel({
  agent,
  isSaving,
  mode,
  onCancel,
  onSave
}: {
  agent?: Agent;
  isSaving: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onSave: (value: AgentFormValue) => Promise<void>;
}) {
  const initialValue = useMemo(() => toFormValue(agent), [agent]);
  const [value, setValue] = useState<AgentFormValue>(initialValue);

  return (
    <section className="surface agent-editor-panel">
      <div className="editor-hero">
        <div>
          <p className="section-kicker">{mode === "create" ? "New identity" : "Edit identity"}</p>
          <h2>{mode === "create" ? "Create agent manifest" : value.displayName}</h2>
          <span>Define the runtime identity, tool allow-list, approval checkpoints, and hard deny boundary.</span>
        </div>
        <div className="editor-hero-actions">
          <button className="secondary-button compact" onClick={onCancel} type="button">
            <ArrowLeft size={15} />
            Back
          </button>
          <button className="primary-button compact" disabled={isSaving} form="agent-identity-form" type="submit">
            <Save size={15} />
            {isSaving ? "Saving" : "Save manifest"}
          </button>
        </div>
      </div>

      <form
        id="agent-identity-form"
        className="editor-form"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSave(value);
        }}
      >
        <div className="editor-sections">
          <section className="editor-section">
            <SectionHeading title="Identity" detail="Who is acting and where this manifest is valid." />
            <div className="editor-grid">
              <TextField label="Display name" placeholder="Claude Support Agent" value={value.displayName} onChange={(displayName) => setValue({ ...value, displayName })} />
              <TextField label="Provider" placeholder="Anthropic Claude" value={value.provider} onChange={(provider) => setValue({ ...value, provider })} />
              <TextField label="Runtime" placeholder="Claude enterprise assistant" value={value.modelName} onChange={(modelName) => setValue({ ...value, modelName })} />
              <TextField label="Environment" placeholder="Production" value={value.environment} onChange={(environment) => setValue({ ...value, environment })} />
              <TextField label="Owner" placeholder="Maya Srinivasan" value={value.sponsorName} onChange={(sponsorName) => setValue({ ...value, sponsorName })} />
              <TextField label="Owner email" placeholder="maya@company.com" value={value.sponsorEmail} onChange={(sponsorEmail) => setValue({ ...value, sponsorEmail })} type="email" />
              <SelectField
                label="Status"
                value={value.status}
                options={["ACTIVE", "PAUSED", "REVOKED"]}
                onChange={(status) => setValue({ ...value, status: status as AgentFormValue["status"] })}
              />
              <SelectField
                label="Risk tier"
                value={value.riskTier}
                options={["LOW", "MEDIUM", "HIGH"]}
                onChange={(riskTier) => setValue({ ...value, riskTier: riskTier as AgentFormValue["riskTier"] })}
              />
            </div>
            <label className="editor-field full">
              <span>Purpose</span>
              <textarea
                placeholder="Describe what this agent is allowed to do and where AgentShield should enforce boundaries."
                value={value.purpose}
                onChange={(event) => setValue({ ...value, purpose: event.target.value })}
                rows={3}
              />
            </label>
          </section>

          <ManifestPreview value={value} />

          <section className="editor-section full-width">
            <SectionHeading title="Tool Boundary" detail="Allowed tools are eligible for execution; denied actions become hard stops." />
            <div className="tool-boundary-editor">
              <ToolChecklist title="Allowed tools" tone="allow" selected={value.allowedTools} onChange={(allowedTools) => setValue({ ...value, allowedTools })} />
              <ToolChecklist title="Denied actions" tone="deny" selected={value.deniedActions} onChange={(deniedActions) => setValue({ ...value, deniedActions })} />
            </div>
          </section>

          <section className="editor-section full-width">
            <SectionHeading title="Data Boundary" detail="Describe the data classes the runtime gateway should allow, hold, or reject." />
            <div className="editor-grid">
              <ListField
                label="Allowed data"
                placeholder="support inbox, customer profile, approved account notes"
                value={value.dataBoundary.allowed}
                onChange={(allowed) => setValue({ ...value, dataBoundary: { ...value.dataBoundary, allowed } })}
              />
              <ListField
                label="Approval required"
                placeholder="external email send, refund escalation"
                value={value.dataBoundary.approvalRequired}
                onChange={(approvalRequired) => setValue({ ...value, dataBoundary: { ...value.dataBoundary, approvalRequired } })}
              />
              <ListField
                label="Prohibited data"
                placeholder="credentials, payment data, bulk exports"
                value={value.dataBoundary.prohibited}
                onChange={(prohibited) => setValue({ ...value, dataBoundary: { ...value.dataBoundary, prohibited } })}
              />
            </div>
          </section>
        </div>
      </form>
    </section>
  );
}

function ManifestPreview({ value }: { value: AgentFormValue }) {
  const previewName = value.displayName || "Untitled agent";
  const previewProvider = value.provider || "Provider";
  const previewEnvironment = value.environment || "Environment";

  return (
    <aside className="manifest-preview">
      <p className="section-kicker">Boundary preview</p>
      <h3>{previewName}</h3>
      <span>{previewProvider} · {previewEnvironment}</span>
      <div className="manifest-preview-status">
        <StatusPill status={value.status} />
        <StatusPill status={value.riskTier} />
      </div>
      <div className="manifest-preview-grid">
        <div>
          <strong>{value.allowedTools.length}</strong>
          <span>Allowed tools</span>
        </div>
        <div>
          <strong>{value.deniedActions.length}</strong>
          <span>Hard denies</span>
        </div>
        <div>
          <strong>{value.dataBoundary.approvalRequired.length}</strong>
          <span>Approval gates</span>
        </div>
      </div>
      <p className="manifest-preview-note">This manifest is what the runtime gateway will apply before each tool call can execute.</p>
    </aside>
  );
}

function SectionHeading({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="editor-section-heading">
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <input placeholder={placeholder} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ListField({ label, onChange, placeholder, value }: { label: string; onChange: (value: string[]) => void; placeholder?: string; value: string[] }) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <input placeholder={placeholder} value={value.join(", ")} onChange={(event) => onChange(splitList(event.target.value))} />
    </label>
  );
}

function ToolChecklist({
  onChange,
  selected,
  title,
  tone
}: {
  onChange: (tools: string[]) => void;
  selected: string[];
  title: string;
  tone: "allow" | "deny";
}) {
  return (
    <div className={`tool-checklist ${tone}`}>
      <span>{title}</span>
      <div>
        {toolOptions.map((tool) => (
          <label key={`${title}-${tool}`}>
            <input
              checked={selected.includes(tool)}
              onChange={() => onChange(toggle(selected, tool))}
              type="checkbox"
            />
            {formatToolName(tool)}
          </label>
        ))}
      </div>
    </div>
  );
}

function toFormValue(agent?: Agent): AgentFormValue {
  return {
    displayName: agent?.displayName ?? "",
    provider: agent?.provider ?? "",
    modelName: agent?.modelName ?? "",
    environment: agent?.environment ?? "",
    sponsorName: agent?.sponsorName ?? "",
    sponsorEmail: agent?.sponsorEmail ?? "",
    purpose: agent?.purpose ?? "",
    status: (agent?.status as AgentFormValue["status"]) ?? "ACTIVE",
    riskTier: (agent?.riskTier as AgentFormValue["riskTier"]) ?? "MEDIUM",
    allowedTools: agent?.allowedTools ?? [],
    deniedActions: agent?.deniedActions ?? [],
    dataBoundary: {
      allowed: agent?.dataBoundary.allowed ?? [],
      approvalRequired: agent?.dataBoundary.approvalRequired ?? [],
      prohibited: agent?.dataBoundary.prohibited ?? []
    }
  };
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggle(values: string[], item: string) {
  return values.includes(item) ? values.filter((value) => value !== item) : [...values, item];
}

const toolOptions = [
  "read_email",
  "lookup_customer_profile",
  "fetch_relevant_account_data",
  "create_support_ticket",
  "draft_customer_reply",
  "send_email",
  "export_customer_records",
  "disable_account_restrictions",
  "fetch_url",
  "extract_page_facts",
  "create_research_note",
  "execute_code",
  "read_invoice",
  "classify_invoice",
  "create_finance_ticket",
  "vendor_lookup",
  "update_payment_details",
  "credential_access",
  "wire_transfer"
];
