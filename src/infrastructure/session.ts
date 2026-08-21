import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { verifyMessage } from "viem";
import { sessionMessage } from "@/domain/session-message";

const SESSION = "kiln_session";
const NONCE = "kiln_nonce";
const WEEK = 60 * 60 * 24 * 7;

function secret(): string {
  return (
    process.env.KILN_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "kiln-dev-session"
  );
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function sealed(value: string): string {
  return `${value}.${sign(value)}`;
}

function unseal(raw: string | undefined): string | null {
  if (!raw) return null;
  const cut = raw.lastIndexOf(".");
  if (cut <= 0) return null;
  const value = raw.slice(0, cut);
  const mac = raw.slice(cut + 1);
  const expected = sign(value);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

export async function issueNonce(): Promise<string> {
  const nonce = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(NONCE, sealed(nonce), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return nonce;
}

export async function readNonce(): Promise<string | null> {
  const jar = await cookies();
  return unseal(jar.get(NONCE)?.value);
}

export async function writeSession(address: string): Promise<void> {
  const wallet = address.toLowerCase();
  const exp = Date.now() + WEEK * 1000;
  const jar = await cookies();
  jar.set(SESSION, sealed(`${wallet}|${exp}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  });
  jar.delete(NONCE);
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION);
  jar.delete(NONCE);
}

export async function readSessionWallet(): Promise<string | null> {
  const jar = await cookies();
  const value = unseal(jar.get(SESSION)?.value);
  if (!value) return null;
  const [wallet, expRaw] = value.split("|");
  const exp = Number(expRaw);
  if (!wallet?.startsWith("0x") || wallet.length !== 42) return null;
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  return wallet;
}

export async function verifyWalletSignature(
  address: string,
  signature: `0x${string}`,
  nonce: string,
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message: sessionMessage(address, nonce),
      signature,
    });
  } catch {
    return false;
  }
}
