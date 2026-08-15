export const kilnAttestationAbi = [
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "resultHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "latest",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "resultHash", type: "bytes32" },
      { name: "attester", type: "address" },
      { name: "at", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Attested",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "resultHash", type: "bytes32", indexed: false },
      { name: "attester", type: "address", indexed: true },
    ],
  },
] as const;

export const kilnEnvelopeAbi = [
  {
    type: "function",
    name: "open",
    stateMutability: "payable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "maxUsdt", type: "uint256" },
      { name: "hoursAlive", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "revoke",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isActive",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "sessions",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "hirer", type: "address" },
      { name: "agentId", type: "uint256" },
      { name: "maxUsdt", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "revoked", type: "bool" },
      { name: "spent", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Opened",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "hirer", type: "address", indexed: true },
      { name: "agentId", type: "uint256", indexed: false },
      { name: "maxUsdt", type: "uint256", indexed: false },
      { name: "expiry", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Revoked",
    inputs: [{ name: "id", type: "uint256", indexed: true }],
  },
] as const;
