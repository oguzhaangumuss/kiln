export function sessionMessage(address: string, nonce: string): string {
  return [
    "Kiln hire book",
    "",
    "Sign this once so Kiln can store your leases on this wallet.",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}
