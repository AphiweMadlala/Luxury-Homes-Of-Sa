// Usage: node scripts/contact_sheet.mjs out.jpg SC1 SC2 ... [--n 6]
// One row per post: the first N frames, 240px wide, labelled by shortcode.
import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const out = args.shift();
let n = 6;
const ni = args.indexOf("--n");
if (ni >= 0) { n = Number(args[ni + 1]); args.splice(ni, 2); }
const W = 240, H = 160, LABEL = 110;
const rows = args.filter((sc) => existsSync(`data/raw/media/${sc}`));
const comps = [];
for (const [r, sc] of rows.entries()) {
  const files = readdirSync(`data/raw/media/${sc}`).sort().slice(0, n);
  comps.push({ input: Buffer.from(`<svg width="${LABEL}" height="${H}"><text x="4" y="${H / 2}" font-size="13" font-family="monospace">${sc}</text></svg>`), left: 0, top: r * H });
  for (const [c, f] of files.entries()) {
    comps.push({ input: await sharp(`data/raw/media/${sc}/${f}`).resize(W, H, { fit: "cover" }).toBuffer(), left: LABEL + c * W, top: r * H });
  }
}
await sharp({ create: { width: LABEL + n * W, height: rows.length * H, channels: 3, background: "#fff" } })
  .composite(comps).jpeg({ quality: 70 }).toFile(out);
console.log(out);
