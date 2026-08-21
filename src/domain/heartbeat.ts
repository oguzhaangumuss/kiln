import type { SampleTrace } from "@/domain/sample-trace";

export type Heartbeat = {
  id: string;
  leaseId: string;
  at: string;
  reachable: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  endpoint: string | null;
  skills: string[];
  snippet: string;
  verdict: string;
};

export function heartbeatDraft(
  leaseId: string,
  trace: SampleTrace,
  at = new Date().toISOString(),
): Omit<Heartbeat, "id"> {
  return {
    leaseId,
    at,
    reachable: trace.reachable,
    httpStatus: trace.httpStatus,
    latencyMs: trace.latencyMs,
    endpoint: trace.endpoint,
    skills: trace.jobs?.length ? trace.jobs.map((job) => job.name) : (trace.skills ?? []),
    snippet: trace.jobs?.length
      ? trace.jobs
          .slice(0, 8)
          .map((job) => job.name)
          .join(" · ")
      : trace.snippet,
    verdict: trace.verdict,
  };
}
