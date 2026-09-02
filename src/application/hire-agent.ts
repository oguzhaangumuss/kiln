import type { Agent } from "@/domain/agent";
import type { Envelope } from "@/domain/envelope";
import { envelopeAllowsHire } from "@/domain/envelope";
import type { Hire, HireFacilitator } from "@/domain/hire";

export function hireAgent(
  agent: Agent,
  envelope: Envelope,
  attested: boolean,
  skippedAttestation: boolean,
  facilitator: HireFacilitator = "kiln",
  txHash: string | null = null,
): Hire {
  if (!attested && !skippedAttestation) {
    throw new Error("Hiring is locked until a sample is attested or skipped.");
  }
  if (!envelopeAllowsHire(envelope)) {
    throw new Error("Hiring is locked: the spend envelope is empty or revoked.");
  }
  return {
    agentId: agent.id,
    txHash,
    maxUsdt: envelope.maxUsdt,
    hours: envelope.hours,
    facilitator,
    at: new Date().toISOString(),
    leaseId: null,
  };
}
