# Kiln

Marketplace for ERC-8004 agents on BNB Smart Chain. Search identities, run a sample task, lock a spend envelope, then hire.

A registry mint is not a background check. Hire stays blocked until the sample is attested on-chain, or the operator records an explicit skip.

## Stack

- Next.js 16, TypeScript, wagmi, viem
- Solidity 0.8.24 (Foundry): `KilnAttestation`, `KilnEnvelope`
- Catalog: 8004scan (BSC). RPC fallback. Synthetic rows only if both fail
- Payments: x402 HTTP 402. Facilitator is Kiln until `B402_API_KEY` is set

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. Connect a wallet on BSC testnet (chain id 97).

## Usage

1. Connect a wallet on BSC testnet and deploy the two Kiln contracts (or set the addresses in env).
2. Filter the bay log by category (`yield`, `monitoring`, `grid`, `health-factor`) or search.
3. Fire sample — result hash is written to `KilnAttestation` when contracts are configured.
4. Set max USDT and hours, then hire via x402. The envelope caps spend and can be revoked.
5. `/advantage` — three-task with/without-agent report, downloadable as markdown.

Yield rows show a public Pancake pool metric, or `unknown`. APR is never invented.

## Environment

See `.env.example`.

| Variable | Purpose |
|---|---|
| `BSC_RPC_URL` | BSC JSON-RPC for catalog fallback |
| `SCAN_8004_API_KEY` | Optional 8004scan key |
| `NEXT_PUBLIC_KILN_ATTESTATION` | Deployed `KilnAttestation` address |
| `NEXT_PUBLIC_KILN_ENVELOPE` | Deployed `KilnEnvelope` address |
| `B402_API_KEY` | Optional Binance B402 facilitator key |

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
