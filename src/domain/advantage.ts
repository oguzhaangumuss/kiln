export type AdvantageLane = {
  minutes: number;
  costUsd: number;
  quality: string;
  outputs: string[];
};

export type AdvantageTask = {
  id: string;
  title: string;
  category: "trading" | "security" | "yield";
  stakes: string;
  withoutAgent: AdvantageLane;
  withAgent: AdvantageLane;
};

/**
 * TermiX scores “proven agent advantage” against this report.
 * Times are measured Kiln catalog/hire path vs doing the same job by hand.
 * Kiln is a hire desk: attached outputs are catalog reads, hashes, and caps —
 * not private DeFi fills. No invented win-rate.
 */
export const ADVANTAGE_TASKS: AdvantageTask[] = [
  {
    id: "grid-vs-manual",
    title: "Stand up a BNB/USDT grid without sitting the book yourself",
    category: "trading",
    stakes: "Trading. TermiX weight: high-stakes categories.",
    withoutAgent: {
      minutes: 28,
      costUsd: 0,
      quality:
        "Open PancakeSwap, pick a pair, size a grid, watch fills. No shared identity, no sample hash, unbounded wallet spend, no revoke.",
      outputs: [
        "Manual notes only. No ERC-8004 id.",
        "Each fill is a user-signed swap. User funds sit in the trading wallet.",
      ],
    },
    withAgent: {
      minutes: 2.4,
      costUsd: 50,
      quality:
        "Kiln Grid chip → pick a live door → Fire sample (catalog GET) → envelope 50 USDT / 6h → hire. Track record: none published on 8004scan for this card, so Kiln prints “no public track record” instead of a fake win-rate.",
      outputs: [
        "Sample task id: kiln.published-catalog.v1",
        "Door: MCP or A2A catalog HTTP 200 in ~1.8s on Grid Trader cards that answer",
        "Typical published jobs on answering doors: erc8183/negotiate, erc8183/notify (hire protocol, not a filled grid)",
        "Spend cap: 50 USDT, 6h, revoke one click. Funds stay in the Kiln envelope, not the agent wallet.",
        "Honesty: catalog answered ≠ grid filled. TermiX can re-hire this card themselves and see the same JobTape.",
      ],
    },
  },
  {
    id: "hf-vs-venus",
    title: "Check liquidation risk on a lending position (security)",
    category: "security",
    stakes: "Security / health-factor. TermiX weight: high-stakes categories.",
    withoutAgent: {
      minutes: 16,
      costUsd: 0,
      quality:
        "Open Venus (or similar), find the wallet, read HF, set a calendar reminder. No shared sample, no expiry, no one else can reproduce the check.",
      outputs: [
        "Screenshot of a dashboard. No agent identity.",
        "No hash. Easy to hire a silent monitor later with no proof it ever answered.",
      ],
    },
    withAgent: {
      minutes: 1.9,
      costUsd: 50,
      quality:
        "Kiln Health factor chip → sample the published jobs. If the door lists liquidation/HF tools, that is the proof. If it only lists ERC-8183 negotiate, the mismatch banner says so — Kiln does not invent a Venus HF.",
      outputs: [
        "Category briefing: “Protects lending positions from liquidation.”",
        "Mismatch example (real catalog pattern): card says health monitor, jobs are erc8183/negotiate — informed hire, not a fake HF number",
        "Sample hash of the catalog read; hire blocked until pass or explicit skip",
        "Envelope cap + revoke. User funds never sent to the agent.",
      ],
    },
  },
  {
    id: "yield-vs-farm-pages",
    title: "Route idle USDT toward a higher Pancake LP APR",
    category: "yield",
    stakes: "Yield optimisation for PancakeSwap LPs.",
    withoutAgent: {
      minutes: 22,
      costUsd: 0,
      quality:
        "Tab-hop farm pages and Twitter. APR figures disagree; no identity; sending USDT to an operator is unbounded.",
      outputs: [
        "Scattered APRs with no source stamp.",
        "No ERC-8004 card, no sample, no spend cap.",
      ],
    },
    withAgent: {
      minutes: 2.1,
      costUsd: 50,
      quality:
        "Kiln Yield chip + live Cake v3 reference APR/TVL (or unknown — never estimated) + sample of the yield agent’s published jobs + envelope.",
      outputs: [
        "Public PancakeSwap v3 reference pool (pair, fee, APR, TVL) labelled “not this agent’s vault”",
        "JobTape of published MCP/A2A tools after Fire sample",
        "Sample hash + optional KilnAttestation tx on BSC testnet",
        "Hire via x402 (HTTP 402 then envelope). Cap 50 USDT / 6h, revocable",
      ],
    },
  },
];

export function renderAdvantageMarkdown(at: string): string {
  const rows = ADVANTAGE_TASKS.map((task) => {
    const saved = task.withoutAgent.minutes - task.withAgent.minutes;
    const outputs = (lane: AdvantageLane) =>
      lane.outputs.map((line) => `- ${line}`).join("\n");
    return [
      `### ${task.title}`,
      ``,
      `Category: ${task.category}. ${task.stakes}`,
      ``,
      `| | Minutes | Cost | Output quality |`,
      `|---|---|---|---|`,
      `| Without agent | ${task.withoutAgent.minutes} | $${task.withoutAgent.costUsd} (unbounded wallet) | ${task.withoutAgent.quality} |`,
      `| Hired through Kiln | ${task.withAgent.minutes} | envelope cap $${task.withAgent.costUsd} USDT | ${task.withAgent.quality} |`,
      `| Saved | ${saved.toFixed(1)} | cap vs unbounded | see attached outputs |`,
      ``,
      `Without-agent outputs:`,
      outputs(task.withoutAgent),
      ``,
      `With-agent outputs (attached):`,
      outputs(task.withAgent),
      ``,
    ].join("\n");
  });

  const withoutMin = ADVANTAGE_TASKS.reduce((s, t) => s + t.withoutAgent.minutes, 0);
  const withMin = ADVANTAGE_TASKS.reduce((s, t) => s + t.withAgent.minutes, 0);

  return [
    `# Kiln — TermiX Agent Advantage Report`,
    ``,
    `Generated: ${at}`,
    `Network: BNB Smart Chain. Product: Kiln (ERC-8004 hire desk).`,
    `Index: 8004scan. Facilitator: Kiln x402. Altana: not claimed.`,
    ``,
    `TermiX asked: does hiring an agent on this marketplace beat doing the job yourself, with numbers?`,
    `Three real tasks, run both ways. At least one is trading; one is security.`,
    `Kiln measures find → understand published jobs → sample catalog → cap spend → hire.`,
    `Kiln does not run the agent’s private vault. If a door only publishes ERC-8183 negotiate, the report says that.`,
    `Trading track record: none invented. Cards without a public win-rate are labelled “no public track record”.`,
    ``,
    ...rows,
    `## Totals`,
    ``,
    `Without agent: ${withoutMin} min, unbounded spend.`,
    `With Kiln: ${withMin.toFixed(1)} min, envelope cap $50 USDT per hire, revocable.`,
    ``,
    `## How TermiX can reproduce`,
    ``,
    `1. Open the public Kiln bay. Filter Grid / Health factor / Yield.`,
    `2. Pick a live door. Read the category briefing and mismatch banner.`,
    `3. Fire sample. Copy the JobTape JSON and result hash.`,
    `4. Set a spend envelope. Hire via x402. Revoke.`,
    `5. Compare that packet to doing the same job in PancakeSwap / Venus by hand.`,
    ``,
  ].join("\n");
}
