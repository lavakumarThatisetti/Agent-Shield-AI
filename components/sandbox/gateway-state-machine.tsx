"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Ban, CheckCircle2, Clock3, MinusCircle, RadioTower } from "lucide-react";
import type { GuardedRunResult, GuardedToolCall, ToolDecision } from "@/components/types";
import { formatPolicyName, formatToolName } from "./gateway-format";

export const GATEWAY_STEP_DELAY_MS = 650;

type MachineNode =
  | {
      id: string;
      kind: "request";
      title: string;
      detail: string;
      decision: "REQUEST";
    }
  | {
      id: string;
      kind: "tool";
      title: string;
      detail: string;
      decision: ToolDecision;
      tool: GuardedToolCall;
    };

export function GatewayStateMachine({
  result,
  isRunning
}: {
  result: GuardedRunResult | null;
  isRunning: boolean;
}) {
  const nodes = useMemo<MachineNode[]>(() => {
    if (!result) {
      return isRunning
        ? [
            {
              id: "incoming-request",
              kind: "request",
              title: "Request received",
              detail: "Waiting for the agent plan to reach the gateway.",
              decision: "REQUEST"
            }
          ]
        : [];
    }

    return [
      {
        id: `${result.runId}-request`,
        kind: "request",
        title: "Request received",
        detail: `Inbound request from ${result.email.fromName}`,
        decision: "REQUEST"
      },
      ...result.toolCalls.map((tool) => ({
        id: `${result.runId}-${tool.sequence}-${tool.toolName}`,
        kind: "tool" as const,
        title: tool.toolName,
        detail: formatToolDetail(tool),
        decision: tool.policyDecision,
        tool
      }))
    ];
  }, [isRunning, result]);

  const [phase, setPhase] = useState(-1);
  const activeNodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!nodes.length) {
      setPhase(-1);
      return;
    }

    setPhase(0);

    if (!result) return;

    const timers = nodes.map((_, index) =>
      window.setTimeout(() => {
        setPhase(index + 1);
      }, (index + 1) * GATEWAY_STEP_DELAY_MS)
    );

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [nodes, result]);

  const visibleCount = Math.max(0, Math.min(nodes.length, phase + 1));
  const visibleNodes = nodes.slice(0, visibleCount);
  const completed = result?.toolCalls.filter((tool) => tool.policyDecision === "ALLOWED").length ?? 0;
  const blocked = result?.toolCalls.filter((tool) => tool.policyDecision === "BLOCKED").length ?? 0;
  const approvals = result?.toolCalls.filter((tool) => tool.policyDecision === "APPROVAL_REQUIRED").length ?? 0;
  const notReached = result?.toolCalls.filter((tool) => tool.policyDecision === "NOT_REACHED").length ?? 0;

  useEffect(() => {
    activeNodeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  }, [visibleCount]);

  return (
    <section className="gateway-state-machine surface">
      <div className="surface-heading gateway-machine-heading">
        <div>
          <p className="section-kicker">Gateway decisions</p>
          <h2>Runtime interception timeline</h2>
        </div>
        <div className="machine-summary" aria-label="Gateway result summary">
          <span className="summary-chip allowed">{completed} pass</span>
          <span className="summary-chip blocked">{blocked} stop</span>
          <span className="summary-chip approval">{approvals} hold</span>
          <span className="summary-chip skipped">{notReached} not reached</span>
        </div>
      </div>

      {!nodes.length ? (
        <div className="machine-empty">
          <RadioTower size={22} />
          <span>Run the guarded agent to open the gateway state machine.</span>
        </div>
      ) : (
        <div className="state-machine-viewport" aria-live="polite">
          <div className="state-machine-track">
            {visibleNodes.map((node, index) => {
              const isActive = phase === index;
              const isSettled = phase > index;
              const isLastVisible = index === visibleNodes.length - 1;

              return (
                <div className="machine-hop" key={node.id} ref={isLastVisible ? activeNodeRef : null}>
                  <MachineStep node={node} step={index} isActive={isActive} isSettled={isSettled} />
                  {!isLastVisible ? <MachineEdge decision={node.decision} isSettled={isSettled} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function MachineStep({
  node,
  step,
  isActive,
  isSettled
}: {
  node: MachineNode;
  step: number;
  isActive: boolean;
  isSettled: boolean;
}) {
  const statusClass = decisionClass(node.decision);
  const Icon = node.kind === "request" ? RadioTower : isActive ? Clock3 : decisionIcon(node.decision);

  return (
    <article className={`machine-step ${statusClass} ${isActive ? "active" : ""} ${isSettled ? "settled" : ""}`}>
      <div className="machine-step-top">
        <div className="machine-step-icon">
          <Icon size={16} />
        </div>
        <span>{step === 0 ? "Request" : `Tool ${step}`}</span>
      </div>

      <strong className="machine-title" title={node.title}>
        {formatNodeTitle(node)}
      </strong>
      <p>{node.detail}</p>

      {node.kind === "tool" ? (
        <div className="machine-policy">
          <span>{formatPolicyName(node.tool.policyName)}</span>
          <DecisionMarker decision={node.tool.policyDecision} isActive={isActive && !isSettled} />
        </div>
      ) : null}
    </article>
  );
}

function MachineEdge({ decision, isSettled }: { decision: MachineNode["decision"]; isSettled: boolean }) {
  const isTerminal = decision === "BLOCKED" || decision === "APPROVAL_REQUIRED" || decision === "NOT_REACHED";
  const Icon = isTerminal ? Ban : ArrowRight;

  return (
    <div className={`machine-edge ${decisionClass(decision)} ${isSettled ? "settled" : ""}`} aria-hidden="true">
      <span />
      <Icon size={15} />
    </div>
  );
}

function DecisionMarker({ decision, isActive }: { decision: ToolDecision; isActive: boolean }) {
  if (isActive) {
    return <span className="decision-marker scanning">checking</span>;
  }

  if (decision === "ALLOWED" || decision === "APPROVED") {
    return null;
  }

  if (decision === "APPROVAL_REQUIRED") {
    return <span className="decision-marker approval">hold</span>;
  }

  if (decision === "NOT_REACHED") {
    return <span className="decision-marker skipped">not reached</span>;
  }

  return <span className="decision-marker blocked">stop</span>;
}

function formatNodeTitle(node: MachineNode) {
  if (node.kind === "request") return node.title;
  return formatToolName(node.title);
}

function formatToolDetail(tool: GuardedToolCall) {
  const details: Record<string, string> = {
    read_email: "Read untrusted support email.",
    lookup_customer_profile: "Resolve sender identity.",
    fetch_relevant_account_data: "Fetch scoped account context.",
    create_support_ticket: "Create support ticket.",
    draft_customer_reply: "Draft customer reply.",
    send_email: "Outbound email attempt.",
    export_customer_records: "Bulk export attempt.",
    disable_account_restrictions: "Restriction change attempt."
  };

  return details[tool.toolName] ?? tool.description;
}

function decisionIcon(decision: MachineNode["decision"]) {
  if (decision === "REQUEST") return RadioTower;
  if (decision === "ALLOWED") return CheckCircle2;
  if (decision === "APPROVAL_REQUIRED") return Clock3;
  if (decision === "NOT_REACHED") return MinusCircle;
  if (decision === "APPROVED") return CheckCircle2;
  return Ban;
}

function decisionClass(decision: MachineNode["decision"]) {
  if (decision === "REQUEST" || decision === "ALLOWED" || decision === "APPROVED") return "allowed";
  if (decision === "APPROVAL_REQUIRED") return "approval";
  if (decision === "NOT_REACHED") return "skipped";
  return "blocked";
}
