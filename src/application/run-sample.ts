import type { Agent } from "@/domain/agent";
import type { Attestation } from "@/domain/attestation";
import { fireSample } from "@/infrastructure/sample-kiln";

export async function runSample(agent: Agent): Promise<Attestation> {
  return fireSample(agent);
}
