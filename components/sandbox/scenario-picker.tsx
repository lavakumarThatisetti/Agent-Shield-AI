import { Archive, Pencil, Plus } from "lucide-react";
import type { RuntimeScenario } from "@/components/types";

export function ScenarioPicker({
  onCreate,
  onDelete,
  onEdit,
  scenarios,
  selectedScenarioId,
  onSelect
}: {
  onCreate: () => void;
  onDelete: (scenario: RuntimeScenario) => void;
  onEdit: (scenario: RuntimeScenario) => void;
  scenarios: RuntimeScenario[];
  selectedScenarioId: string;
  onSelect: (scenarioId: string) => void;
}) {
  return (
    <div className="scenario-list" aria-label="Runtime scenarios">
      <button className="create-scenario-button" onClick={onCreate} type="button">
        <Plus size={15} />
        <strong>New runtime scenario</strong>
        <span>Create untrusted input for this identity</span>
      </button>
      {scenarios.map((scenario) => (
        <div className={`scenario-list-item ${scenario.id === selectedScenarioId ? "selected" : ""}`} key={scenario.id}>
          <button onClick={() => onSelect(scenario.id)} type="button">
            <strong>{scenario.title}</strong>
            <span className={`scenario-category ${scenarioTone(scenario)}`}>{scenario.category}</span>
          </button>
          <div>
            <button aria-label={`Edit ${scenario.title}`} onClick={() => onEdit(scenario)} type="button">
              <Pencil size={12} />
              Edit
            </button>
            <button aria-label={`Archive ${scenario.title}`} onClick={() => onDelete(scenario)} type="button">
              <Archive size={12} />
              Archive
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function scenarioTone(scenario: RuntimeScenario) {
  const text = `${scenario.title} ${scenario.category} ${scenario.sourceContent}`.toLowerCase();
  if (/prompt injection|exfiltration|spoofing|tool misuse|malicious|bypass|hidden instruction/.test(text)) return "danger";
  if (/approval|send|external|payment/.test(text)) return "approval";
  return "safe";
}
