import type { NextRequest } from "next/server";

/**
 * Clerk Frontend API proxy.
 *
 * A Clerk *production* instance will not serve from clerk.accounts.dev — it needs
 * a domain you control. The usual route is a CNAME
 * (clerk.<your-domain> -> frontend-api.clerk.services), but this project is hosted
 * on studyhack-frontend.vercel.app, and DNS records cannot be added to a
 * Vercel-owned apex. Clerk therefore provisioned this instance in PROXY mode:
 *
 *   frontend_api_url = https://studyhack-frontend.vercel.app/__clerk
 *   cname_targets    = [clerk.studyhack-frontend.vercel.app] (required: false)
 *
 * Verified before writing this: that CNAME host resolves to Vercel's IPs but the
 * TLS handshake fails, because nothing is serving Clerk there. Shipping pk_live
 * without this proxy would break sign-in completely.
 *
 * A Route Handler rather than a next.config rewrite doing the whole job: Clerk
 * requires three request headers on every proxied call (Clerk-Proxy-Url,
 * Clerk-Secret-Key, X-Forwarded-For), and a rewrite cannot attach a server-only
 * secret.
 *
 * It lives at /clerk-proxy with a next.config rewrite mapping /__clerk/* onto it,
 * because the App Router treats a folder beginning with an underscore as PRIVATE
 * and excludes it from routing — app/__clerk would simply have 404'd in production.
 * (app/%5F%5Fclerk would also work, but an encoded folder name is a trap for the
 * next person.)
 *
 * The secret is read from the environment on the server and never reaches the
 * client, which is the reason this can be done safely at all.
 *
 * Long term a real custom domain is the better answer — it removes this hop, and
 * this file with it.
 */

/**
 * Clerk's Frontend API origin for proxied traffic.
 *
 * It is clerk.DEV, not clerk.services. The domain record on this instance reports
 * a cname_target of frontend-api.clerk.services, but that host rejects TLS
 * (handshake_failure) because it only answers for hostnames registered with Clerk
 * as custom hostnames. frontend-api.clerk.dev is the documented proxy upstream.
 */
const CLERK_FRONTEND_API = "https://frontend-api.clerk.dev";

/** Hop-by-hop and host-specific headers that must not be forwarded upstream. */
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
  "content-length",
]);

const STRIP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
]);

async function proxy(req: NextRequest): Promise<Response> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const proxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;

  if (!secretKey || !proxyUrl) {
    // Fail loudly rather than forwarding an unauthenticated request that Clerk
    // would reject with a confusing error inside the sign-in widget.
    console.error(
      "Clerk proxy misconfigured: CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PROXY_URL are both required",
    );
    return new Response(JSON.stringify({ error: "clerk proxy misconfigured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const incoming = new URL(req.url);
  // Everything after /__clerk is the Clerk API path.
  const upstreamPath = incoming.pathname.replace(/^\/(?:__clerk|clerk-proxy)/, "");
  const upstream = new URL(`${CLERK_FRONTEND_API}${upstreamPath}${incoming.search}`);

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  // The three headers Clerk requires to accept a proxied request.
  headers.set("Clerk-Proxy-Url", proxyUrl);
  headers.set("Clerk-Secret-Key", secretKey);
  headers.set(
    "X-Forwarded-For",
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
  );

  const method = req.method.toUpperCase();
  const res = await fetch(upstream, {
    method,
    headers,
    // GET/HEAD must not carry a body; anything else streams through unchanged so
    // sign-in form payloads arrive byte-for-byte.
    body: method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer(),
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (STRIP_RESPONSE_HEADERS.has(lower)) return;
    // Rewrite redirects that point back at Clerk's own Frontend API origin —
    // following one would take the browser off the proxy to a host that does not
    // serve this instance.
    if (lower === "location" && value.startsWith(CLERK_FRONTEND_API)) {
      responseHeaders.append(key, value.replace(CLERK_FRONTEND_API, proxyUrl));
      return;
    }
    // Set-Cookie must survive: it carries the Clerk session.
    responseHeaders.append(key, value);
  });

  return new Response(res.body, { status: res.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;

// Cookies and auth state make every response request-specific.
export const dynamic = "force-dynamic";
