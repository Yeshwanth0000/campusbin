import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const SUPABASE_ORIGIN = "https://clpfcygjtkjeafvscdwb.supabase.co";
const SUPABASE_WS_ORIGIN = "wss://clpfcygjtkjeafvscdwb.supabase.co";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  // React's dev-mode debugging (stack-trace reconstruction) uses eval(),
  // which it never does in production — relax only for local development
  // so this doesn't cost real production script-src strictness.
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `'self' 'nonce-${nonce}' 'strict-dynamic'`;
  const csp = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Static metadata files must bypass the auth guard. The manifest was
    // being 307'd to /login, so the browser fetched HTML where it expected
    // JSON and the install prompt never became available — the icons it
    // references were fine, since .png already sat behind this same
    // exclusion. robots/sitemap are listed for the same reason.
    //
    // icon/apple-icon are the dynamic favicon routes (icon.tsx, apple-icon.tsx)
    // — they have no file extension in their URL, so they didn't match the
    // .png/.svg exclusion above and were 307'd to /login same as the manifest
    // was. Google's crawler (and every logged-out browser tab) hit that
    // redirect instead of the real icon, which is why search results showed
    // a fallback icon instead of the CB logo.
    //
    // .well-known must stay unauthenticated too — that's where Android's
    // Digital Asset Links file (assetlinks.json) lives, and Google's
    // unauthenticated verifier fetches it directly to confirm the Play
    // Store app is allowed to open campusbin.in links without browser chrome.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|opengraph-image|robots.txt|sitemap.xml|icon|apple-icon|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
