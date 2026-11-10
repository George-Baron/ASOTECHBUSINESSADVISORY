// Starts all four Next.js apps plus the gateway in ONE process group (for a single hosting service).
// Build first with: npm run build
import { spawn } from "node:child_process";
import { createGateway, DEFAULT_PORTS } from "./gateway.mjs";

const apps = [["website", "apps/website"], ["inventory", "apps/inventory-app"], ["portal", "apps/client-portal"], ["pm", "apps/project-management"]];
const needsServiceKey = new Set(["inventory", "pm"]);
const children = [];

for (const [key, dir] of apps) {
  const env = { ...process.env, PORT: String(DEFAULT_PORTS[key]), NODE_ENV: "production" };
  // The secret service-role key is only handed to the two apps that use it.
  if (!needsServiceKey.has(key)) delete env.SUPABASE_SERVICE_ROLE_KEY;
  const child = spawn("npx", ["next", "start", "-p", String(DEFAULT_PORTS[key])], { cwd: dir, env, stdio: "inherit" });
  child.on("exit", (code) => { console.error(`[asotech] ${key} stopped (code ${code}); exiting so the host restarts everything.`); shutdown(1); });
  children.push(child);
}

let overrides = {};
try { overrides = JSON.parse(process.env.GATEWAY_HOSTS || "{}"); } catch { console.error("[asotech] GATEWAY_HOSTS is not valid JSON; ignoring it."); }
const port = Number(process.env.PORT || 10000);
const server = createGateway({ overrides }).listen(port, "0.0.0.0", () => console.log(`[asotech] gateway listening on ${port}`));

function shutdown(code = 0) { server.close(); for (const c of children) c.kill("SIGTERM"); setTimeout(() => process.exit(code), 500); }
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
