export type AdvantageLane = {
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
 * TermiX Agent Advantage packet. Kiln is a hire desk: attached outputs are
 * catalog reads, hashes, and spend caps — not private DeFi fills, minutes, or
 * invented win-rate.
 */
export const ADVANTAGE_TASKS: AdvantageTask[] = [
  {
    id: "grid-vs-manual",
    title: "Stand up a BNB/USDT grid without sitting the book yourself",
    category: "trading",
    stakes: "Trading. TermiX weight: high-stakes categories.",
    withoutAgent: {
      quality:
        "Open PancakeSwap, pick a pair, size a grid, watch fills. No shared identity, no sample hash, unbounded wallet spend, no revoke.",
      outputs: [
        "Manual notes only. No ERC-8004 id.",
        "Each fill is a user-signed swap. User funds sit in the trading wallet.",
      ],
    },
    withAgent: {
      quality:
        "Kiln Grid chip → pick a live door → Fire sample (catalog GET) → lock a spend envelope → hire. If the card has no public win-rate, Kiln does not invent one.",
      outputs: [
        "Sample task id: kiln.published-catalog.v1",
        "Door: HTTP GET of the advertised MCP or A2A catalog",
        "Published jobs are listed as the door sent them (often erc8183/negotiate — hire protocol, not a filled grid)",
        "Spend cap in KilnEnvelope, revocable. Funds stay in the cap, not the agent wallet.",
        "Honesty: catalog answered ≠ grid filled.",
      ],
    },
  },
  {
    id: "hf-vs-venus",
    title: "Check liquidation risk on a lending position (security)",
    category: "security",
    stakes: "Security / health-factor. TermiX weight: high-stakes categories.",
    withoutAgent: {
      quality:
        "Open Venus (or similar), find the wallet, read HF, set a calendar reminder. No shared sample, no expiry, no one else can reproduce the check.",
      outputs: [
        "Screenshot of a dashboard. No agent identity.",
        "No hash. Easy to hire a silent monitor later with no proof it ever answered.",
      ],
    },
    withAgent: {
      quality:
        "Kiln Health factor chip → sample the published jobs. If the door lists liquidation/HF tools, that is the proof. If it only lists ERC-8183 negotiate, the mismatch banner says so — Kiln does not invent a Venus HF.",
      outputs: [
        "Category briefing: “Protects lending positions from liquidation.”",
        "Mismatch banner when the card says health monitor but jobs are hire/pay skills",
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
      quality:
        "Tab-hop farm pages and Twitter. APR figures disagree; no identity; sending USDT to an operator is unbounded.",
      outputs: [
        "Scattered APRs with no source stamp.",
        "No ERC-8004 card, no sample, no spend cap.",
      ],
    },
    withAgent: {
      quality:
        "Kiln Yield chip + live Cake v3 reference APR/TVL (or unknown — never estimated) + sample of the yield agent’s published jobs + envelope.",
      outputs: [
        "Public PancakeSwap v3 reference pool labelled “not this agent’s vault”",
        "JobTape of published MCP/A2A tools after Fire sample",
        "Sample hash + optional KilnAttestation tx on BSC testnet",
        "Hire via x402 (HTTP 402 then envelope). Cap is the number you type; it is revocable",
      ],
    },
  },
];

export function renderAdvantageMarkdown(at: string): string {
  const rows = ADVANTAGE_TASKS.map((task) => {
    const outputs = (lane: AdvantageLane) =>
      lane.outputs.map((line) => `- ${line}`).join("\n");
    return [
      `### ${task.title}`,
      ``,
      `Category: ${task.category}. ${task.stakes}`,
      ``,
      `Without agent: ${task.withoutAgent.quality}`,
      ``,
      `Hired through Kiln: ${task.withAgent.quality}`,
      ``,
      `Without-agent outputs:`,
      outputs(task.withoutAgent),
      ``,
      `With-agent outputs (attached):`,
      outputs(task.withAgent),
      ``,
    ].join("\n");
  });

  return [
    `# Kiln — TermiX Agent Advantage Report`,
    ``,
    `Generated: ${at}`,
    `Network: BNB Smart Chain. Product: Kiln (ERC-8004 hire desk).`,
    `Index: 8004scan. Facilitator: Kiln x402. Altana: not claimed.`,
    ``,
    `TermiX asked: does hiring an agent on this marketplace beat doing the job yourself?`,
    `Three real tasks, both ways. At least one is trading; one is security.`,
    `Kiln proves find → published jobs → sample catalog GET → cap spend → hire.`,
    `Kiln does not invent minutes, win-rate, vault PnL, or Venus health factor.`,
    ``,
    ...rows,
    `## How TermiX can reproduce`,
    ``,
    `1. Open the public Kiln bay. Filter Grid / Health factor / Yield.`,
    `2. Pick a live door. Read the category briefing and mismatch banner.`,
    `3. Fire sample. Copy the JobTape and result hash.`,
    `4. Set a spend envelope. Hire via x402. Revoke.`,
    `5. Compare that packet to doing the same job in PancakeSwap / Venus by hand.`,
    ``,
  ].join("\n");
}
