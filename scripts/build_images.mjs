// Responsive derivatives for every canonical property.
//   public/images/properties/<slug>/NN-720.webp, NN-1080.webp  (every gallery frame)
//   public/images/properties/<slug>/NN-480.webp, NN-1080.jpg   (hero frame only: cards + fallback/OG)
//   public/media/<slug>.mp4                                     (reel-only properties, played on demand)
// Writes data/media-manifest.json. Skips outputs that already exist (idempotent).
// Source frames are Instagram originals (max 1080px wide), so nothing is upscaled.
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";

const props = JSON.parse(readFileSync("data/properties.json", "utf8"));
const curation = JSON.parse(readFileSync("data/curation.json", "utf8"));
const mediaOverrides = curation.media || {};
const OUT = "public/images/properties";
const manifest = {};

async function derive(src, dest, width, fmt) {
  if (existsSync(dest)) return;
  let img = sharp(src);
  const meta = await img.metadata();
  if (width < meta.width) img = img.resize(width);
  img = fmt === "jpg" ? img.jpeg({ quality: 80, mozjpeg: true }) : img.webp({ quality: width > 800 ? 76 : 74 });
  await img.toFile(dest);
}

for (const p of props) {
  const ov = mediaOverrides[p.slug] || {};
  const dir = `data/raw/media/${p.mediaSourcePost}`;
  const frames = readdirSync(dir).sort().filter((f) => !(ov.exclude || []).includes(f));
  const heroFile = ov.hero || frames[0];
  const order = [heroFile, ...frames.filter((f) => f !== heroFile)];
  mkdirSync(`${OUT}/${p.slug}`, { recursive: true });
  const images = [];
  for (const [i, f] of order.entries()) {
    const src = `${dir}/${f}`;
    const n = String(i + 1).padStart(2, "0");
    const meta = await sharp(src).metadata();
    const base = `${OUT}/${p.slug}/${n}`;
    await derive(src, `${base}-720.webp`, 720, "webp");
    await derive(src, `${base}-1080.webp`, 1080, "webp");
    if (i === 0) {
      await derive(src, `${base}-480.webp`, 480, "webp");
      await derive(src, `${base}-1080.jpg`, 1080, "jpg");
    }
    images.push({ n, source: `${p.mediaSourcePost}/${f}`, width: meta.width, height: meta.height });
  }
  let video = null;
  const reel = `data/raw/video/${p.mediaSourcePost}.mp4`;
  if (existsSync(reel)) {
    mkdirSync("public/media", { recursive: true });
    if (!existsSync(`public/media/${p.slug}.mp4`)) copyFileSync(reel, `public/media/${p.slug}.mp4`);
    video = `media/${p.slug}.mp4`;
  }
  manifest[p.slug] = { images, video, posterOnly: Boolean(ov.posterOnly), note: ov.note || null };
}
writeFileSync("data/media-manifest.json", JSON.stringify(manifest, null, 1));
console.log(`${Object.keys(manifest).length} properties, ${Object.values(manifest).reduce((a, m) => a + m.images.length, 0)} frames`);
