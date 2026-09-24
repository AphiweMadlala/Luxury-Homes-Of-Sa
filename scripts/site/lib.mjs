// Shared helpers and partials for the static generator.
import { readFileSync } from "node:fs";

export const cfg = JSON.parse(readFileSync("site.config.json", "utf8"));
export const B = cfg.BASE_PATH;
export const u = (p = "") => B + String(p).replace(/^\//, "");
export const abs = (p = "") => cfg.SITE_URL.replace(/\/$/, "") + "/" + String(p).replace(/^\//, "");

// Visible copy never carries em/en dashes (design rule); source captions sometimes do.
export const tidy = (s) => String(s ?? "").replace(/\s[—–]\s/g, ", ").replace(/[—–]/g, "-");
export const esc = (s) => tidy(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const group = (n) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export function rand(n) {
  if (n == null) return null;
  const cents = Math.round((n % 1) * 100);
  return "R" + group(n) + (cents ? "." + String(cents).padStart(2, "0") : "");
}
export const randShort = (n) => {
  if (n == null) return null;
  const m = n / 1e6;
  return m >= 1 ? `R${(Math.round(m * 10) / 10).toString().replace(/\.0$/, "")}m` : `R${Math.round(n / 1000)}k`;
};
export const priceLabel = (p) => (p.priceZAR ? rand(p.priceZAR) : "Price on request");
export const num = (n) => (n == null ? null : Number.isInteger(n) ? String(n) : String(n));
export const m2 = (n) => (n == null ? null : group(n) + " m²");
export const fmtDate = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const place = (p) => [p.estate || p.suburb, p.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
export const placeShort = (p) => p.estate || p.suburb || p.city;

// ---- structured locations, generated from inventory ----
// Province → city → (district) → estate or suburb. Every node carries the number of homes in `list`,
// so a location is only offered when it has at least one home. The client filters with the same keys:
// province, city, area (district name) and place (estate || suburb, see placeKey).
// An `area` is used as a level only when it is a district *inside* a city, derived from the whole
// dataset (`all`): every home with that area is in the same city, and that city has homes in two or more
// areas. Regional areas that span or contain cities (Garden Route, Ekurhuleni, North Coast) never
// become a child of a city. A district node is shown when it groups two or more named places.
export const placeKey = (p) => p.estate || p.suburb || null;
export function districts(all) {
  const cities = {}, areaCities = {};
  for (const p of all) {
    if (!p.area) continue;
    (cities[p.city] ??= new Set()).add(p.area);
    (areaCities[p.area] ??= new Set()).add(p.city);
  }
  return new Set(Object.keys(areaCities).filter((a) => areaCities[a].size === 1 && !cities[a] && cities[[...areaCities[a]][0]].size >= 2 && a !== [...areaCities[a]][0]));
}
export function locationTree(list, all = list) {
  const D = districts(all);
  const by = (arr, f) => {
    const m = new Map();
    for (const x of arr) { const k = f(x); if (k) (m.get(k) ?? m.set(k, []).get(k)).push(x); }
    return [...m].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  };
  const places = (arr, skip) => by(arr, (p) => (skip.includes(placeKey(p)) ? null : placeKey(p))).map(([v, xs]) => ({ k: "place", v, n: xs.length }));
  return by(list, (p) => p.province).map(([pv, ps]) => ({
    k: "province", v: pv, n: ps.length,
    kids: by(ps, (p) => p.city).map(([c, cs]) => {
      const areas = by(cs, (p) => (D.has(p.area) ? p.area : null))
        .filter(([a, as]) => new Set(as.map(placeKey).filter((k) => k && k !== a && k !== c)).size >= 2);
      const grouped = new Set(areas.map(([a]) => a));
      const kids = [
        ...areas.map(([a, as]) => ({ k: "area", v: a, n: as.length, kids: places(as, [c, a]) })),
        ...places(cs.filter((p) => !grouped.has(p.area)), [c]),
      ].sort((x, y) => y.n - x.n || x.v.localeCompare(y.v));
      return { k: "city", v: c, n: cs.length, kids };
    }),
  }));
}
export const LOC_KEYS = ["province", "city", "area", "place"];
export const locHref = (node, extra = "") => u(`properties/?${node.k}=${encodeURIComponent(node.v).replace(/%20/g, "+")}${extra}`);

// ---- copy-to-clipboard for email addresses (people without a configured mail app) ----
export const copyEmail = (email) =>
  `<button class="copy" type="button" data-copy="${email}" aria-label="Copy email address ${email}"><span data-copy-label>Copy email</span></button>`;

// ---- icons: Phosphor (regular), inlined at build time ----
const iconCache = {};
export function icon(name, label) {
  iconCache[name] ??= readFileSync(`node_modules/@phosphor-icons/core/assets/regular/${name}.svg`, "utf8")
    .replace("<svg ", '<svg aria-hidden="true" focusable="false" fill="currentColor" ');
  return label ? iconCache[name].replace('aria-hidden="true"', `role="img" aria-label="${esc(label)}"`) : iconCache[name];
}

// ---- images ----
export function picture(p, media, i, { sizes = "100vw", eager = false, alt, cls = "" } = {}) {
  const f = media.images[i];
  if (!f) return "";
  const base = u(`images/properties/${p.slug}/${f.n}`);
  const srcset = [i === 0 ? `${base}-480.webp 480w` : null, `${base}-720.webp 720w`, `${base}-1080.webp ${Math.min(1080, f.width)}w`].filter(Boolean).join(", ");
  const h = Math.round((Math.min(1080, f.width) / f.width) * f.height);
  const fallback = i === 0 ? `${base}-1080.jpg` : `${base}-1080.webp`;
  const altText = alt ?? `${p.title}, ${place(p)}: photograph ${i + 1} of ${media.images.length}`;
  return `<picture${cls ? ` class="${cls}"` : ""}><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="${fallback}" width="${Math.min(1080, f.width)}" height="${h}" alt="${esc(altText)}" ${eager ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async"></picture>`;
}

export function specItems(p, { long = false } = {}) {
  const out = [];
  if (p.bedrooms != null) out.push([num(p.bedrooms), long ? "Bedrooms" : p.bedrooms === 1 ? "bed" : "beds"]);
  if (p.bathrooms != null) out.push([num(p.bathrooms), long ? "Bathrooms" : p.bathrooms === 1 ? "bath" : "baths"]);
  if (p.garages != null) out.push([num(p.garages), long ? "Garages" : p.garages === 1 ? "garage" : "garages"]);
  else if (p.parking != null) out.push([num(p.parking), long ? "Parking bays" : "parking"]);
  if (long) {
    if (p.floorSizeM2 != null) out.push([m2(p.floorSizeM2), "Floor size"]);
    if (p.erfSizeM2 != null) out.push([p.erfSizeM2 >= 10000 ? `${(p.erfSizeM2 / 10000).toLocaleString("en-ZA")} ha` : m2(p.erfSizeM2), "Erf size"]);
  } else if (p.floorSizeM2 != null) out.push([m2(p.floorSizeM2), ""]);
  return out;
}

export const statusBadge = (p) =>
  p.status === "for-sale" ? `<span class="status">For sale</span>` : `<span class="status status--unknown">Availability to be confirmed</span>`;

export function card(p, media, { sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw", eager = false, badge = true } = {}) {
  const specs = specItems(p).map(([v, k]) => `<li><b>${esc(v)}</b>${k ? " " + esc(k) : ""}</li>`).join("");
  return `<article class="card">
  <div class="card__img">${picture(p, media, 0, { sizes, eager, alt: `${p.title}, ${place(p)}` })}${badge && p.status !== "for-sale" ? statusBadge(p) : ""}</div>
  <div class="card__body">
    <p class="card__place">${esc(place(p))}</p>
    <h3 class="card__title"><a href="${u(`properties/${p.slug}/`)}">${esc(p.title)}</a></h3>
    <div class="card__row"><span class="price card__price">${esc(priceLabel(p))}</span><ul class="specs">${specs}</ul></div>
  </div>
</article>`;
}

// ---- wordmark: typographic lockup, no graphic device ----
export const wordmark = (tag = "a", attrs = "") =>
  `<${tag} class="wordmark"${tag === "a" ? ` href="${u("")}"` : ""}${attrs}><span class="wordmark__main">Luxury Homes</span><span class="wordmark__sub">of South Africa</span></${tag}>`;

// ---- layout ----
const NAV = [
  ["properties/", "Properties"],
  ["locations/", "Locations"],
  ["collaborate/", "Collaborate"],
  ["about/", "About"],
];

export function layout({ title, description, path, body, image, bodyClass = "", scripts = [], jsonLd }) {
  const full = title ? `${title} | ${cfg.SITE_NAME}` : `${cfg.SITE_NAME} | Homes for sale across South Africa`;
  const nav = NAV.map(([h, l]) => `<li><a href="${u(h)}"${path.startsWith(h) ? ' aria-current="page"' : ""}>${l}</a></li>`).join("");
  const og = image ? abs(image.replace(B, "")) : null;
  return `<!doctype html>
<html lang="en-ZA">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.add("js")</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${cfg.PROPOSAL_MODE ? '<meta name="robots" content="noindex, nofollow">\n' : ""}<link rel="canonical" href="${abs(path)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(cfg.SITE_NAME)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(path)}">
${og ? `<meta property="og:image" content="${og}">\n` : ""}<meta name="theme-color" content="#f1f2ef">
<meta name="color-scheme" content="light">
<link rel="preload" href="${u("fonts/bodonimoda-var-latin.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${u("fonts/manrope-var-latin.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${u("css/site.css")}">
<link rel="icon" href="${u("favicon.svg")}" type="image/svg+xml">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ""}</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap nav__in">
    ${wordmark("a", ` aria-label="Luxury Homes of South Africa, home"`)}
    <nav aria-label="Primary"><ul class="nav__links">${nav}</ul></nav>
    <a class="btn btn--ink nav__cta" href="${u("contact/")}">Enquire</a>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="mnav" data-menu-open>${icon("list", "Open menu")}</button>
  </div>
</header>
<div class="mnav" id="mnav" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="mnav__top">${wordmark("span", ' aria-hidden="true"')}<button class="iconbtn" type="button" data-menu-close>${icon("x", "Close menu")}</button></div>
  <ul>${nav}<li><a href="${u("contact/")}">Enquire</a></li></ul>
  <p class="meta"><a class="link" href="mailto:${cfg.business.email}">${cfg.business.email}</a></p>
</div>
<p class="sr-only" aria-live="polite" data-copy-status></p>
<main id="main">
${body}
</main>
<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div class="footer__brand">${wordmark("a", ` aria-label="Luxury Homes of South Africa, home"`)}<p class="note" style="margin-top:14px;max-width:34ch">A national property publication featuring notable homes for sale across South Africa.</p></div>
      <div><p class="label">Explore</p><ul><li><a href="${u("properties/")}">Properties</a></li><li><a href="${u("locations/")}">Locations</a></li></ul></div>
      <div><p class="label">Company</p><ul><li><a href="${u("about/")}">About</a></li><li><a href="${u("collaborate/")}">Collaborate</a></li><li><a href="${u("contact/")}">Enquire</a></li></ul></div>
      <div><p class="label">Contact</p><ul><li><a href="mailto:${cfg.business.email}">${cfg.business.email}</a></li><li>${copyEmail(cfg.business.email)}</li><li><a href="${cfg.business.instagramUrl}" rel="noopener">Instagram @${cfg.business.instagramHandle}</a></li></ul></div>
    </div>
    <p class="footer__note">Luxury Homes of SA is a property publication, not an estate agency, and does not hold sales mandates. Homes are marketed by the agents and agencies who list them. Details are as published by the marketing agent and may change; confirm them with the agent before making an offer.</p>
  </div>
</footer>
<script src="${u("js/site.js")}" defer></script>
${scripts.map((s) => `<script src="${u(`js/${s}`)}" defer></script>`).join("\n")}
</body>
</html>`;
}
