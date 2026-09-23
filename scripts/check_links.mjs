// Static link/asset checker for dist/: every internal href/src/srcset must resolve to a file.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
const cfg = JSON.parse(readFileSync("site.config.json", "utf8"));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const pages = walk("dist").filter((f) => f.endsWith(".html"));
const bad = [], ext = new Set();
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const refs = [...html.matchAll(/(?:href|src|poster)="([^"]+)"/g)].map((m) => m[1])
    .concat([...html.matchAll(/srcset="([^"]+)"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(" ")[0])));
  for (const r of refs) {
    if (/^(mailto|tel):/.test(r)) continue;
    if (/^https?:/.test(r)) { ext.add(r.split("/").slice(0, 3).join("/")); continue; }
    if (r.startsWith("#")) { if (r.length > 1 && !html.includes(`id="${r.slice(1)}"`)) bad.push(`${page}: missing anchor ${r}`); continue; }
    if (!r.startsWith(cfg.BASE_PATH)) { bad.push(`${page}: not base-prefixed ${r}`); continue; }
    let p = "dist/" + r.slice(cfg.BASE_PATH.length).split(/[?#]/)[0];
    if (p.endsWith("/")) p += "index.html";
    checked++;
    if (!existsSync(p)) bad.push(`${page}: broken ${r}`);
  }
}
console.log(`${pages.length} pages, ${checked} internal refs checked, ${bad.length} broken`);
console.log("external hosts:", [...ext].join(", "));
bad.slice(0, 20).forEach((b) => console.log("  " + b));
process.exit(bad.length ? 1 : 0);
