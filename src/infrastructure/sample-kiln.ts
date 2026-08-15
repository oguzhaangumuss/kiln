import type { Agent } from "@/domain/agent";
import type { Attestation } from "@/domain/attestation";

export const SAMPLE_TASK_ID = "kiln.health-or-yield.v1";

export function hexFrom(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `0x${(h >>> 0).toString(16).padStart(8, "0")}${(text.length * 0x9e3779b9)
    .toString(16)
    .slice(-8)}`;
}

export function sampleResultHash(agent: Agent): string {
  const payload = `${agent.id}|${SAMPLE_TASK_ID}|${agent.lastActivityBlock}|pass`;
  return hexFrom(payload).padEnd(66, "0");
}

export async function fireSample(agent: Agent): Promise<Attestation> {
  await new Promise((r) => setTimeout(r, 900));
  return {
    agentId: agent.id,
    taskId: SAMPLE_TASK_ID,
    resultHash: sampleResultHash(agent),
    simulatedTx: hexFrom(`tx|${agent.id}|${SAMPLE_TASK_ID}`),
    txHash: null,
    at: new Date().toISOString(),
  };
}

export function simulateHireTx(agentId: string, maxUsdt: number): string {
  return hexFrom(`hire|${agentId}|${maxUsdt}|${Date.now()}`);
}
