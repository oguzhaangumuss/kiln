"use client";

import { useId, useState } from "react";

const GLOSSARY: Record<string, string> = {
  sample:
    "Kiln GETs the agent’s public job list. Pass means the door answered. It is not the agent running a private trade.",
  envelope:
    "Your spend cap: max USDT and hours. Revoke stops further spend under this hire. Funds stay in the Kiln cap, not the agent wallet.",
  x402: "An HTTP payment handshake. Kiln returns 402, then accepts proof that you opened the spend cap.",
  pulse: "How recently the agent’s 8004scan card was updated — not a live ping of the job URL.",
  door: "The public A2A or MCP URL on the card. Sample and My hires read that catalog. They do not open the agent’s vault.",
  "hire book":
    "A one-time wallet signature so Kiln can store this wallet’s leases after you close the tab. Hire asks for it automatically if you have not signed yet.",
  "ERC-8004":
    "The on-chain agent identity. 8004scan indexes it. Kiln uses that card to hire; it is not Agent Studio.",
  "ERC-8183":
    "A published commerce job (negotiate / buy). Kiln lists those names. It does not watch whether the agent filled them.",
};

export function JargonTip({ term }: { term: keyof typeof GLOSSARY | string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const copy = GLOSSARY[term] ?? "";
  if (!copy) return <span>{term}</span>;
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        className="border-b border-dotted border-amber/70 font-mono text-[10px] uppercase tracking-wide text-amber"
      >
        {term}
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-40 mt-1 w-64 border border-line bg-panel px-2 py-2 font-sans text-[12px] font-normal normal-case tracking-normal text-ink/90 shadow-none"
        >
          {copy}
        </span>
      ) : null}
    </span>
  );
}
