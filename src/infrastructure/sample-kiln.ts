import type { Agent } from "@/domain/agent";
import type { Attestation } from "@/domain/attestation";
import type { SampleTrace } from "@/domain/sample-trace";
import { workFromTrace } from "@/domain/work-report";
import { probeAgent } from "@/infrastructure/agent-probe";

export const SAMPLE_TASK_ID = "kiln.published-catalog.v1";

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

function withHashTick(trace: SampleTrace, resultHash: string): SampleTrace {
  const ticks = [...trace.ticks];
  const last = ticks[ticks.length - 1];
  const hashTick = {
    tMs: (last?.tMs ?? 0) + 40,
    step: "hash" as const,
    status: "info" as const,
    title: "Result hash",
    detail: resultHash,
  };
  const verdictAt = ticks.findIndex((tick) => tick.step === "verdict");
  if (verdictAt >= 0) ticks.splice(verdictAt, 0, hashTick);
  else ticks.push(hashTick);
  return { ...trace, ticks };
}

export function sampleResultHash(agent: Agent, trace?: SampleTrace): string {
  const payload = trace
    ? `${agent.id}|${SAMPLE_TASK_ID}|${trace.endpoint ?? "none"}|${trace.httpStatus ?? "na"}|${trace.reachable ? "live" : "dead"}|${trace.jobs?.length ?? 0}`
    : `${agent.id}|${SAMPLE_TASK_ID}|${agent.lastActivityBlock}|pass`;
  return hexFrom(payload).padEnd(66, "0");
}

export async function fireSample(agent: Agent): Promise<Attestation> {
  const probed = await probeAgent(agent);
  const resultHash = sampleResultHash(agent, probed);
  const trace = withHashTick(probed, resultHash);
  return {
    agentId: agent.id,
    taskId: SAMPLE_TASK_ID,
    resultHash,
    txHash: null,
    at: new Date().toISOString(),
    work: workFromTrace(agent, trace),
    trace,
  };
}
