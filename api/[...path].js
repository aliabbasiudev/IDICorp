export const config = { runtime: "edge" };

const TARGET = "https://ts.idicorp.ir";

export default async function handler(request) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("origin", TARGET);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const res = await fetch(TARGET + url.pathname + url.search, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: "half",
    redirect: "manual",
  });

  const out = new Headers(res.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  out.delete("set-cookie");
  for (const c of res.headers.getSetCookie()) {
    out.append("set-cookie", c.replace(/;\s*domain=[^;]*/i, ""));
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}