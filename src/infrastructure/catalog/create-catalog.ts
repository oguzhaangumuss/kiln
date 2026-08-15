import type { AgentCatalogPort, CatalogPageRequest, RawPage } from "@/application/ports/agent-catalog-port";
import { Erc8004RpcCatalog } from "@/infrastructure/catalog/erc8004-rpc-catalog";
import { ScanCatalog } from "@/infrastructure/catalog/scan-catalog";
import { SyntheticCatalog } from "@/infrastructure/catalog/synthetic-catalog";

class FallbackCatalog implements AgentCatalogPort {
  constructor(private readonly ports: AgentCatalogPort[]) {}

  async page(request: CatalogPageRequest): Promise<RawPage> {
    let last: unknown;
    for (const port of this.ports) {
      try {
        return await port.page(request);
      } catch (err) {
        last = err;
      }
    }
    throw last instanceof Error ? last : new Error("SCAN_FAIL");
  }
}

export function createCatalog(): AgentCatalogPort {
  const rpc = process.env.BSC_RPC_URL?.trim() || "https://bsc-dataseed.binance.org";
  return new FallbackCatalog([
    new ScanCatalog(),
    new Erc8004RpcCatalog(rpc),
    new SyntheticCatalog(),
  ]);
}
