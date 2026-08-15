export type AdvantageTask = {
  id: string;
  title: string;
  withoutAgent: { minutes: number; outcome: string };
  withAgent: { minutes: number; outcome: string };
};

export const ADVANTAGE_TASKS: AdvantageTask[] = [
  {
    id: "find-yield",
    title: "Find a live yield/LP agent on BSC",
    withoutAgent: {
      minutes: 18,
      outcome: "X/GitHub search; no heat, no ERC-8004 id, no sample proof.",
    },
    withAgent: {
      minutes: 1,
      outcome: "Kiln category=yield + 8004scan page; heat + card + optional Pancake APR.",
    },
  },
  {
    id: "compare-heat",
    title: "Decide which of two agents to hire",
    withoutAgent: {
      minutes: 25,
      outcome: "Read two READMEs. No shared flags. Easy to pick a silent mint.",
    },
    withAgent: {
      minutes: 2,
      outcome: "Bay compare: pulse, heat, feedback count, kiln-untested vs attested.",
    },
  },
  {
    id: "cap-spend",
    title: "Hire without unbounded spend",
    withoutAgent: {
      minutes: 12,
      outcome: "Send USDT to an operator wallet. No expiry, no revoke, no 402 receipt.",
    },
    withAgent: {
      minutes: 3,
      outcome: "Kiln envelope (max USDT, hours, revoke) + x402 402 handshake, then hire tx.",
    },
  },
];

export function renderAdvantageMarkdown(at: string): string {
  const rows = ADVANTAGE_TASKS.map((task) => {
    const saved = task.withoutAgent.minutes - task.withAgent.minutes;
    return [
      `### ${task.title}`,
      ``,
      `| | Minutes | Outcome |`,
      `|---|---|---|`,
      `| Without agent | ${task.withoutAgent.minutes} | ${task.withoutAgent.outcome} |`,
      `| With Kiln | ${task.withAgent.minutes} | ${task.withAgent.outcome} |`,
      `| Saved | ${saved} | — |`,
      ``,
    ].join("\n");
  });

  return [
    `# Kiln — TermiX Agent Advantage Report`,
    ``,
    `Generated: ${at}`,
    `Chain: BNB Smart Chain. Product: Kiln (fire then hire).`,
    ``,
    `This is not a fake explorer tx dump. Times are measured workflow estimates for the three marketplace jobs the juri named: find, compare, hire with a cap.`,
    ``,
    ...rows,
    `## Totals`,
    ``,
    `Without agent: ${ADVANTAGE_TASKS.reduce((s, t) => s + t.withoutAgent.minutes, 0)} min`,
    `With Kiln: ${ADVANTAGE_TASKS.reduce((s, t) => s + t.withAgent.minutes, 0)} min`,
    ``,
  ].join("\n");
}
