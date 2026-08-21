"use client";

import type { Agent } from "@/domain/agent";
import type { SampleTrace } from "@/domain/sample-trace";
import type { WorkReport } from "@/domain/work-report";
import { JobTape } from "@/presentation/chamber/job-tape";
import type { ChamberPhase } from "@/presentation/chamber/phase";

type Props = {
  agent: Agent;
  work: WorkReport | null;
  trace: SampleTrace | null;
  phase: ChamberPhase;
  maxUsdt: number;
  hours: number;
};

function footerCopy(props: Props): { overlay: string; result: string; disclaimer: string } {
  const disclaimer =
    "Kiln is a hire desk. Sample reads the published catalog. It does not run the agent’s private jobs or send payments.";
  if (props.phase === "revoked") {
    return {
      overlay: "Cap released",
      result: "This agent cannot spend under the current envelope.",
      disclaimer,
    };
  }
  if (props.phase === "hired") {
    return {
      overlay: `Hired · you capped spend at ${props.maxUsdt} USDT / ${props.hours}h`,
      result: "That lease is a budget, not a live camera into the agent.",
      disclaimer,
    };
  }
  if (props.phase === "sealing") {
    return {
      overlay: "Locking the spend cap",
      result: "Hire writes the budget. It does not start the agent here.",
      disclaimer,
    };
  }
  if (props.phase === "firing") {
    return {
      overlay: "Reading the published job list",
      result: "Name card, HTTP catalog, then a hash. Watch the numbered steps.",
      disclaimer,
    };
  }
  if (props.phase === "skipped") {
    return {
      overlay: "Sample skipped",
      result: "No check was run. Hiring is allowed; extra risk is on the record.",
      disclaimer,
    };
  }
  if (props.trace) {
    const jobs = props.trace.jobs?.length ?? 0;
    return {
      overlay: props.trace.reachable
        ? jobs
          ? `Catalog answered · ${jobs} jobs · ${props.trace.latencyMs ?? "?"}ms`
          : "Door answered · no tool list"
        : props.trace.hydrateFailed
          ? props.phase === "attested"
            ? "Card refresh failed"
            : "Still loading the detail card"
          : props.trace.endpoint
            ? "Job URL listed, no healthy catalog"
            : "Name only — no job URL",
      result: props.trace.verdict,
      disclaimer,
    };
  }
  return {
    overlay: "Read the job list, then hire",
    result:
      "Selecting an agent loads the 8004scan detail card and any published MCP/A2A catalog. Fire sample stamps that read.",
    disclaimer,
  };
}

export function KilnChamber(props: Props) {
  const copy = footerCopy(props);
  return (
    <div>
      <JobTape phase={props.phase} agent={props.agent} trace={props.trace} />
      <div className="border border-t-0 border-line px-3 py-2" aria-live="polite">
        <p className="font-mono text-[11px] text-amber">{copy.overlay}</p>
        <p className="mt-0.5 font-sans text-[13px] leading-5 text-ink/85">{copy.result}</p>
        <p className="mt-1 font-mono text-[9px] text-ink/45">{copy.disclaimer}</p>
      </div>
    </div>
  );
}
