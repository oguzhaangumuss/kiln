"use client";

import type { Agent } from "@/domain/agent";
import { buildCategoryDeck } from "@/domain/category-deck";

export function CategoryDeckPanel({
  agent,
  compact = false,
}: {
  agent: Agent;
  compact?: boolean;
}) {
  const deck = buildCategoryDeck(agent);
  if (compact) {
    return (
      <div className="grid gap-1 font-mono text-[10px] leading-4">
        <p className="text-ok">{deck.metricTitle}</p>
        <p className="text-ink/80">{deck.metricBody}</p>
        {deck.mismatch ? <p className="text-heat">{deck.mismatch}</p> : null}
      </div>
    );
  }
  return (
    <section className="border-b border-line px-6 py-5">
      <p className="font-mono text-[10px] tracking-[0.18em] text-ok uppercase">
        Category briefing
      </p>
      <h3 className="mt-2 font-mono text-sm text-ink">{deck.metricTitle}</h3>
      <p className="mt-2 font-sans text-sm leading-6 text-ink/85">{deck.officialMandate}</p>
      <p className="mt-3 font-sans text-sm leading-6 text-ink/80">{deck.metricBody}</p>
      <dl className="mt-4 grid gap-3 font-mono text-[11px] sm:grid-cols-2">
        <div>
          <dt className="text-ok">Who benefits</dt>
          <dd className="mt-1 text-ink">{deck.audience}</dd>
        </div>
        <div>
          <dt className="text-ok">PancakeSwap</dt>
          <dd className="mt-1 text-ink">{deck.pancakeProduct}</dd>
        </div>
      </dl>
      <p className="mt-3 font-mono text-[10px] leading-5 text-amber">{deck.fundsNote}</p>
      {deck.mismatch ? (
        <p className="mt-3 border border-heat px-3 py-2 font-sans text-[13px] leading-5 text-heat">
          {deck.mismatch}
        </p>
      ) : null}
    </section>
  );
}
