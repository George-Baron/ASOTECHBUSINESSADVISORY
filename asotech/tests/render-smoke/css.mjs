import { compile } from "/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const html = ["dashboard.html","login.html"].map(f=>readFileSync(f,"utf8")).join(" ");
const cands = new Set(); for (const m of html.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach(c=>c&&cands.add(c));
const theme = `@theme { --color-navy:#0B2F4F; --color-navy-100:#D6E2EE; --color-brand-orange:#F28C1E; --color-brand-orange-dark:#D97706; --color-cloud:#F3F6FA; --color-slate2:#5B6B7B; --color-ok:#1E9E5A; --color-warn:#C2640A; --color-bad:#C0392B; --font-sans: Inter,"Segoe UI",system-ui,Arial,sans-serif; --shadow-card:0 1px 2px rgba(11,47,79,.06),0 8px 24px rgba(11,47,79,.08); }`;
const base = readFileSync("/opt/npm-tools/node_modules/tailwindcss/index.css","utf8");
const c = await compile(`${base}\n${theme}\nbody{background:#F3F6FA;color:#0B2F4F}`, { loadStylesheet: async (id, b) => { if (id==="tailwindcss") return { path: "index.css", base: b, content: base }; const p = new URL(id.replace(/^tailwindcss\//,"/opt/npm-tools/node_modules/tailwindcss/"), "file:///").pathname; return { path: p, base: b, content: readFileSync(p.endsWith(".css")?p:p+".css","utf8") }; } });
writeFileSync("out.css", c.build([...cands]));
console.log(cands.size, "classes");
