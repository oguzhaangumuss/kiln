import type { Agent } from "@/domain/agent";
import type { Envelope } from "@/domain/envelope";
import { envelopeAllowsHire } from "@/domain/envelope";
import type { Hire, HireFacilitator } from "@/domain/hire";
import { simulateHireTx } from "@/infrastructure/sample-kiln";

export function hireAgent(
  agent: Agent,
  envelope: Envelope,
  attested: boolean,
  skippedAttestation: boolean,
  facilitator: HireFacilitator = "kiln",
  txHash: string | null = null,
): Hire {
  if (!attested && !skippedAttestation) {
    throw new Error("Hire blocked: sample-run not attested.");
  }
  if (!envelopeAllowsHire(envelope)) {
    throw new Error("Hire blocked: envelope empty or revoked.");
  }
  return {
    agentId: agent.id,
    simulatedTx: simulateHireTx(agent.id, envelope.maxUsdt),
    txHash,
    maxUsdt: envelope.maxUsdt,
    hours: envelope.hours,
    facilitator,
    at: new Date().toISOString(),
  };
}
