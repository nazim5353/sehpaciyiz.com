import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { networkInterfaces } from "node:os";
const COOKIE = "sehpa_admin";
const TTL = 8 * 60 * 60;
function sign(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Güvenli oturum anahtarı tanımlanmalı.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function createSession() {
  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      expires: Math.floor(Date.now() / 1000) + TTL,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function verifySession(token?: string) {
  if (!token) return false;
  try {
    const [payload, signature, extra] = token.split(".");
    if (extra || !signature || !safeEqual(signature, sign(payload)))
      return false;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    return (
      value.role === "admin" &&
      Number.isInteger(value.expires) &&
      value.expires > Date.now() / 1000
    );
  } catch {
    return false;
  }
}
export async function isAdmin() {
  const { currentOperator } = await import("./operations/identity");
  return (await currentOperator())?.role === "OWNER";
}
export async function setSession() {
  (await cookies()).set(COOKIE, createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
  });
}
export async function endSession() {
  (await cookies()).delete(COOKIE);
}
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  // Next's dev server normalizes request.url to localhost even for 127.0.0.1.
  // Recover only a loopback Host with the same port, never an arbitrary proxy host.
  const host = request.headers.get("host");
  if (
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    host
  ) {
    try {
      const candidate = new URL(`${url.protocol}//${host}`);
      if (
        [
          "localhost",
          "127.0.0.1",
          "[::1]",
          ...Object.values(networkInterfaces())
            .flatMap((values) => values ?? [])
            .filter((value) => !value.internal)
            .map((value) => value.address),
        ].includes(candidate.hostname) &&
        candidate.port === url.port
      )
        return candidate.origin;
    } catch {}
  }
  return url.origin;
}
export function assertOrigin(request: Request) {
  if (request.headers.get("origin") !== requestOrigin(request))
    throw new Error("İstek kaynağı doğrulanamadı.");
}
export function isLocalPreview(request: Request) {
  const host = new URL(request.url).hostname;
  let actualHost = host;
  try {
    if (request.headers.get("host"))
      actualHost = new URL(`http://${request.headers.get("host")}`).hostname;
  } catch {
    return false;
  }
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.LOCAL_PREVIEW === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(host) &&
    ["localhost", "127.0.0.1", "[::1]"].includes(actualHost)
  );
}
