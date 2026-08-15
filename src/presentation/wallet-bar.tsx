"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { DeployKilnButton } from "@/presentation/deploy-kiln-button";
import { readKilnContracts } from "@/presentation/kiln-session";

function hasBrowserWallet(): boolean {
  if (typeof window === "undefined") return false;
  const ethereum = window.ethereum as
    | { providers?: unknown[] }
    | undefined;
  return Boolean(ethereum || ethereum?.providers?.length);
}

export function WalletBar() {
  const { address, isConnected, chainId } = useAccount();
  const { mutate: connect, isPending, error, reset } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const wrong = isConnected && chainId !== bscTestnet.id;

  useEffect(() => {
    const sync = () => setReady(Boolean(readKilnContracts()));
    sync();
    window.addEventListener("kiln-contracts", sync);
    return () => window.removeEventListener("kiln-contracts", sync);
  }, []);

  async function onConnect() {
    setHint(null);
    reset();

    if (!hasBrowserWallet()) {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!hasBrowserWallet() && connectors.length <= 1) {
      setHint(
        "No injected wallet on this page. Open the app in Chrome or Brave with MetaMask installed.",
      );
      return;
    }

    const connector =
      connectors.find((c) => c.id !== "injected") ??
      connectors.find((c) => c.id === "injected") ??
      connectors[0];

    if (!connector) {
      setHint("Bağlayıcı yok. Sayfayı Chrome’da yenile.");
      return;
    }

    connect(
      { connector },
      {
        onSuccess: () => {
          if (chainId !== bscTestnet.id) {
            switchChain({ chainId: bscTestnet.id });
          }
        },
        onError: (err) => {
          const message = err.message.toLowerCase();
          if (message.includes("provider not found")) {
            setHint(
              "MetaMask bu sayfaya enjekte olmadı. Chrome’da localhost:3001 kullan; eklenti açık ve kilitli olmasın.",
            );
          }
        },
      },
    );
  }

  return (
    <div className="relative z-50 flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2 font-mono text-[10px] uppercase">
        {isConnected && address ? (
          <>
            <span className={wrong ? "text-heat" : "text-ok"}>
              {wrong ? `chain ${chainId}` : "bsc testnet"} · {address.slice(0, 6)}…
              {address.slice(-4)}
            </span>
            {wrong ? (
              <button
                type="button"
                className="relative z-50 cursor-pointer border border-amber px-2 py-1 text-amber"
                onClick={() => switchChain({ chainId: bscTestnet.id })}
              >
                Switch 97
              </button>
            ) : null}
            <button
              type="button"
              className="relative z-50 cursor-pointer border border-line px-2 py-1"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            className="relative z-50 cursor-pointer border border-amber bg-amber px-3 py-1.5 font-semibold text-bg disabled:cursor-wait disabled:opacity-70"
            onClick={() => void onConnect()}
          >
            {isPending ? "Connecting…" : "Connect wallet"}
          </button>
        )}
      </div>
      {hint || error ? (
        <p className="max-w-xs text-right font-mono text-[9px] normal-case leading-4 text-heat">
          {hint ??
            (error?.message.includes("Provider not found")
              ? "Cüzdan yok: Chrome’da http://localhost:3001 aç, MetaMask açık olsun."
              : error?.message)}
        </p>
      ) : null}
      {ready ? (
        <p className="font-mono text-[9px] text-ok">Kiln contracts ready.</p>
      ) : (
        <DeployKilnButton />
      )}
    </div>
  );
}
