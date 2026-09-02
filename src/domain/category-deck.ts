import type { Agent, AgentKind } from "@/domain/agent";
import { CATEGORY_MANDATE, classifyKind, FIRST_CLASS_KINDS } from "@/domain/kind";
import type { PublishedJob } from "@/domain/published-job";

export const FUNDS_AT_RISK_NOTE =
  "Kiln sample and hire do not send your funds to the agent wallet. Spend stays inside the Kiln envelope you set and can revoke.";

export type CategoryDeck = {
  kind: AgentKind;
  officialMandate: string;
  metricTitle: string;
  metricBody: string;
  audience: string;
  pancakeProduct: string;
  fundsNote: string;
  mismatch: string | null;
};

function jobsCorpus(jobs: PublishedJob[]): string {
  return jobs.map((job) => `${job.name} ${job.description}`).join(" ");
}

function mentions(text: string, needles: string[]): boolean {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

export function mandateJobMismatch(
  agent: Pick<Agent, "kind" | "claimedJobs">,
): string | null {
  const jobs = agent.claimedJobs ?? [];
  if (jobs.length === 0) return null;
  const corpus = jobsCorpus(jobs);
  const fromJobs = classifyKind(corpus);
  const genericPay = mentions(corpus, ["erc-8183", "erc8183", "negotiate", "notify", "x402"]);
  if (
    FIRST_CLASS_KINDS.includes(agent.kind) &&
    fromJobs !== "unknown" &&
    fromJobs !== agent.kind
  ) {
    return `Card is filed as ${agent.kind}, but published jobs look like ${fromJobs}. Hire with that mismatch in mind.`;
  }
  if (FIRST_CLASS_KINDS.includes(agent.kind) && genericPay && fromJobs === "unknown") {
    return `Card is filed as ${agent.kind}, but the door mostly publishes hire/pay skills, not that DeFi job. Sample proves the catalog answered — not that the private ${agent.kind} job ran.`;
  }
  return null;
}

function pairLine(agent: Agent): string {
  const pair = agent.pancakePair || "BSC Cake v3 reference pool";
  const fee =
    agent.pancakeFeeBps !== null
      ? ` · fee ${(agent.pancakeFeeBps / 10_000).toFixed(2)}%`
      : "";
  return `${pair}${fee}`;
}

function aprLine(agent: Agent): string {
  if (agent.pancakeAprBps === null && agent.pancakeTvlUsd === null) {
    return "Live pool data unavailable. APR is not estimated.";
  }
  const apr =
    agent.pancakeAprBps !== null
      ? `${(agent.pancakeAprBps / 100).toFixed(2)}% APR`
      : "APR unavailable";
  const tvl =
    agent.pancakeTvlUsd !== null
      ? `TVL $${Math.round(agent.pancakeTvlUsd).toLocaleString()}`
      : "";
  return [apr, tvl].filter(Boolean).join(" · ");
}

function markLine(agent: Agent): string {
  if (agent.pancakePrice === null && agent.pancakeTick === null) {
    return "Mark price unavailable. No invented band.";
  }
  const price =
    agent.pancakePrice !== null ? `mark ${agent.pancakePrice.toPrecision(6)}` : "";
  const tick = agent.pancakeTick !== null ? `tick ${agent.pancakeTick}` : "";
  return [price, tick].filter(Boolean).join(" · ");
}

function healthTools(agent: Agent): { found: boolean; names: string } {
  const jobs = agent.claimedJobs ?? [];
  const hits = jobs.filter((job) =>
    mentions(`${job.name} ${job.description}`, ["health", "liquidat", "ltv", "collateral"]),
  );
  return {
    found: hits.length > 0,
    names: hits.map((job) => job.name).join(", ") || "none",
  };
}

export function buildCategoryDeck(agent: Agent): CategoryDeck {
  const mismatch = mandateJobMismatch(agent);
  const officialMandate = CATEGORY_MANDATE[agent.kind];

  if (agent.kind === "yield") {
    return {
      kind: agent.kind,
      officialMandate,
      metricTitle: "Yield reference",
      metricBody: `${pairLine(agent)} · ${aprLine(agent)} — not this agent’s vault.`,
      audience: "PancakeSwap liquidity providers and yield seekers.",
      pancakeProduct: "PancakeSwap v3 pool (public reference).",
      fundsNote: FUNDS_AT_RISK_NOTE,
      mismatch,
    };
  }

  if (agent.kind === "rebalancing") {
    return {
      kind: agent.kind,
      officialMandate,
      metricTitle: "LP range vs live tick",
      metricBody: `${pairLine(agent)} · ${markLine(agent)}. This agent’s concentrated LP range is private unless listed in the catalog — Kiln does not invent it.`,
      audience: "PancakeSwap liquidity providers (range reset).",
      pancakeProduct: "PancakeSwap v3 CLMM tick and price (public).",
      fundsNote: FUNDS_AT_RISK_NOTE,
      mismatch,
    };
  }

  if (agent.kind === "grid") {
    return {
      kind: agent.kind,
      officialMandate,
      metricTitle: "Grid vs live mark",
      metricBody: `${pairLine(agent)} · ${markLine(agent)}. This agent’s posted grid band is unknown unless the catalog lists it.`,
      audience: "PancakeSwap traders (automated grid).",
      pancakeProduct: "PancakeSwap v3 mark price (public).",
      fundsNote: FUNDS_AT_RISK_NOTE,
      mismatch,
    };
  }

  if (agent.kind === "health-factor") {
    const tools = healthTools(agent);
    return {
      kind: agent.kind,
      officialMandate,
      metricTitle: "Liquidation tools on the door",
      metricBody: tools.found
        ? `Published health/liquidation jobs: ${tools.names}. Venus HF is not invented from a vault.`
        : agent.claimedJobs.length
          ? "This door does not publish a health-factor or liquidation tool. Kiln will not invent a Venus HF."
          : "No catalog yet. Pick the row or fire sample to load published jobs.",
      audience: "Lending positions (liquidation protection). Not a Pancake LP tool.",
      pancakeProduct: "—",
      fundsNote: FUNDS_AT_RISK_NOTE,
      mismatch,
    };
  }

  return {
    kind: agent.kind,
    officialMandate,
    metricTitle: "Unclassified card",
    metricBody: "This identity does not map to rebalancing, grid, yield, or health factor.",
    audience: "Not a first-class category.",
    pancakeProduct: "—",
    fundsNote: FUNDS_AT_RISK_NOTE,
    mismatch,
  };
}

export function informedMetricLine(agent: Agent, detail = false): string {
  if (!detail) return "";
  return buildCategoryDeck(agent).metricBody;
}
