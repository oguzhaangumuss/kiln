import type { Agent, AgentKind, Pulse } from "@/domain/agent";
import { buildCategoryDeck } from "@/domain/category-deck";
import type { SampleTrace } from "@/domain/sample-trace";

export type WorkReport = {
  kind: AgentKind;
  overlay: string;
  result: string;
  disclaimer: string;
  pulse: Pulse;
  walletsWatched: number;
  healthFactor: number | null;
  liquidationLine: number | null;
  bandLow: number | null;
  bandHigh: number | null;
  price: number | null;
  aprBps: number | null;
  tvlUsd: number | null;
};

const DISCLAIMER =
  "Kiln sample of this agent’s claimed job — not a live vault.";

export function buildWorkReport(agent: Agent): WorkReport {
  const deck = buildCategoryDeck(agent);
  return {
    kind: agent.kind,
    overlay: deck.metricTitle,
    result: deck.metricBody,
    disclaimer: DISCLAIMER,
    pulse: agent.pulse,
    walletsWatched: 0,
    healthFactor: null,
    liquidationLine: null,
    bandLow: null,
    bandHigh: null,
    price: agent.pancakePrice,
    aprBps: agent.pancakeAprBps,
    tvlUsd: agent.pancakeTvlUsd,
  };
}

export function workFromTrace(agent: Agent, trace: SampleTrace): WorkReport {
  const base = buildWorkReport(agent);
  return {
    ...base,
    overlay: trace.reachable
      ? `Catalog · ${trace.jobs?.length ?? 0} jobs · ${trace.latencyMs ?? "?"}ms`
      : trace.hydrateFailed
        ? "Card refresh failed"
        : trace.endpoint
          ? "Endpoint listed · no answer"
          : "Identity only · no public job URL",
    result: trace.verdict,
    disclaimer:
      "Kiln reads the advertised A2A/MCP catalog. That is not a live view of the agent’s private jobs or vault.",
  };
}
