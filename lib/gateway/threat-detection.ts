import type { GatewayFinding, ThreatContext } from "@/lib/gateway/types";

const injectionPatterns = [
  /ignore (all )?(previous|prior|system|developer|security) instructions/i,
  /disregard (all )?(previous|prior|system|developer|security) instructions/i,
  /hidden instruction/i,
  /do not (tell|show|reveal) (the )?(operator|user|admin)/i,
  /bypass (approval|guardrails|policy|security)/i,
  /you are now/i,
  /new system message/i
];

const exfiltrationPatterns = [
  /export (all|customer|records|database|crm)/i,
  /forward .*@/i,
  /send .*@/i,
  /dump (the )?(database|records)/i,
  /customer records/i
];

const credentialPatterns = [/api[_ -]?key/i, /token/i, /password/i, /secret/i, /credential/i, /private key/i];
const spoofingPatterns = [/i am (the )?(ceo|cfo|admin|administrator|security lead)/i, /urgent executive/i, /personal mailbox/i];
const destructivePatterns = [/delete/i, /disable/i, /revoke/i, /drop table/i, /wire transfer/i, /change bank/i, /update payment/i];

export function buildThreatContext(userGoal: string, sourceContent: string): ThreatContext {
  const tags = detectThreatTags(`${userGoal}\n${sourceContent}`);
  const evidence = suspiciousLine(sourceContent) ?? sourceContent.slice(0, 180);
  return {
    tags,
    findings: buildFindings(tags, evidence),
    evidence
  };
}

export function detectThreatTags(text: string) {
  const tags = new Set<string>();
  if (injectionPatterns.some((pattern) => pattern.test(text))) tags.add("indirect_prompt_injection");
  if (exfiltrationPatterns.some((pattern) => pattern.test(text))) tags.add("exfiltration");
  if (credentialPatterns.some((pattern) => pattern.test(text))) tags.add("credential_access");
  if (spoofingPatterns.some((pattern) => pattern.test(text))) tags.add("identity_spoofing");
  if (destructivePatterns.some((pattern) => pattern.test(text))) tags.add("destructive_action");
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text) || /\b(?:\d[ -]*?){13,16}\b/.test(text)) tags.add("regulated_data");
  return Array.from(tags);
}

export function suspiciousLine(content: string) {
  return (
    content
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /ignore|hidden|export|forward|bypass|ceo|disable|personal|token|secret|password|wire|delete/i.test(line)) ?? null
  );
}

export function severityScore(severity: GatewayFinding["severity"]) {
  if (severity === "HIGH") return 86;
  if (severity === "MEDIUM") return 58;
  return 24;
}

function buildFindings(tags: string[], evidence: string): GatewayFinding[] {
  const findings: GatewayFinding[] = [];

  if (tags.includes("indirect_prompt_injection")) {
    findings.push({ id: "LLM01", name: "Prompt Injection", severity: "HIGH", evidence });
    findings.push({ id: "ASI01", name: "Agent Goal Hijacking", severity: "HIGH", evidence });
  }

  if (tags.includes("exfiltration")) {
    findings.push({ id: "LLM02", name: "Sensitive Information Disclosure", severity: "HIGH", evidence });
  }

  if (tags.includes("identity_spoofing")) {
    findings.push({ id: "ASI03", name: "Identity & Privilege Abuse", severity: "HIGH", evidence });
  }

  if (tags.includes("destructive_action")) {
    findings.push({ id: "LLM06", name: "Excessive Agency", severity: "HIGH", evidence });
  }

  if (tags.includes("regulated_data")) {
    findings.push({ id: "LLM02", name: "Regulated Data Exposure", severity: "MEDIUM", evidence });
  }

  return uniqueFindings(findings);
}

function uniqueFindings(findings: GatewayFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.id}:${finding.name}:${finding.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
