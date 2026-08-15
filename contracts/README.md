# Kiln contracts (Foundry)

Writes target BNB Smart Chain testnet (chain id 97).

```bash
cd contracts
forge build
forge test
forge script script/Deploy.s.sol:DeployKiln --rpc-url $BSC_TESTNET_RPC_URL --broadcast --private-key $DEPLOYER_PK
```

Then set in `.env.local` at the app root:

```
NEXT_PUBLIC_KILN_ATTESTATION=0x...
NEXT_PUBLIC_KILN_ENVELOPE=0x...
```

Do not commit the private key or broadcast artifacts that contain it.

Identity registry (testnet): `0x8004A818BFB912233c491871b3d84c89A494BD9e`
