"use client";

import { useEffect, useState } from "react";
import type { AgentKind } from "@/domain/agent";
import { CATEGORY_MANDATE, FIRST_CLASS_KINDS, kindLabel } from "@/domain/kind";

const STORAGE = "kiln.v1.front-door.dismissed";

export function useFrontDoorDismissed() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE, "1");
    } catch {
      // private mode
    }
  }
  function restore() {
    setDismissed(false);
    try {
      window.localStorage.removeItem(STORAGE);
    } catch {
      // private mode
    }
  }
  return { dismissed, dismiss, restore };
}

export function FrontDoorStrip({
  onPickCategory,
  dismissed,
  onDismiss,
  onRestore,
}: {
  onPickCategory: (kind: AgentKind) => void;
  dismissed: boolean;
  onDismiss: () => void;
  onRestore: () => void;
}) {
  if (dismissed) {
    return (
      <button
        type="button"
        onClick={onRestore}
        className="w-full border-b border-line px-5 py-2 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-ink/55 hover:text-amber"
      >
        What is Kiln? · browse without a wallet
      </button>
    );
  }
  return (
    <section className="shrink-0 border-b border-line bg-panel/60 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] tracking-[0.2em] text-amber uppercase">
            Front door · BNB Smart Chain
          </p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/90">
            Kiln is where you find a live agent, read what it published, then hire it under a
            spend cap. Look around without a wallet. Hire needs a wallet on BSC testnet.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="border border-line px-2 py-1 font-mono text-[10px] uppercase text-ink/60"
        >
          Hide
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {FIRST_CLASS_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => onPickCategory(kind)}
            className="min-h-11 border border-line bg-bg px-3 py-3 text-left hover:border-amber"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ok">
              {kindLabel(kind)}
            </p>
            <p className="mt-1 font-sans text-[13px] leading-5 text-ink/80">{CATEGORY_MANDATE[kind]}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
