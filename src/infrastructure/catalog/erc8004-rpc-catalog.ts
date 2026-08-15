import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { bsc } from "viem/chains";
import type { Agent } from "@/domain/agent";
import { classifyKind } from "@/domain/kind";
import type { AgentCatalogPort, CatalogPageRequest, RawPage } from "@/application/ports/agent-catalog-port";
import { identityRegistryAbi } from "@/infrastructure/erc8004/abi";
import { BSC_CHAIN_ID, BSC_IDENTITY_REGISTRY } from "@/infrastructure/erc8004/addresses";

type Card = {
  name?: string;
  description?: string;
  active?: boolean;
};

export class Erc8004RpcCatalog implements AgentCatalogPort {
  constructor(private readonly rpcUrl: string) {}

  async page(request: CatalogPageRequest): Promise<RawPage> {
    const client = createPublicClient({
      chain: bsc,
      transport: http(this.rpcUrl),
    });
    const registry = BSC_IDENTITY_REGISTRY as Address;
    const limit = Math.min(Math.max(request.limit, 1), 50);
    const offset = Math.max(request.offset, 0);

    const total = await client.readContract({
      address: registry,
      abi: identityRegistryAbi,
      functionName: "totalSupply",
    });
    const totalOnChain = Number(total);
    const start = Math.min(offset, Math.max(totalOnChain, 0));
    const end = Math.min(start + limit, totalOnChain);
    const agents: Agent[] = [];

    for (let index = start; index < end; index += 1) {
      const agent = await this.readOne(client, registry, index);
      if (agent) agents.push(agent);
    }

    const q = request.q.trim().toLowerCase();
    const filtered = agents.filter((agent) => {
      if (request.category !== "all" && agent.kind !== request.category) return false;
      if (!q) return true;
      const hay = `${agent.handle} ${agent.mandate} ${agent.kind}`.toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    });

    return { agents: filtered, totalOnChain, feed: "bsc-rpc" };
  }

  private async readOne(
    client: PublicClient,
    registry: Address,
    index: number,
  ): Promise<Agent | null> {
    try {
      let tokenId: bigint;
      try {
        tokenId = await client.readContract({
          address: registry,
          abi: identityRegistryAbi,
          functionName: "tokenByIndex",
          args: [BigInt(index)],
        });
      } catch {
        tokenId = BigInt(index + 1);
      }

      const [owner, uri] = await Promise.all([
        client.readContract({
          address: registry,
          abi: identityRegistryAbi,
          functionName: "ownerOf",
          args: [tokenId],
        }),
        client.readContract({
          address: registry,
          abi: identityRegistryAbi,
          functionName: "tokenURI",
          args: [tokenId],
        }),
      ]);

      const card = await this.readCard(uri);
      const handle = card?.name?.slice(0, 48) || `AGENT-${tokenId.toString()}`;
      const mandate = card?.description?.slice(0, 180) || "No readable agent card.";
      const live = card?.active === true;

      return {
        id: tokenId.toString(),
        agentId: tokenId.toString(),
        handle,
        kind: classifyKind(`${handle} ${mandate}`),
        pulse: card ? (live ? "live" : "stale") : "unknown",
        lastActivityBlock: 0,
        mandate,
        erc8004: `${registry}:${tokenId.toString()}`,
        owner,
        agentUri: uri,
        pancakeAprBps: null,
        pancakeTvlUsd: null,
        cardReadable: Boolean(card),
        totalFeedbacks: 0,
        averageScore: null,
        x402Supported: false,
        chainId: BSC_CHAIN_ID,
      };
    } catch {
      return null;
    }
  }

  private async readCard(uri: string): Promise<Card | null> {
    if (!uri) return null;
    try {
      const url = uri.startsWith("ipfs://")
        ? `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`
        : uri;
      if (url.startsWith("data:")) return null;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      return (await res.json()) as Card;
    } catch {
      return null;
    }
  }
}
