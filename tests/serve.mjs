// Minimal static server for tests: dist/ mounted at BASE_PATH, as on GitHub Pages (404.html for misses).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { readFileSync } from "node:fs";

const BASE = JSON.parse(readFileSync("site.config.json", "utf8")).BASE_PATH;
const PORT = +(process.env.PORT || 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".mp4": "video/mp4", ".txt": "text/plain" };

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!url.startsWith(BASE)) { res.writeHead(302, { location: BASE }); return res.end(); }
  let file = join("dist", normalize(url.slice(BASE.length)));
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); } catch {}
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": TYPES[".html"] });
    res.end(await readFile("dist/404.html"));
  }
}).listen(PORT, () => console.log(`serving dist/ at http://localhost:${PORT}${BASE}`));
