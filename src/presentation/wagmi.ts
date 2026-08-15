import { http, createConfig } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import type { EIP1193Provider } from "viem";

type Ethereum = EIP1193Provider & {
  isMetaMask?: boolean;
  providers?: Ethereum[];
};

type WalletWindow = {
  ethereum?: Ethereum;
  addEventListener: Window["addEventListener"];
  dispatchEvent: Window["dispatchEvent"];
};

const announced: EIP1193Provider[] = [];

function asWalletWindow(win: unknown): WalletWindow | undefined {
  if (!win || typeof win !== "object") return undefined;
  return win as WalletWindow;
}

function listenForWallets() {
  if (typeof window === "undefined") return;
  const win = asWalletWindow(window);
  if (!win) return;
  win.addEventListener("eip6963:announceProvider", ((event: Event) => {
    const detail = (event as CustomEvent<{ provider?: EIP1193Provider }>).detail;
    if (detail?.provider && !announced.includes(detail.provider)) {
      announced.push(detail.provider);
    }
  }) as EventListener);
  win.dispatchEvent(new Event("eip6963:requestProvider"));
}

listenForWallets();

function browserProvider(win?: unknown): EIP1193Provider | undefined {
  const ethereum = asWalletWindow(win)?.ethereum;
  if (ethereum?.providers?.length) {
    return ethereum.providers.find((p) => p.isMetaMask) ?? ethereum.providers[0];
  }
  return ethereum ?? announced[0];
}

export const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  connectors: [
    injected({
      shimDisconnect: true,
      unstable_shimAsyncInject: 3_000,
      target: {
        id: "injected",
        name: "Browser Wallet",
        provider: browserProvider as never,
      },
    }),
  ],
  transports: {
    [bscTestnet.id]: http(),
    [bsc.id]: http(),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});
