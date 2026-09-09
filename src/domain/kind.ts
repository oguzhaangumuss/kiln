import type { AgentKind } from "@/domain/agent";

/**
 * Official first-class Kiln categories (BNB Agent Studio marketplace brief).
 * Order matches the hackathon table. `unknown` is a leftover chip, not a fifth track.
 */
export const FIRST_CLASS_KINDS: AgentKind[] = [
  "rebalancing",
  "grid",
  "yield",
  "health-factor",
];

export const AGENT_KINDS: AgentKind[] = [...FIRST_CLASS_KINDS, "unknown"];

export const CATEGORY_MANDATE: Record<AgentKind, string> = {
  rebalancing: "Manages LP ranges and resets positions automatically.",
  grid: "Places and manages automated grid orders.",
  yield: "Routes liquidity to the highest available APR.",
  "health-factor": "Protects lending positions from liquidation.",
  unknown: "This card does not map to a first-class Kiln category yet.",
};

/**
 * Weighted needles. A first-match-wins scan mis-files agents whose text mentions
 * several categories: "Yield Weaver [Farm Strategist]" reads as rebalancing the
 * moment it also says "rebalance", and a generic "trading" once claimed yield.
 * Strong needles name the mandate itself; weak needles are supporting evidence
 * that only decides between kinds when nothing stronger matched.
 */
const STRONG = 4;
const WEAK = 1;

const KEYWORDS: Array<{ kind: AgentKind; needles: Array<[string, number]> }> = [
  {
    kind: "rebalancing",
    needles: [
      ["rebalanc", STRONG],
      ["lp range", STRONG],
      ["range reset", STRONG],
      ["reset position", STRONG],
      ["concentrated liquidity", STRONG],
      ["clmm", STRONG],
      ["range state", STRONG],
      ["concentrated", WEAK],
    ],
  },
  {
    kind: "health-factor",
    needles: [
      ["health factor", STRONG],
      ["health-factor", STRONG],
      ["liquidation", STRONG],
      ["liquidat", WEAK],
      ["ltv", STRONG],
      ["venus", STRONG],
      ["collateral", WEAK],
      ["lending position", STRONG],
    ],
  },
  {
    kind: "grid",
    needles: [
      ["grid trading", STRONG],
      ["grid trader", STRONG],
      ["grid plan", STRONG],
      ["grid order", STRONG],
      ["grid", WEAK],
      ["ladder", WEAK],
      ["band", WEAK],
    ],
  },
  {
    kind: "yield",
    needles: [
      ["yield", STRONG],
      ["apr", STRONG],
      ["apy", STRONG],
      // "farm" alone catches airdrop farming and literal agriculture, so the
      // DeFi sense has to be spelled out; bare "farm" only breaks a tie.
      ["yield farm", STRONG],
      ["farming protocol", STRONG],
      ["auto-compound", STRONG],
      ["autocompound", STRONG],
      ["liquid staking", STRONG],
      ["highest available", STRONG],
      ["farm", WEAK],
      ["compound", WEAK],
      ["staking", WEAK],
      ["cake", WEAK],
      ["pancake", WEAK],
    ],
  },
];

/**
 * Highest score wins. Ties fall to the kind whose strongest needle appears
 * earliest in the text, which favours the phrase the card leads with.
 *
 * A category is only claimed once something names the mandate: weak needles
 * are supporting evidence, never a verdict on their own. Otherwise "Farming
 * and Nature" and node-babysitting for airdrop farming both read as yield,
 * which pads a chip with cards a hirer cannot use.
 */
export function classifyKind(text: string): AgentKind {
  const t = text.toLowerCase();
  let best: AgentKind = "unknown";
  let bestScore = 0;
  let bestAt = Number.MAX_SAFE_INTEGER;

  for (const row of KEYWORDS) {
    let score = 0;
    let firstAt = Number.MAX_SAFE_INTEGER;
    for (const [needle, weight] of row.needles) {
      const at = t.indexOf(needle);
      if (at < 0) continue;
      score += weight;
      if (weight === STRONG && at < firstAt) firstAt = at;
    }
    if (score === 0 || firstAt === Number.MAX_SAFE_INTEGER) continue;
    if (score > bestScore || (score === bestScore && firstAt < bestAt)) {
      best = row.kind;
      bestScore = score;
      bestAt = firstAt;
    }
  }

  return best;
}

export function parseAgentKind(raw: unknown): AgentKind {
  if (raw === "monitoring") return "rebalancing";
  if (typeof raw === "string" && (AGENT_KINDS as string[]).includes(raw)) {
    return raw as AgentKind;
  }
  return "unknown";
}

export function categorySearchQ(category: AgentKind | "all"): string {
  if (category === "yield") return "yield";
  if (category === "health-factor") return "liquidation";
  if (category === "grid") return "grid";
  if (category === "rebalancing") return "rebalance";
  return "";
}

/**
 * Search terms sent to 8004scan, widest first. Its search is fuzzy, so a single
 * term returns mostly unrelated cards; the classifier filters them out again.
 * Several terms per category is what gives each chip comparable depth — "yield"
 * alone surfaced two agents while the registry holds far more under farm/staking.
 */
export function categorySearchNeedles(category: AgentKind | "all"): string[] {
  if (category === "yield") {
    return ["yield", "farm", "staking", "apy", "compound", "apr"];
  }
  if (category === "health-factor") {
    return ["liquidation", "health factor", "ltv", "venus", "lending", "collateral"];
  }
  if (category === "grid") return ["grid", "grid trading", "ladder", "band"];
  if (category === "rebalancing") {
    return ["rebalance", "lp range", "clmm", "concentrated liquidity", "range"];
  }
  return [];
}

export function kindLabel(kind: AgentKind | "all"): string {
  if (kind === "all") return "All";
  if (kind === "rebalancing") return "Rebalancing";
  if (kind === "grid") return "Grid";
  if (kind === "yield") return "Yield";
  if (kind === "health-factor") return "Health factor";
  return "Unclassified";
}
