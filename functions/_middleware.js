const TARGET = "https://ts.idicorp.ir";

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/ws/")) return next();

  const upstream = new Request(TARGET + url.pathname + url.search, request);
  upstream.headers.set("Origin", TARGET);

  const res = await fetch(upstream);
  if (res.status === 101) return res; // WebSocket upgrade

  const out = new Response(res.body, res);
  const cookies = res.headers.getSetCookie();
  if (cookies.length) {
    out.headers.delete("Set-Cookie");
    for (const c of cookies) out.headers.append("Set-Cookie", c.replace(/;\s*Domain=[^;]*/i, ""));
  }
  return out;
}