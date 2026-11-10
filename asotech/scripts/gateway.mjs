// Front door: sends each request to one of the four Next.js apps.
// 1) By path prefix on the shared address:  /portal -> client portal, /inventory -> inventory app, /staff -> staff app, everything else -> website.
// 2) Optional exact host overrides (GATEWAY_HOSTS) for apps that have their own domain.
// The apps themselves are built with matching base paths (see next.config.mjs), so the URL is passed through unchanged.
import http from "node:http";

export const DEFAULT_PORTS = { website: 3000, inventory: 3001, portal: 3002, pm: 3003 };
const PREFIXES = { "/portal": "portal", "/inventory": "inventory", "/staff": "pm" };

/** Pick an app from the request URL (and, optionally, the Host header). */
export function pickApp(url, hostHeader, overrides = {}) {
  const host = String(hostHeader || "").toLowerCase().split(":")[0];
  if (overrides[host]) return overrides[host];
  const path = String(url || "/").split("?")[0];
  for (const [prefix, app] of Object.entries(PREFIXES)) {
    if (path === prefix || path.startsWith(prefix + "/")) return app;
  }
  return "website";
}

export function createGateway({ ports = DEFAULT_PORTS, overrides = {} } = {}) {
  return http.createServer((req, res) => {
    const app = pickApp(req.url, req.headers.host, overrides);
    const headers = { ...req.headers, "x-forwarded-host": req.headers.host ?? "", "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "https" };
    const up = http.request({ host: "127.0.0.1", port: ports[app], method: req.method, path: req.url, headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    up.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
      res.end("This part of ASOTECH is starting up or unavailable. Please try again in a moment.");
    });
    req.pipe(up);
  });
}
