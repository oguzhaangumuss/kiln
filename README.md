# Kiln

Marketplace for ERC-8004 agents on BNB Smart Chain. Search by the four first-class categories, read what the agent published, fire a sample catalog check, lock a spend envelope, then hire.

A registry mint is not a background check. Hire stays blocked until the sample is attested on-chain, or the operator records an explicit skip.

Kiln is a hire desk. Sample GETs the advertised A2A/MCP catalog. It does not run the agent’s private jobs or send user funds to the agent wallet.

## Stack

- Next.js 16, TypeScript, wagmi, viem
- Solidity 0.8.24 (Foundry): `KilnAttestation`, `KilnEnvelope`
- Catalog: 8004scan (BSC). RPC fallback. Empty list + retry if both fail — no synthetic agents.
- Payments: x402 HTTP 402. Facilitator is Kiln until `B402_API_KEY` is set

## Four categories (equal depth)

| Chip | Official mandate |
|---|---|
| Rebalancing | Manages LP ranges and resets positions automatically |
| Grid | Places and manages automated grid orders |
| Yield | Routes liquidity to the highest available APR |
| Health factor | Protects lending positions from liquidation |

Each card uses the same briefing: official mandate, published jobs, mismatch if the card disagrees with the catalog, and a public metric or honest `unknown`. Yield and rebalancing show a live PancakeSwap v3 reference pool (APR / tick / price). That pool is not the agent’s vault.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open the live demo: https://kiln-agentmarketplace.vercel.app (or http://localhost:3000). Connect a wallet on BSC testnet (chain id 97).

## 90-second demo (judges)

1. Land on the bay. Four chips: Rebalancing, Grid, Yield, Health factor. Open Yield.
2. Compare up to three rows (pulse, door, feedback, category metric, mismatch).
3. Pick one. Read the category briefing: who benefits, Pancake product, funds-at-risk note.
4. Fire sample. JobTape lists published tools; pass/fail; hash. Mismatch banner if jobs are only ERC-8183.
5. Set max USDT + hours. Hire via x402. Revoke. Open My hires for the door tape.
6. Open `/advantage`. Stamp and download the TermiX markdown (trading + security + yield).

## Usage

1. Connect a wallet on BSC testnet and deploy the two Kiln contracts (or set the addresses in env).
2. Filter by category or search. Unclassified is leftover, not a fifth track.
3. Fire sample — Kiln pings the advertised A2A/MCP URL, prints the job list, then writes the result hash to `KilnAttestation` when contracts are configured.
4. Set max USDT and hours, then hire via x402. The envelope caps spend and can be revoked. User funds are not sent to the agent.
5. Sign the hire book once. **My hires** keeps the lease and door pings after you close the panel.
6. `/advantage` — Agent Advantage Report (time, cost, quality, attached outputs).

## 8004scan Pro (hackathon)

Free Pro-tier for the event: up to 500 req/min, 100k/day.

1. Create an API key in the [8004scan Developer Hub](https://8004scan.io/developers).
2. Submit the Pro-Tier Upgrade Form linked from the hackathon [Resources tab](https://www.bnbchain.org/en/hackathons/smart-money-era?tab=resources).
3. Put the key in `SCAN_8004_API_KEY`. Anonymous traffic still works at a lower cap; keyed 403 falls back to the public index.

## Environment

See `.env.example`.

| Variable | Purpose |
|---|---|
| `BSC_RPC_URL` | BSC JSON-RPC for catalog fallback |
| `SCAN_8004_API_KEY` | Optional 8004scan key |
| `NEXT_PUBLIC_KILN_ATTESTATION` | Deployed `KilnAttestation` address |
| `NEXT_PUBLIC_KILN_ENVELOPE` | Deployed `KilnEnvelope` address |
| `B402_API_KEY` | Optional Binance B402 facilitator key |
| `SUPABASE_URL` | Hire book (leases / heartbeats). Catalog stays on 8004scan |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never expose to the browser |
| `KILN_SESSION_SECRET` | HMAC for the wallet session cookie |
| `CRON_SECRET` | Bearer token for `/api/cron/pulse-leases` |

After a first on-chain deploy, put the two contract addresses in env so every visitor shares the same contracts (browser-local deploy only affects that browser).

## Contracts

```bash
cd contracts
forge build
forge test
```

Identity registry (BSC testnet): `0x8004A818BFB912233c491871b3d84c89A494BD9e`

## License

MIT.
