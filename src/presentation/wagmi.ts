import { http, createConfig, type EIP1193Provider } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

type BrowserWindow = Window & {
  ethereum?: EIP1193Provider & {
    isMetaMask?: boolean;
    providers?: EIP1193Provider[];
  };
};

const announced: EIP1193Provider[] = [];

function listenForWallets() {
  if (typeof window === "undefined") return;
  const win = window as BrowserWindow;
  win.addEventListener("eip6963:announceProvider", ((event: Event) => {
    const detail = (event as CustomEvent<{ provider?: EIP1193Provider }>).detail;
    if (detail?.provider && !announced.includes(detail.provider)) {
      announced.push(detail.provider);
    }
  }) as EventListener);
  win.dispatchEvent(new Event("eip6963:requestProvider"));
}

listenForWallets();

function browserProvider(win?: Window): EIP1193Provider | undefined {
  const ethereum = (win as BrowserWindow | undefined)?.ethereum;
  if (ethereum?.providers?.length) {
    return (
      ethereum.providers.find((p) => "isMetaMask" in p && p.isMetaMask) ??
      ethereum.providers[0]
    );
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
        provider: browserProvider,
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
