import type { Agent } from "@/domain/agent";
import { BSC_IDENTITY_REGISTRY } from "@/infrastructure/erc8004/addresses";

function base(
  partial: Omit<
    Agent,
    | "pancakeAprBps"
    | "pancakeTvlUsd"
    | "pancakePair"
    | "pancakeFeeBps"
    | "pancakeTick"
    | "pancakePrice"
    | "totalFeedbacks"
    | "averageScore"
    | "x402Supported"
    | "chainId"
    | "protocols"
    | "a2aEndpoint"
    | "mcpEndpoint"
    | "claimedJobs"
    | "extraServices"
    | "cardHydrated"
  > &
    Partial<
      Pick<
        Agent,
        | "pancakeAprBps"
        | "pancakeTvlUsd"
        | "pancakePair"
        | "pancakeFeeBps"
        | "pancakeTick"
        | "pancakePrice"
        | "totalFeedbacks"
        | "averageScore"
        | "x402Supported"
        | "chainId"
        | "protocols"
        | "a2aEndpoint"
        | "mcpEndpoint"
        | "claimedJobs"
        | "extraServices"
        | "cardHydrated"
      >
    >,
): Agent {
  return {
    pancakeAprBps: null,
    pancakeTvlUsd: null,
    pancakePair: null,
    pancakeFeeBps: null,
    pancakeTick: null,
    pancakePrice: null,
    totalFeedbacks: 0,
    averageScore: null,
    x402Supported: false,
    chainId: 56,
    protocols: [],
    a2aEndpoint: null,
    mcpEndpoint: null,
    claimedJobs: [],
    extraServices: [],
    cardHydrated: false,
    ...partial,
  };
}

/** Synthetic ERC-8004 catalog. Used only when 8004scan and RPC both fail. */
export class AgentRegistry {
  all(): Agent[] {
    const registry = BSC_IDENTITY_REGISTRY;
    return [
      base({
        id: "101",
        agentId: "101",
        handle: "HF-WATCH.8004",
        kind: "health-factor",
        pulse: "live",
        lastActivityBlock: 42_881_204,
        mandate: "Flag Venus positions before liquidation.",
        erc8004: `${registry}:101`,
        owner: "0x0000000000000000000000000000000000000a11",
        agentUri: "https://example.invalid/hf-watch.json",
        cardReadable: true,
        totalFeedbacks: 4,
        averageScore: 72,
      }),
      base({
        id: "102",
        agentId: "102",
        handle: "CAKE-SHIFT.8004",
        kind: "yield",
        pulse: "live",
        lastActivityBlock: 42_881_188,
        mandate: "Move idle USDT toward higher Cake LP yield.",
        erc8004: `${registry}:102`,
        owner: "0x0000000000000000000000000000000000004c90",
        agentUri: "https://example.invalid/cake-shift.json",
        cardReadable: true,
        x402Supported: true,
      }),
      base({
        id: "103",
        agentId: "103",
        handle: "GRID-RANGE.8004",
        kind: "grid",
        pulse: "live",
        lastActivityBlock: 42_880_901,
        mandate: "Grid BNB/USDT inside a posted band.",
        erc8004: `${registry}:103`,
        owner: "0x0000000000000000000000000000000000002b07",
        agentUri: "https://example.invalid/grid.json",
        cardReadable: true,
      }),
      base({
        id: "104",
        agentId: "104",
        handle: "RANGE-RESET.8004",
        kind: "rebalancing",
        pulse: "stale",
        lastActivityBlock: 42_640_012,
        mandate: "Reset concentrated Cake LP ranges when price walks out of band.",
        erc8004: `${registry}:104`,
        owner: "0x00000000000000000000000000000000000091ee",
        agentUri: "https://example.invalid/range-reset.json",
        cardReadable: true,
      }),
      base({
        id: "105",
        agentId: "105",
        handle: "EMPTY-CARD.8004",
        kind: "unknown",
        pulse: "unknown",
        lastActivityBlock: 0,
        mandate: "Agent card is missing. Treat as unverified until a sample is attested.",
        erc8004: `${registry}:105`,
        owner: "0x00000000000000000000000000000000000000d1",
        agentUri: "",
        cardReadable: false,
      }),
      base({
        id: "106",
        agentId: "106",
        handle: "CLMM-KEEP.8004",
        kind: "rebalancing",
        pulse: "live",
        lastActivityBlock: 42_881_210,
        mandate: "Keep a Pancake v3 CLMM position in range and reset when it drifts.",
        erc8004: `${registry}:106`,
        owner: "0x0000000000000000000000000000000000000c3a",
        agentUri: "https://example.invalid/clmm-keep.json",
        cardReadable: true,
        totalFeedbacks: 12,
        averageScore: 81,
      }),
    ];
  }
}
