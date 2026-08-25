import type { Request } from 'express';

const IPV4_MAPPED_IPV6 = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const IPV6_LOCALHOST = /^::1$/i;

/**
 * Pick the best client IP from a request:
 *   1. `X-Forwarded-For` (first hop) — trusted when running behind a proxy/LB.
 *   2. `X-Real-IP` — common Nginx/Cloudflare header.
 *   3. `req.socket.remoteAddress` — direct connection.
 *
 * Normalises IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`) to plain IPv4
 * so we don't store `::1` for localhost connections.
 */
export function normalizeClientIp(req: Request, trustedProxy = false): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  if (trustedProxy && typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0]?.trim();
    if (first) return normalise(first);
  }

  const xRealIp = req.headers['x-real-ip'];
  if (trustedProxy && typeof xRealIp === 'string' && xRealIp.trim().length > 0) {
    return normalise(xRealIp.trim());
  }

  const remote = req.socket?.remoteAddress ?? undefined;
  return remote ? normalise(remote) : undefined;
}

function normalise(ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed) return trimmed;

  const mapped = trimmed.match(IPV4_MAPPED_IPV6);
  if (mapped) return mapped[1];

  if (IPV6_LOCALHOST.test(trimmed)) return '127.0.0.1';

  return trimmed;
}