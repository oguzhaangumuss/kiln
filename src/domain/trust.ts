import type { Agent } from "@/domain/agent";

export type RiskFlag =
  | "permissionless_mint"
  | "card_unreadable"
  | "stale_or_silent"
  | "kiln_untested"
  | "kiln_failed"
  | "no_onchain_feedback";

export type Heat = "high" | "medium" | "low";

export type TrustReport = {
  agentId: string;
  heat: Heat;
  flags: RiskFlag[];
  summary: string;
};

export type KilnMemory = "none" | "passed" | "failed" | "skipped";

export function flagLabel(flag: RiskFlag): string {
  if (flag === "permissionless_mint") return "Permissionless registration";
  if (flag === "card_unreadable") return "Agent card incomplete";
  if (flag === "stale_or_silent") return "No recent on-chain activity";
  if (flag === "kiln_untested") return "Sample not yet attested";
  if (flag === "kiln_failed") return "Sample failed";
  return "No on-chain feedback";
}

export function assessTrust(agent: Agent, kiln: KilnMemory): TrustReport {
  const flags: RiskFlag[] = ["permissionless_mint"];

  if (!agent.cardReadable || !agent.agentUri) {
    flags.push("card_unreadable");
  }
  if (agent.pulse !== "live") {
    flags.push("stale_or_silent");
  }
  if (kiln === "none") {
    flags.push("kiln_untested");
  }
  if (kiln === "failed") {
    flags.push("kiln_failed");
  }
  if (agent.totalFeedbacks <= 0) {
    flags.push("no_onchain_feedback");
  }

  let heat: Heat = "low";
  if (flags.includes("card_unreadable") || flags.includes("kiln_failed")) {
    heat = "high";
  } else if (flags.includes("stale_or_silent") || flags.includes("kiln_untested")) {
    heat = "medium";
  }

  return {
    agentId: agent.id,
    heat,
    flags,
    summary:
      heat === "high"
        ? "Do not hire yet. The agent card is incomplete or the sample failed."
        : heat === "medium"
          ? "Unproven. Run a sample before hiring."
          : "Registration is not a background check. A spend envelope is still required.",
  };
}
