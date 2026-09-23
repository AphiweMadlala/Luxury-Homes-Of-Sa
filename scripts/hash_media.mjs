// Hash every cached frame: sha256 (exact dupes) + 64-bit dHash (visual dupes),
// plus dimensions, byte size and mean luminance/saturation (used to spot
// promotional graphics, black frames and low-res thumbnails).
// Output: data/raw/media-hashes.json
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const MEDIA = "data/raw/media";
const out = {};

async function dhash(file) {
  const px = await sharp(file).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}

const dirs = readdirSync(MEDIA);
for (const sc of dirs) {
  for (const f of readdirSync(join(MEDIA, sc)).sort()) {
    const file = join(MEDIA, sc, f);
    const buf = readFileSync(file);
    const rec = { bytes: statSync(file).size, sha256: createHash("sha256").update(buf).digest("hex") };
    try {
      const img = sharp(buf);
      const meta = await img.metadata();
      const stats = await img.stats();
      rec.width = meta.width;
      rec.height = meta.height;
      rec.format = meta.format;
      rec.mean = Math.round(stats.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3);
      rec.entropy = Number(stats.entropy.toFixed(2));
      rec.dhash = await dhash(buf);
    } catch (e) {
      rec.error = String(e.message || e);
    }
    out[`${sc}/${f}`] = rec;
  }
}
writeFileSync("data/raw/media-hashes.json", JSON.stringify(out, null, 1));
console.log(`hashed ${Object.keys(out).length} frames`);
