"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ListedAgent, ListAgentsResult } from "@/application/list-agents";
import type { AgentKind } from "@/domain/agent";
import type { Attestation } from "@/domain/attestation";
import type { Envelope } from "@/domain/envelope";
import type { Hire } from "@/domain/hire";
import { AGENT_KINDS } from "@/domain/kind";
import type { Heat } from "@/domain/trust";
import { tokenIdOf } from "@/domain/agent-id";
import { WalletBar } from "@/presentation/wallet-bar";
import { useKilnTx } from "@/presentation/use-kiln-tx";

function pancakeLine(agent: ListedAgent["agent"]): string {
  if (agent.kind !== "yield") return "";
  if (agent.pancakeAprBps === null && agent.pancakeTvlUsd === null) {
    return "Pancake metric: unknown (public API empty — not invented)";
  }
  const apr =
    agent.pancakeAprBps !== null
      ? `${(agent.pancakeAprBps / 100).toFixed(2)}% APR`
      : "APR unknown";
  const tvl =
    agent.pancakeTvlUsd !== null
      ? `TVL $${Math.round(agent.pancakeTvlUsd).toLocaleString()}`
      : "";
  return `Cake pool ${[apr, tvl].filter(Boolean).join(" · ")}`;
}

function heatClass(heat: Heat): string {
  if (heat === "high") return "text-heat";
  if (heat === "medium") return "text-amber";
  return "text-ok";
}

const CHIPS: Array<{ id: AgentKind | "all"; label: string }> = [
  { id: "all", label: "All" },
  ...AGENT_KINDS.map((id) => ({ id, label: id })),
];

export function BayConsole() {
  const kiln = useKilnTx();
  const [page, setPage] = useState<ListAgentsResult | null>(null);
  const [hideHighHeat, setHideHighHeat] = useState(false);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [category, setCategory] = useState<AgentKind | "all">("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [envelope, setEnvelope] = useState<Envelope>({
    maxUsdt: 50,
    hours: 6,
    revoked: false,
    onchainId: null,
  });
  const [firing, setFiring] = useState(false);
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [hire, setHire] = useState<Hire | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 280);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoadError(null);
    const params = new URLSearchParams({
      offset: String(offset),
      limit: "25",
      hideHighHeat: hideHighHeat ? "1" : "0",
      q: qDebounced,
      category,
    });
    const res = await fetch(`/api/agents?${params.toString()}`);
    if (!res.ok) {
      setLoadError("Bay log could not read the catalog.");
      return;
    }
    const data = (await res.json()) as ListAgentsResult;
    setPage(data);
    setSelectedId((current) => {
      if (current && data.items.some((row) => row.agent.id === current)) {
        return current;
      }
      return data.items[0]?.agent.id ?? "";
    });
  }, [offset, hideHighHeat, qDebounced, category]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected: ListedAgent | undefined = page?.items.find(
    (row) => row.agent.id === selectedId,
  );
  const compared = useMemo(
    () => (page?.items ?? []).filter((row) => compareIds.includes(row.agent.id)),
    [page, compareIds],
  );
  const canHire =
    Boolean(selected) &&
    (Boolean(attestation) || skipped) &&
    !envelope.revoked &&
    envelope.maxUsdt > 0 &&
    kiln.isConnected;

  function resetDeck() {
    setAttestation(null);
    setSkipped(false);
    setHire(null);
    setError(null);
  }

  async function onFire() {
    if (!selected) return;
    setError(null);
    setHire(null);
    setFiring(true);
    setAttestation(null);
    setSkipped(false);
    try {
      const res = await fetch("/api/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selected.agent.id }),
      });
      if (!res.ok) throw new Error("sample failed");
      const result = (await res.json()) as Attestation;
      let txHash: string | null = null;
      if (kiln.isConnected && kiln.contractsReady) {
        txHash = await kiln.attest(
          tokenIdOf(selected.agent),
          result.resultHash as `0x${string}`,
        );
      }
      setAttestation({ ...result, txHash });
    } catch {
      setError("Kiln fault. Sample-run failed — treat as hostile.");
    } finally {
      setFiring(false);
    }
  }

  async function onSkip() {
    if (!selected) return;
    await fetch("/api/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: selected.agent.id, skip: true }),
    });
    setSkipped(true);
    setError(null);
  }

  async function onHire() {
    if (!selected) return;
    setError(null);
    try {
      const first = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selected.agent.id,
          maxUsdt: envelope.maxUsdt,
          hours: envelope.hours,
          attested: Boolean(attestation),
          skipped,
        }),
      });
      if (first.status !== 402 && !first.ok) {
        const fail = (await first.json()) as { error?: string };
        throw new Error(fail.error ?? "Hire blocked.");
      }

      let envelopeTx = attestation?.txHash ?? "";
      let envelopeId = envelope.onchainId ? String(envelope.onchainId) : "";
      if (kiln.contractsReady) {
        const opened = await kiln.openEnvelope(
          tokenIdOf(selected.agent),
          envelope.maxUsdt,
          envelope.hours,
        );
        envelopeTx = opened.hash;
        envelopeId = opened.envelopeId ?? envelopeId;
        setEnvelope((prev) => ({
          ...prev,
          onchainId: opened.envelopeId ? Number(opened.envelopeId) : prev.onchainId,
        }));
      } else if (!envelopeTx) {
        throw new Error("Connect wallet, deploy KilnEnvelope, then hire.");
      }

      const paid = await fetch("/api/hire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": JSON.stringify({
            envelopeTx,
            envelopeId,
            hirer: kiln.address,
          }),
        },
        body: JSON.stringify({
          agentId: selected.agent.id,
          maxUsdt: envelope.maxUsdt,
          hours: envelope.hours,
          attested: Boolean(attestation),
          skipped,
        }),
      });
      if (!paid.ok) {
        const fail = (await paid.json()) as { error?: string };
        throw new Error(fail.error ?? "Hire blocked after 402.");
      }
      setHire((await paid.json()) as Hire);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hire blocked.");
    }
  }

  async function onRevoke() {
    setEnvelope((prev) => ({ ...prev, revoked: true }));
    if (envelope.onchainId && kiln.contractsReady) {
      try {
        await kiln.revoke(BigInt(envelope.onchainId));
      } catch {
        setError("On-chain revoke failed; local envelope still revoked.");
      }
    }
  }

  const total = page?.totalOnChain ?? 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="relative z-50 shrink-0 flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <p className="font-mono text-[11px] font-medium tracking-[0.28em] text-amber uppercase">
            KILN · BSC AGENT BAY
          </p>
          <h1 className="mt-1 font-mono text-3xl font-semibold tracking-tight text-ink">
            Fire the agent. Then hire it.
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <WalletBar />
          <a href="/advantage" className="font-mono text-[10px] uppercase text-ok underline">
            TermiX advantage
          </a>
          <p className="max-w-md text-right font-mono text-[11px] leading-5 text-ok">
            {page?.warning ?? "Loading catalog…"} Pages of 25. Mint ≠ honest.
          </p>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 overflow-hidden max-lg:grid-rows-[minmax(0,42vh)_minmax(0,1fr)] lg:grid-cols-[minmax(300px,40%)_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-b border-line lg:border-r lg:border-b-0">
          <div className="shrink-0 flex flex-col gap-2 border-b border-line px-5 py-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-xs tracking-[0.18em] text-ink uppercase">
                Bay log
              </h2>
              <span className="font-mono text-[11px] text-ok">
                {page?.feed ?? "…"} · {page?.items.length ?? 0} / {total}
              </span>
            </div>
            {page?.feed === "synthetic" ? (
              <p className="font-mono text-[10px] text-heat">SYNTHETIC — not the live 8004scan index.</p>
            ) : null}
            <input
              value={q}
              onChange={(e) => {
                setOffset(0);
                setQ(e.target.value);
              }}
              placeholder="Search q (yield, grid, wallet…)"
              className="border border-line bg-bg px-2 py-1.5 font-mono text-[11px] text-ink"
            />
            <div className="flex flex-wrap gap-1">
              {CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setOffset(0);
                    setCategory(chip.id);
                  }}
                  className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${
                    category === chip.id
                      ? "border-amber bg-amber text-bg"
                      : "border-line text-ink/80"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 font-mono text-[11px] text-ink/80">
              <input
                type="checkbox"
                checked={hideHighHeat}
                onChange={(e) => {
                  setOffset(0);
                  setHideHighHeat(e.target.checked);
                }}
              />
              Hide high-heat
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="border border-line px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-40"
                disabled={offset <= 0}
                onClick={() => setOffset((n) => Math.max(0, n - 25))}
              >
                Prev
              </button>
              <button
                type="button"
                className="border border-line px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-40"
                disabled={offset + 25 >= total}
                onClick={() => setOffset((n) => n + 25)}
              >
                Next
              </button>
            </div>
            {loadError ? (
              <p className="font-mono text-[11px] text-heat">{loadError}</p>
            ) : null}
          </div>
          {compared.length > 0 ? (
            <div className="shrink-0 border-b border-line px-5 py-3">
              <p className="font-mono text-[10px] tracking-[0.16em] text-amber uppercase">
                Compare ({compared.length})
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {compared.map((row) => (
                  <div key={row.agent.id} className="border border-line px-2 py-2 font-mono text-[10px]">
                    <p className="truncate text-ink">{row.agent.handle}</p>
                    <p className={heatClass(row.trust.heat)}>
                      {row.trust.heat} · {row.agent.kind} · {row.agent.pulse}
                    </p>
                    <p className="text-ok">
                      fb {row.agent.totalFeedbacks}
                      {row.agent.averageScore !== null ? ` · avg ${row.agent.averageScore}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {(page?.items ?? []).map((row) => {
              const active = row.agent.id === selectedId;
              const inCompare = compareIds.includes(row.agent.id);
              return (
                <li key={row.agent.id} className="border-b border-line">
                  <div
                    className={`flex w-full items-start gap-3 px-5 py-3.5 ${
                      active ? "bg-panel" : "hover:bg-panel/60"
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 font-mono text-[10px] text-ok"
                      onClick={() =>
                        setCompareIds((ids) => {
                          if (ids.includes(row.agent.id)) {
                            return ids.filter((id) => id !== row.agent.id);
                          }
                          return ids.length >= 3 ? ids : [...ids, row.agent.id];
                        })
                      }
                    >
                      {inCompare ? "●" : "○"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(row.agent.id);
                        resetDeck();
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center justify-between gap-2 font-mono text-xs">
                        <span className="truncate text-ink">{row.agent.handle}</span>
                        <span className={`shrink-0 text-[10px] uppercase ${heatClass(row.trust.heat)}`}>
                          {row.trust.heat}
                        </span>
                      </span>
                      <span className="mt-1 block font-sans text-[13px] leading-5 text-ink/80">
                        {row.agent.mandate}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] text-ok">
                        #{row.agent.agentId} · {row.agent.pulse} · {row.agent.kind}
                        {row.agent.kind === "yield" ? ` · ${pancakeLine(row.agent)}` : ""}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-panel/40">
          {!selected ? (
            <p className="p-8 font-mono text-sm">No agent on the deck.</p>
          ) : (
            <>
              <div className="border-b border-line px-6 py-5">
                <h2 className="font-mono text-xl text-ink">{selected.agent.handle}</h2>
                <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-ink/85">
                  {selected.agent.mandate}
                </p>
                <p className={`mt-3 font-mono text-[11px] ${heatClass(selected.trust.heat)}`}>
                  HEAT {selected.trust.heat.toUpperCase()} — {selected.trust.summary}
                </p>
                <ul className="mt-2 font-mono text-[10px] text-ink/70">
                  {selected.trust.flags.map((flag) => (
                    <li key={flag}>{flag.replaceAll("_", " ")}</li>
                  ))}
                </ul>
                <dl className="mt-4 grid gap-3 font-mono text-[11px] sm:grid-cols-2">
                  <div>
                    <dt className="text-ok">ERC-8004</dt>
                    <dd className="mt-1 break-all text-ink">{selected.agent.erc8004}</dd>
                  </div>
                  <div>
                    <dt className="text-ok">Owner</dt>
                    <dd className="mt-1 break-all text-ink">{selected.agent.owner}</dd>
                  </div>
                  <div>
                    <dt className="text-ok">Feedback</dt>
                    <dd className="mt-1 text-ink">
                      {selected.agent.totalFeedbacks}
                      {selected.agent.averageScore !== null
                        ? ` · avg ${selected.agent.averageScore}`
                        : " · no score"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ok">x402 on card</dt>
                    <dd className="mt-1 text-ink">
                      {selected.agent.x402Supported ? "yes" : "no"}
                    </dd>
                  </div>
                  {selected.agent.kind === "yield" ? (
                    <div className="sm:col-span-2">
                      <dt className="text-ok">Pancake metric</dt>
                      <dd className="mt-1 text-amber">{pancakeLine(selected.agent)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="border-b border-line px-6 py-5">
                <h3 className="font-mono text-xs tracking-[0.18em] uppercase">Sample kiln</h3>
                <p className="mt-2 font-sans text-sm leading-6 text-ink/80">
                  A mint on BSC is not a background check. Hire stays cold until this bar
                  slams attested — or you skip on the record. Wallet writes KilnAttestation
                  when the contract address is set.
                </p>
                <div className="mt-4 h-3 w-full overflow-hidden border border-line bg-bg">
                  {firing || attestation ? (
                    <div
                      key={attestation?.resultHash ?? "firing"}
                      className={`h-full ${firing ? "kiln-heat" : "w-full bg-ok"}`}
                    />
                  ) : (
                    <div className="h-full w-0 bg-heat" />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onFire()}
                    disabled={firing}
                    className="border border-amber bg-amber px-4 py-2 font-mono text-xs font-semibold tracking-wide text-bg uppercase disabled:opacity-40"
                  >
                    {firing ? "Firing…" : "Fire sample"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onSkip()}
                    className="border border-heat px-4 py-2 font-mono text-xs tracking-wide text-heat uppercase"
                  >
                    Skip (logged)
                  </button>
                </div>
                {attestation ? (
                  <p className="mt-3 font-mono text-[11px] leading-5 text-ok">
                    ATTESTED · hash {attestation.resultHash}
                    <br />
                    {attestation.txHash
                      ? `TX ${attestation.txHash}`
                      : kiln.contractsReady
                        ? "Connect wallet to write the hash on chain."
                        : "Hash ready. Set NEXT_PUBLIC_KILN_ATTESTATION after forge deploy."}
                  </p>
                ) : null}
                {skipped && !attestation ? (
                  <p className="mt-3 font-mono text-[11px] text-heat">
                    SKIP ON RECORD — hire allowed, you accepted extra heat.
                  </p>
                ) : null}
              </div>

              <div className="px-6 py-5">
                <h3 className="font-mono text-xs tracking-[0.18em] uppercase">Spend envelope</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="font-mono text-[11px] text-ok">
                    Max USDT
                    <input
                      type="number"
                      min={1}
                      value={envelope.maxUsdt}
                      onChange={(e) =>
                        setEnvelope((prev) => ({
                          ...prev,
                          maxUsdt: Number(e.target.value),
                          revoked: false,
                        }))
                      }
                      className="mt-1 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
                    />
                  </label>
                  <label className="font-mono text-[11px] text-ok">
                    Hours
                    <input
                      type="number"
                      min={1}
                      value={envelope.hours}
                      onChange={(e) =>
                        setEnvelope((prev) => ({
                          ...prev,
                          hours: Number(e.target.value),
                          revoked: false,
                        }))
                      }
                      className="mt-1 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onRevoke()}
                    className="border border-heat px-4 py-2 font-mono text-xs tracking-wide text-heat uppercase"
                  >
                    Revoke
                  </button>
                  <button
                    type="button"
                    onClick={() => void onHire()}
                    disabled={!canHire || kiln.isPending}
                    className="border border-ok bg-ok px-4 py-2 font-mono text-xs font-semibold tracking-wide text-bg uppercase disabled:opacity-35"
                  >
                    Hire via x402
                  </button>
                </div>
                <p className="mt-3 font-mono text-[10px] text-ink/60">
                  Facilitator = Kiln until B402_API_KEY is set. Hire is locked while kiln_untested
                  unless you skip. Connect MetaMask on BSC testnet (97).
                </p>
                {envelope.revoked ? (
                  <p className="mt-3 font-mono text-[11px] text-heat">
                    Envelope revoked. Agent cannot spend.
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-3 font-mono text-[11px] text-heat">{error}</p>
                ) : null}
                {hire ? (
                  <p className="mt-3 font-mono text-[11px] leading-5 text-ok">
                    HIRED · cap {hire.maxUsdt} USDT / {hire.hours}h · {hire.facilitator}
                    <br />
                    {hire.txHash ? `TX ${hire.txHash}` : `RECEIPT ${hire.simulatedTx}`}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
