// Build-time data validation. Exits non-zero on any error; prints warnings for
// legitimately missing optional data. Never fills anything in.
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const props = read("data/properties.json");
const agents = read("data/agents.json");
const media = read("data/media-manifest.json");
const cfg = read("site.config.json");
const errors = [], warnings = [];
const err = (s, m) => errors.push(`${s}: ${m}`);
const warn = (s, m) => warnings.push(`${s}: ${m}`);

// config
if (!/^\/.*\/$|^\/$/.test(cfg.BASE_PATH)) err("config", `BASE_PATH must start and end with "/" (got ${cfg.BASE_PATH})`);
if (!/^https?:\/\//.test(cfg.SITE_URL)) err("config", "SITE_URL must be absolute");
if (typeof cfg.PROPOSAL_MODE !== "boolean") err("config", "PROPOSAL_MODE must be boolean");
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE = /^\+27 \d{2} \d{3} \d{4}$/;
if (!EMAIL.test(cfg.business.email)) err("config", "business email malformed");

// agents
const agentIds = new Set();
for (const a of agents) {
  if (agentIds.has(a.id)) err(a.id, "duplicate agent id");
  agentIds.add(a.id);
  if (a.email && !EMAIL.test(a.email)) err(a.id, `malformed email ${a.email}`);
  if (a.phone && !PHONE.test(a.phone)) err(a.id, `malformed phone ${a.phone} (expected +27 xx xxx xxxx)`);
  if (a.whatsapp) err(a.id, "WhatsApp set but no verified WhatsApp numbers exist in sources");
  if (!a.sourceUrls?.length) err(a.id, "agent has no source URLs");
  if (!a.instagram?.length && !a.phone && !a.email) err(a.id, "agent has no contact channel");
}

// properties
const ids = new Set(), slugs = new Set();
const STATUS = new Set(["for-sale", "under-offer", "sold", "withdrawn", "unknown"]);
for (const p of props) {
  const s = p.slug;
  if (ids.has(p.id)) err(s, "duplicate id"); ids.add(p.id);
  if (slugs.has(s)) err(s, "duplicate slug"); slugs.add(s);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) err(s, "slug not kebab-case");
  if (!STATUS.has(p.status)) err(s, `invalid status ${p.status}`);
  if (!p.statusBasis) err(s, "status has no stated basis");
  if (p.priceZAR != null && (!Number.isFinite(p.priceZAR) || p.priceZAR < 100000 || p.priceZAR > 1e9)) err(s, `implausible sale price ${p.priceZAR}`);
  if (p.priceZAR == null && !p.priceOnApplication) err(s, "no price and not flagged price-on-application");
  for (const [k, lo, hi] of [["bedrooms", 0, 30], ["bathrooms", 0, 30], ["garages", 0, 30], ["parking", 0, 40]]) {
    const v = p[k];
    if (v != null && (!Number.isFinite(v) || v < lo || v > hi || (v * 2) % 1 !== 0)) err(s, `impossible ${k} ${v}`);
  }
  if (p.bathrooms != null && p.bedrooms != null && p.bathrooms > p.bedrooms * 2 + 2) warn(s, `unusual bath/bed ratio ${p.bathrooms}/${p.bedrooms}`);
  for (const k of ["floorSizeM2", "erfSizeM2"]) if (p[k] != null && (p[k] < 20 || p[k] > 1e6)) err(s, `implausible ${k} ${p[k]}`);
  for (const k of ["ratesZAR", "leviesZAR"]) if (p[k] != null && (p[k] < 50 || p[k] > 200000)) err(s, `implausible ${k} ${p[k]}`);
  if (!p.sourceUrls?.length || !p.instagramPosts?.length) err(s, "missing source URLs");
  if (p.agent && !agentIds.has(p.agent)) err(s, `unknown agent reference ${p.agent}`);
  if (p.status === "for-sale" && !p.provenance) err(s, "active listing with no provenance");
  if (!p.province || !p.city) err(s, "location hierarchy incomplete");
  if (/[—]/.test(p.title)) err(s, "em-dash in title");
  // media
  const m = media[s];
  if (!m || !m.images.length) { err(s, "missing hero image"); continue; }
  const hashes = new Set();
  m.images.forEach((f, i) => {
    const variants = ["720.webp", "1080.webp", ...(i === 0 ? ["480.webp", "1080.jpg"] : [])];
    for (const v of variants) {
      const file = `public/images/properties/${s}/${f.n}-${v}`;
      if (!existsSync(file)) { err(s, `broken image reference ${file}`); continue; }
      if (statSync(file).size === 0) err(s, `zero-byte media ${file}`);
      if (v === "1080.webp") {
        const h = createHash("sha256").update(readFileSync(file)).digest("hex");
        if (hashes.has(h)) err(s, `duplicate image in gallery (${f.n})`);
        hashes.add(h);
      }
    }
  });
  if (m.video) { const f = `public/${m.video}`; if (!existsSync(f) || statSync(f).size === 0) err(s, `missing video ${f}`); }
  // optional-data warnings
  if (p.status === "for-sale") {
    for (const k of ["floorSizeM2", "erfSizeM2", "ratesZAR", "leviesZAR"]) if (p[k] == null) warn(s, `${k} not published`);
    if (m.images.length < 4) warn(s, `thin gallery (${m.images.length} image${m.images.length === 1 ? "" : "s"})`);
  }
}

// structured locations: the picker counts homes per node and the collection filters by the same keys
// (place = estate || suburb), so each place name must sit under exactly one city
// (and each place under one area) or a count could disagree with its results. Districts are single-city
// by construction (scripts/site/lib.mjs districts()).
const seat = {};
for (const p of props) {
  const pk = p.estate || p.suburb;
  if (pk) (seat["place:" + pk] ??= new Set()).add(`${p.city} / ${p.area}`);
}
for (const [k, v] of Object.entries(seat)) if (v.size > 1) err("locations", `${k} appears under ${[...v].join(" and ")}`);

if (warnings.length) console.log(`${warnings.length} warnings (missing optional data, expected):\n  ` + warnings.slice(0, 12).join("\n  ") + (warnings.length > 12 ? `\n  ... ${warnings.length - 12} more` : ""));
if (errors.length) {
  console.error(`\n${errors.length} VALIDATION ERRORS:\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`validation passed: ${props.length} properties, ${agents.length} agents, 0 errors`);
