// Static site generator: data/*.json -> dist/. Run `npm run build` (validation runs first).
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { cfg, u, abs, esc, tidy, rand, priceLabel, num, m2, fmtDate, place, placeShort, icon, picture, specItems, statusBadge, card, layout } from "./site/lib.mjs";

const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const props = read("data/properties.json");
const agents = Object.fromEntries(read("data/agents.json").map((a) => [a.id, a]));
const media = read("data/media-manifest.json");
const cur = read("data/curation.json");
const HP = cur.homepage;
const bySlug = Object.fromEntries(props.map((p) => [p.slug, p]));
const forSale = props.filter((p) => p.status === "for-sale");
const BIZ = cfg.business;

const OUT = "dist";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync("public", OUT, { recursive: true });
const write = (path, html) => {
  const file = `${OUT}/${path}`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};
const heroImg = (p) => u(`images/properties/${p.slug}/01-1080.jpg`);

// Recommended order: for-sale first, then most recently seen, then price.
const recommended = (a, b) => (a.status === b.status ? 0 : a.status === "for-sale" ? -1 : 1) || b.lastSeenAt.localeCompare(a.lastSeenAt) || (b.priceZAR || 0) - (a.priceZAR || 0);
props.sort(recommended);

const FEATURE_LABELS = {
  pool: "Pool", seaView: "Sea view", mountainView: "Mountain view", golfEstate: "Golf estate", backupPower: "Backup power / solar",
  securityEstate: "24-hour security", staffQuarters: "Staff accommodation", flatlet: "Flatlet or cottage", homeOffice: "Study / home office",
  wineCellar: "Wine cellar or storage", cinema: "Cinema / media room", gym: "Gym", elevator: "Lift / elevator", borehole: "Borehole",
  petFriendly: "Pet friendly", furnished: "Sold furnished (option)", noTransferDuty: "No transfer duty", newBuild: "New build",
};
const FILTER_FEATURES = ["pool", "seaView", "golfEstate", "backupPower", "securityEstate", "staffQuarters", "flatlet", "wineCellar", "noTransferDuty", "newBuild"];

function contactFor(p) {
  const a = p.agent && agents[p.agent];
  if (a && (a.email || a.phone)) return { kind: "agent", a, email: a.email || BIZ.email, phone: a.phone };
  if (a) return { kind: "collab", a, email: BIZ.email, phone: null };
  return { kind: "lhosa", a: null, email: BIZ.email, phone: null };
}
const telHref = (ph) => "tel:" + ph.replace(/[^\d+]/g, "");

// ============================ HOME ============================
function home() {
  const hero = bySlug[HP.hero];
  const curated = HP.curated.map((s) => bySlug[s]);
  const dos = bySlug[HP.dossier];
  const band = bySlug[HP.band];
  const provinces = Object.keys(HP.register);
  const regCols = provinces.map((prov) => {
    const inProv = forSale.filter((p) => p.province === prov);
    const cities = {};
    for (const p of inProv) cities[p.city] = (cities[p.city] || 0) + 1;
    const img = bySlug[HP.register[prov]];
    const list = Object.entries(cities).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<li><a href="${u(`properties/?city=${encodeURIComponent(c)}`)}"><span>${esc(c)}</span><span class="meta">${n}</span></a></li>`).join("");
    return `<div class="register__col reveal">
      <a class="register__img" href="${u(`properties/?province=${encodeURIComponent(prov)}`)}" tabindex="-1" aria-hidden="true">${picture(img, media[img.slug], 0, { sizes: "(min-width: 1024px) 22vw, (min-width: 560px) 45vw, 100vw", alt: "" })}</a>
      <h3 class="h3"><a href="${u(`properties/?province=${encodeURIComponent(prov)}`)}">${esc(prov)}</a></h3>
      <ul>${list}</ul>
    </div>`;
  }).join("");
  const provCount = new Set(forSale.map((p) => p.province)).size;
  const dSpecs = specItems(dos, { long: true }).slice(0, 6).map(([v, k]) => `<div><span class="spec__v">${esc(v)}</span><span class="spec__k">${esc(k)}</span></div>`).join("");
  const body = `
<section class="hero" aria-labelledby="hero-h">
  <div class="hero__text">
    <a class="hero__pictured" href="${u(`properties/${hero.slug}/`)}" aria-label="Pictured: ${esc(hero.title)}, ${esc(place(hero))}, ${esc(priceLabel(hero))}">
      <span class="label">Pictured</span>
      <span class="hero__pictured-name">${esc(placeShort(hero))}, ${esc(hero.city)}</span>
      <ul class="specs">${specItems(hero).map(([v, k]) => `<li><b>${esc(v)}</b>${k ? " " + esc(k) : ""}</li>`).join("")}</ul>
      <span class="price">${esc(priceLabel(hero))}</span>
    </a>
    <div class="hero__copy">
      <h1 class="display" id="hero-h">South Africa’s notable homes, for sale.</h1>
      <p class="lede">A curated selection from the Luxury Homes of SA feed, with asking prices, particulars and a direct line to the agent.</p>
      <div class="hero__actions"><a class="btn btn--primary" href="${u("properties/")}">Explore properties ${icon("arrow-right")}</a></div>
    </div>
  </div>
  <figure class="hero__figure">
    ${picture(hero, media[hero.slug], 0, { sizes: "(min-width: 900px) 58vw, 100vw", eager: true, alt: `${hero.title}, ${place(hero)}` })}
  </figure>
</section>

<section class="section" aria-labelledby="cur-h">
  <div class="wrap">
    <div class="section-head"><h2 class="h2" id="cur-h">Currently for sale</h2></div>
    <div class="curated">
      <div class="curated__lead reveal">${card(curated[0], media[curated[0].slug], { sizes: "(min-width: 900px) 56vw, 100vw" })}</div>
      ${curated.slice(1).map((p) => `<div class="curated__side reveal">${card(p, media[p.slug], { sizes: "(min-width: 900px) 38vw, 100vw" })}</div>`).join("")}
    </div>
    <div class="section-foot"><a class="textlink" href="${u("properties/")}">View all ${forSale.length} homes for sale ${icon("arrow-right")}</a></div>
  </div>
</section>

<section class="section--tight" aria-label="About Luxury Homes of SA">
  <div class="wrap statement">
    <p class="statement__text reveal">Luxury Homes of SA publishes South Africa’s notable homes for sale to a following of more than 41,000 on Instagram, and puts buyers in touch with the agents who market them.</p>
    <div class="statement__facts">
      <div><span class="fact__n num">${forSale.length}</span><span class="fact__l">homes currently for sale on this site</span></div>
      <div><span class="fact__n num">${provCount}</span><span class="fact__l">provinces represented in the current selection</span></div>
      <div><span class="fact__n num">41k</span><span class="fact__l">Instagram followers, @${BIZ.instagramHandle}</span></div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="dos-h">
  <div class="wrap">
    <div class="dossier">
      <a class="dossier__img" href="${u(`properties/${dos.slug}/`)}" tabindex="-1" aria-hidden="true">${picture(dos, media[dos.slug], 0, { sizes: "(min-width: 900px) 72vw, 100vw", alt: "" })}</a>
      <div class="dossier__panel reveal">
        <p class="meta">${esc(place(dos))}, ${esc(dos.province)}</p>
        <h2 class="h2" id="dos-h">${esc(dos.title)}</h2>
        <div class="priceblock"><span class="price" style="font-size:1.6rem">${esc(priceLabel(dos))}</span></div>
        <div class="dossier__specs">${dSpecs}</div>
        <p class="body-copy">${esc(dos.highlights[0] || dos.description.split("\n")[0])}.</p>
        <div><a class="btn btn--ink" href="${u(`properties/${dos.slug}/`)}">View property ${icon("arrow-right")}</a></div>
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="reg-h">
  <div class="wrap">
    <div class="section-head"><h2 class="h2" id="reg-h">Where the homes are</h2><p class="body-copy">Browse by province and city. Every count is a home currently for sale.</p></div>
    <div class="register">${regCols}</div>
    <div class="section-foot"><a class="textlink" href="${u("locations/")}">All locations ${icon("arrow-right")}</a></div>
  </div>
</section>

<section class="section" aria-labelledby="list-h">
  <div class="wrap band">
    <figure class="band__img" style="margin:0">${picture(band, media[band.slug], 0, { sizes: "(min-width: 900px) 52vw, 100vw", alt: `${band.title}, ${place(band)}` })}</figure>
    <div class="band__text reveal">
      <h2 class="h2" id="list-h">Marketing a notable home?</h2>
      <p class="body-copy">Luxury Homes of SA features listings from estate agents across the country. Send us the particulars and photography, and we will talk about featuring the home.</p>
      <a class="btn btn--line" href="${u("list-with-us/")}">List with us</a>
    </div>
  </div>
</section>

${closing()}`;
  write("index.html", layout({ title: "", description: `${forSale.length} notable homes for sale across South Africa, featured by Luxury Homes of SA. Asking prices, specifications and direct agent contact.`, path: "", body, image: heroImg(hero), scripts: [] }));
}

function closing(heading = "Looking for a particular home?") {
  return `<section class="closing section" aria-labelledby="close-h">
  <div class="wrap closing__in">
    <div style="display:grid;gap:14px"><h2 class="h2" id="close-h">${esc(heading)}</h2><p class="lede">Tell us the area, budget and must-haves. We reply by email or Instagram message.</p></div>
    <div style="display:grid;gap:14px;justify-items:start"><a class="btn btn--primary" href="${u("contact/")}">Enquire</a><p class="meta"><a class="link" href="mailto:${BIZ.email}">${BIZ.email}</a></p></div>
  </div>
</section>`;
}

// ============================ COLLECTION ============================
function indexRecord(p) {
  return {
    s: p.slug, t: tidy(p.title), pl: tidy(place(p)), pv: p.province, c: p.city, a: p.area, sb: p.suburb, e: p.estate, ty: p.propertyType,
    pr: p.priceZAR, bd: p.bedrooms, ba: p.bathrooms, g: p.garages, pk: p.parking, fl: p.floorSizeM2, st: p.status, ls: p.lastSeenAt,
    f: FILTER_FEATURES.filter((k) => p.featureFlags[k]), ag: p.agent ? tidy(agents[p.agent].name) : null, ref: p.reference,
    w: media[p.slug].images[0].width, h: media[p.slug].images[0].height,
  };
}
function collection() {
  const provinces = [...new Set(props.map((p) => p.province))].sort();
  const types = [...new Set(props.map((p) => p.propertyType))].sort();
  const priceOpts = [0, 2e6, 5e6, 10e6, 15e6, 20e6, 30e6, 50e6, 100e6];
  const opt = (v, l) => `<option value="${v}">${l}</option>`;
  const featureChecks = FILTER_FEATURES.map((k) => `<label class="check"><input type="checkbox" name="f" value="${k}"> ${FEATURE_LABELS[k]}</label>`).join("");
  const initial = props.filter((p) => p.status === "for-sale");
  const body = `
<div class="wrap">
  <header class="phead">
    <nav aria-label="Breadcrumb"><ol class="crumbs meta"><li><a href="${u("")}">Home</a></li><li aria-current="page">Properties</li></ol></nav>
    <h1 class="display" style="font-size:clamp(2rem,1.4rem+2.6vw,3.4rem)">Properties for sale</h1>
  </header>
  <form class="toolbar" role="search" data-toolbar onsubmit="return false">
    <label class="field"><span>Search by area, estate, title or reference</span><input class="input" type="search" name="q" autocomplete="off" placeholder="e.g. Zimbali, Sandton, Val de Vie"></label>
    <button class="btn btn--line filter-toggle" type="button" data-filters-open aria-controls="filters" aria-expanded="false">${icon("sliders-horizontal")} Filters <span data-filter-count></span></button>
    <label class="field sort-field"><span>Sort</span><select class="select" name="sort"><option value="rec">Recommended</option><option value="asc">Price: low to high</option><option value="desc">Price: high to low</option></select></label>
  </form>
  <div class="collection">
    <aside class="filters" id="filters" aria-label="Filters" data-filters>
      <div class="drawer__head"><p class="h3">Filters</p><button class="iconbtn" type="button" data-filters-close>${icon("x", "Close filters")}</button></div>
      <fieldset><legend>Availability</legend>
        <label class="check"><input type="radio" name="avail" value="current" checked> Currently for sale</label>
        <label class="check"><input type="radio" name="avail" value="all"> Include availability to be confirmed</label>
      </fieldset>
      <label class="field"><span>Province</span><select class="select" name="province"><option value="">All provinces</option>${provinces.map((p) => opt(esc(p), esc(p))).join("")}</select></label>
      <label class="field"><span>City or town</span><select class="select" name="city"><option value="">All cities</option></select></label>
      <label class="field"><span>Property type</span><select class="select" name="type"><option value="">Any type</option>${types.map((t) => opt(t, t)).join("")}</select></label>
      <fieldset><legend>Asking price</legend><div class="pair">
        <select class="select" name="pmin" aria-label="Minimum price">${priceOpts.map((v) => opt(v || "", v ? "From R" + v / 1e6 + "m" : "Min: any")).join("")}</select>
        <select class="select" name="pmax" aria-label="Maximum price">${opt("", "Max: any")}${priceOpts.slice(1).map((v) => opt(v, "To R" + v / 1e6 + "m")).join("")}</select>
      </div></fieldset>
      <div class="pair">
        <label class="field"><span>Bedrooms</span><select class="select" name="beds"><option value="">Any</option>${[1, 2, 3, 4, 5, 6].map((n) => opt(n, n + "+")).join("")}</select></label>
        <label class="field"><span>Bathrooms</span><select class="select" name="baths"><option value="">Any</option>${[1, 2, 3, 4, 5].map((n) => opt(n, n + "+")).join("")}</select></label>
      </div>
      <label class="field"><span>Garages</span><select class="select" name="garages"><option value="">Any</option>${[1, 2, 3, 4].map((n) => opt(n, n + "+")).join("")}</select></label>
      <fieldset><legend>Features</legend>${featureChecks}</fieldset>
      <p class="note">Features are filtered on what the listing text states, not on photographs.</p>
      <div class="drawer__foot"><button class="btn btn--line" type="button" data-reset>Reset</button><button class="btn btn--ink" type="button" data-filters-close><span data-apply-label>Show homes</span></button></div>
    </aside>
    <section aria-labelledby="res-h">
      <div class="results-head"><h2 class="meta" id="res-h" aria-live="polite" data-count>${initial.length} homes</h2><button class="textlink" type="button" data-reset style="background:none;border:0;border-bottom:1px solid currentColor;cursor:pointer">Clear filters</button></div>
      <div class="results" data-results>${initial.map((p) => card(p, media[p.slug])).join("")}</div>
    </section>
  </div>
</div>
<script type="application/json" id="index-data">${JSON.stringify({ base: cfg.BASE_PATH, items: props.map(indexRecord) }).replace(/</g, "\\u003c")}</script>`;
  write("properties/index.html", layout({ title: "Properties for sale", description: `Search ${forSale.length} homes for sale across South Africa by province, city, price, bedrooms and features.`, path: "properties/", body, scripts: ["properties.js"] }));
}

// ============================ PROPERTY ============================
function propertyPage(p) {
  const m = media[p.slug];
  const n = m.images.length;
  const c = contactFor(p);
  const a = c.a;
  const crumbs = [["", "Home"], ["properties/", "Properties"], [`properties/?province=${encodeURIComponent(p.province)}`, p.province], [`properties/?city=${encodeURIComponent(p.city)}`, p.city]];
  const subject = `Enquiry: ${tidy(p.title)}, ${tidy(place(p))} (ref ${p.reference})`;
  const long = specItems(p, { long: true });
  const keyspecs = long.map(([v, k]) => `<div><span class="spec__v">${esc(v)}</span><span class="spec__k">${esc(k)}</span></div>`).join("");
  const fx = p.fx && p.priceZAR ? `<p class="fx">As published ${fmtDate(p.fx.date)}: ${Object.entries(p.fx.asPublished).map(([k, v]) => `${{ USD: "US$", GBP: "£", EUR: "€" }[k]}${v.toLocaleString("en-US")}`).join(" / ")}. Indicative only; exchange rates move.</p>` : "";
  const priceNote = p.priceNote ? `<p class="note">${esc(p.priceNote.replace(/ —.*$/, "").replace(/^Caption: /, "Published as: "))}</p>` : "";
  const history = p.priceHistory.length > 1 ? `<p class="note">Price history as published on Instagram: ${p.priceHistory.map((h) => `${rand(h.priceZAR)} (${fmtDate(h.date)})`).join(", then ")}.</p>` : "";

  // gallery: desktop mosaic + mobile swipe
  const lead = (i, cls) => `<button class="gallery__item ${cls}" type="button" data-open="${i}" aria-label="Open photograph ${i + 1} of ${n} full screen">${picture(p, m, i, { sizes: cls ? "(min-width: 760px) 64vw, 100vw" : "(min-width: 760px) 32vw, 100vw", eager: i === 0 })}</button>`;
  const mosaic = n >= 3
    ? `<div class="gallery">${lead(0, "gallery__item--lead")}${lead(1, "")}<div style="position:relative;display:grid">${lead(2, "")}<button class="btn btn--ink gallery__all" type="button" data-open="0">${icon("images")} All ${n} photographs</button></div></div>`
    : `<div class="gallery gallery--single">${lead(0, "gallery__item--lead")}</div>`;
  const swipe = `<div class="swipe"><div class="swipe__track" data-swipe tabindex="0" aria-label="Photographs, swipe to browse">${m.images.map((_, i) => `<button class="swipe__slide" type="button" data-open="${i}" aria-label="Open photograph ${i + 1} of ${n} full screen">${picture(p, m, i, { sizes: "100vw", eager: i === 0 })}</button>`).join("")}</div>${n > 1 ? `<span class="swipe__count" data-swipe-count>1 / ${n}</span>` : ""}</div>`;

  const agentBlock = c.kind === "agent"
    ? `<div class="agent"><p class="label">Marketed by</p><p class="agent__name">${esc(a.name)}</p>${a.agency ? `<p class="meta">${esc(a.agency)}</p>` : ""}
       <ul class="contact-lines">${a.phone ? `<li><a href="${telHref(a.phone)}">${icon("phone")} ${esc(a.phone)}</a></li>` : ""}${a.email ? `<li><a href="mailto:${a.email}?subject=${encodeURIComponent(subject)}">${icon("envelope-simple")} ${esc(a.email)}</a></li>` : ""}${a.instagram[0] ? `<li><a href="https://www.instagram.com/${a.instagram[0]}/" rel="noopener">${icon("instagram-logo")} @${esc(a.instagram[0])}</a></li>` : ""}</ul></div>`
    : c.kind === "collab"
    ? `<div class="agent"><p class="label">Marketed by</p><p class="agent__name">${esc(a.name)}</p><ul class="contact-lines"><li><a href="https://www.instagram.com/${a.instagram[0]}/" rel="noopener">${icon("instagram-logo")} @${esc(a.instagram[0])}</a></li><li><a href="mailto:${BIZ.email}?subject=${encodeURIComponent(subject)}">${icon("envelope-simple")} ${esc(BIZ.email)}</a></li></ul><p class="note">The agent publishes contact by Instagram message. Luxury Homes of SA can also pass on your enquiry.</p></div>`
    : `<div class="agent"><p class="label">Enquiries</p><p class="agent__name">Luxury Homes of SA</p><ul class="contact-lines"><li><a href="mailto:${BIZ.email}?subject=${encodeURIComponent(subject)}">${icon("envelope-simple")} ${esc(BIZ.email)}</a></li><li><a href="${BIZ.instagramUrl}" rel="noopener">${icon("instagram-logo")} Message @${BIZ.instagramHandle}</a></li></ul><p class="note">We connect you with the agent marketing this home.</p></div>`;

  const provenance = c.kind === "lhosa"
    ? `Featured by Luxury Homes of SA. This home is marketed by an estate agency; Luxury Homes of SA does not hold the mandate and will connect you with the listing agent.${p.sourceListingUrl ? ` <a class="link" href="${p.sourceListingUrl}" rel="noopener">View the agency listing</a>.` : ""}`
    : `Marketed by ${esc(a.name)}${a.agency ? ` of ${esc(a.agency)}` : ""}, and featured by Luxury Homes of SA in collaboration. Luxury Homes of SA does not hold the mandate.`;

  const statusLine = p.status === "for-sale"
    ? `<p class="meta">For sale. Last published ${fmtDate(p.lastSeenAt)}.</p>`
    : `<p class="meta">Availability to be confirmed. Last featured ${fmtDate(p.lastSeenAt)}; enquire to check it is still on the market.</p>`;

  const flags = Object.entries(p.featureFlags).filter(([k, v]) => v && FEATURE_LABELS[k]).map(([k]) => FEATURE_LABELS[k]);
  const featureItems = p.features.length ? p.features : flags;
  const fin = [["Asking price", priceLabel(p)], ["Rates and taxes", p.ratesZAR != null ? rand(p.ratesZAR) : null], ["Levies", p.leviesZAR != null ? rand(p.leviesZAR) : null]]
    .filter(([, v]) => v).map(([k, v]) => `<div><span class="spec__v">${esc(v)}</span><span class="spec__k">${esc(k)}</span></div>`).join("");
  const taxNotes = [p.featureFlags.noTransferDuty ? "The listing states that no transfer duty is payable." : null, /includes VAT/i.test(p.highlights.join(" ")) ? "The listing states that the price includes VAT." : null].filter(Boolean);

  const related = props.filter((q) => q.slug !== p.slug && q.status === "for-sale" && (q.city === p.city || q.province === p.province))
    .sort((x, y) => (y.city === p.city) - (x.city === p.city) || Math.abs((x.priceZAR || 0) - (p.priceZAR || 0)) - Math.abs((y.priceZAR || 0) - (p.priceZAR || 0))).slice(0, 3);

  const body = `
<div class="wrap">
  <nav aria-label="Breadcrumb" style="padding-block:18px"><ol class="crumbs meta">${crumbs.map(([h, l]) => `<li><a href="${u(h)}">${esc(l)}</a></li>`).join("")}<li aria-current="page">${esc(placeShort(p))}</li></ol></nav>
  ${mosaic}${swipe}
  <div class="particulars">
    <div class="particulars__main">
      <p class="meta">${esc([p.estate, p.suburb, p.city, p.province].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(", "))}</p>
      <h1 class="display" style="font-size:clamp(1.9rem,1.3rem+2.4vw,3.2rem)">${esc(p.title)}</h1>
      <div class="priceblock"><span class="label">${p.priceZAR ? "Asking price" : "Price"}</span><span class="price">${esc(priceLabel(p))}</span>${priceNote}</div>
      ${statusLine}
      <div class="keyspecs">${keyspecs}</div>
      ${p.headline && p.headline !== p.description.split("\n")[0] ? `<p class="lede" style="max-width:52ch">${esc(p.headline)}</p>` : ""}
      <div class="body-copy">${p.description.split(/\n{2,}/).map((para) => `<p>${esc(para.replace(/\n/g, " "))}</p>`).join("")}</div>
    </div>
    <aside class="aside" aria-label="Enquire about this home">
      <div class="aside__actions">
        ${p.status === "for-sale" ? `<a class="btn btn--primary btn--block" href="#enquire" data-intent="viewing">Arrange a viewing</a>` : `<a class="btn btn--primary btn--block" href="#enquire" data-intent="details">Check availability</a>`}
        ${c.phone ? `<a class="btn btn--line btn--block" href="${telHref(c.phone)}">${icon("phone")} Call ${esc(a.name.split(" ")[0])}</a>` : ""}
      </div>
      ${agentBlock}
    </aside>
  </div>

  ${p.highlights.length || featureItems.length ? `<section class="detail-section" aria-labelledby="feat-h"><h2 id="feat-h">Features</h2><div>
    ${p.highlights.length ? `<ul class="highlights">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
    <ul class="feature-list">${featureItems.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
  </div></section>` : ""}

  <section class="detail-section" aria-labelledby="fin-h"><h2 id="fin-h">Financials</h2><div>
    <div class="fin">${fin}</div>
    ${fx ? fx.replace('class="fx"', 'class="fx" style="margin-top:16px"') : ""}
    ${p.ratesZAR != null || p.leviesZAR != null ? `<p class="note" style="margin-top:16px">Rates and levies are shown as the agent published them, normally a monthly amount. Confirm current figures with the agent.</p>` : ""}
    ${taxNotes.length ? `<p class="note" style="margin-top:16px">${taxNotes.join(" ")}</p>` : ""}
    ${p.ratesZAR == null || p.leviesZAR == null ? `<p class="note" style="margin-top:16px">${[p.ratesZAR == null ? "rates" : null, p.leviesZAR == null ? "levies" : null].filter(Boolean).join(" and ").replace(/^./, (s) => s.toUpperCase())} not published for this listing; ask the agent.</p>` : ""}
    ${history}
    ${p.priceZAR && p.status === "for-sale" ? `<details class="calc" data-calc data-price="${p.priceZAR}"><summary>Illustrative bond repayment</summary>
      <div class="calc__grid">
        <label class="field"><span>Purchase price (R)</span><input class="input num" name="price" inputmode="numeric" value="${p.priceZAR}"></label>
        <label class="field"><span>Deposit (R)</span><input class="input num" name="deposit" inputmode="numeric" value="${Math.round(p.priceZAR * 0.1)}"></label>
        <label class="field"><span>Example interest rate (% a year)</span><input class="input num" name="rate" inputmode="decimal" value="11.25"></label>
        <label class="field"><span>Term (years)</span><input class="input num" name="years" inputmode="numeric" value="20"></label>
      </div>
      <div class="calc__out"><span class="meta">Estimated monthly repayment</span><output name="result" aria-live="polite">R0</output>
      <p class="note">An illustration using standard amortisation. The rate shown is an editable example, not a quoted or current rate. Not a bond quote or a finance offer; excludes transfer costs, bond fees and insurance.</p></div>
    </details>` : ""}
  </div></section>

  ${n > 3 || m.video ? `<section class="detail-section detail-section--wide" aria-labelledby="gal-h"><h2 id="gal-h">Photographs${m.video ? " and film" : ""}</h2><div style="display:grid;gap:24px">
    ${m.video ? `<div class="film"><video controls preload="none" playsinline poster="${u(`images/properties/${p.slug}/01-720.webp`)}" aria-label="Property film for ${esc(p.title)}"><source src="${u(m.video)}" type="video/mp4"></video></div><p class="note">Film as published on Instagram. Plays only when you press play.</p>` : ""}
    ${n > 3 ? `<div class="grid-gallery">${m.images.map((_, i) => `<button type="button" data-open="${i}" aria-label="Open photograph ${i + 1} of ${n} full screen">${picture(p, m, i, { sizes: "(min-width: 900px) 50vw, 50vw" })}</button>`).join("")}</div>` : ""}
  </div></section>` : ""}

  <section class="detail-section" aria-labelledby="loc-h"><h2 id="loc-h">Location and source</h2><div style="display:grid;gap:14px">
    <p class="body-copy">${esc([p.estate ? `${p.estate}` : null, p.suburb && p.suburb !== p.estate ? p.suburb : null, p.area && p.area !== p.city ? p.area : null, p.city, p.province].filter(Boolean).join(", "))}. The street address is shared by the agent on enquiry.</p>
    <p class="body-copy">${provenance}</p>
    <p class="note">Published on Instagram:</p>
    <ul class="sources meta">${p.instagramPosts.map((ip) => `<li><a class="link" href="${ip.url}" rel="noopener">${fmtDate(ip.date)}, @${esc(ip.author)}</a></li>`).join("")}</ul>
    <p class="note">Reference ${esc(p.reference)}. Details as published by the marketing agent; confirm before making an offer.</p>
    <p><a class="textlink" href="${u(`properties/?city=${encodeURIComponent(p.city)}`)}">More homes for sale in ${esc(p.city)} ${icon("arrow-right")}</a></p>
  </div></section>

  <section class="detail-section" id="enquire" aria-labelledby="enq-h"><h2 id="enq-h">Enquire</h2>
    <form class="form" data-enquiry data-to="${esc(c.email)}" data-subject="${esc(subject)}" novalidate>
      <fieldset class="radios"><legend class="sr-only">I would like to</legend>
        <label class="check"><input type="radio" name="intent" value="Arrange a viewing"${p.status === "for-sale" ? " checked" : ""}> Arrange a viewing</label>
        <label class="check"><input type="radio" name="intent" value="Request more details"${p.status === "for-sale" ? "" : " checked"}> ${p.status === "for-sale" ? "Request details" : "Check availability and details"}</label>
      </fieldset>
      <div class="row"><label class="field"><span>Name</span><input class="input" name="name" autocomplete="name" required></label>
      <label class="field"><span>Phone (optional)</span><input class="input" name="phone" type="tel" autocomplete="tel"></label></div>
      <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>Message (optional)</span><textarea class="input" name="message"></textarea></label>
      <p class="form__error" data-error hidden></p>
      <div><button class="btn btn--primary" type="submit">Email your enquiry</button></div>
      <p class="form__help">Opens your email app with a message to ${c.kind === "agent" && a.email ? esc(a.name) : "Luxury Homes of SA"} (${esc(c.email)}). Nothing is sent until you send it.</p>
    </form>
  </section>
</div>

${related.length ? `<section class="section" aria-labelledby="rel-h" style="border-top:1px solid var(--line)"><div class="wrap"><div class="section-head"><h2 class="h2" id="rel-h">More in ${esc(related.every((r) => r.city === p.city) ? p.city : p.province)}</h2></div><div class="results results--three">${related.map((r) => card(r, media[r.slug])).join("")}</div></div></section>` : ""}

<div class="stickybar" data-stickybar><span><span class="price">${esc(priceLabel(p))}</span><br><span class="meta">${esc(placeShort(p))}</span></span><a class="btn btn--primary" href="#enquire">Enquire</a></div>

<div class="lightbox" data-lightbox role="dialog" aria-modal="true" aria-label="Photographs of ${esc(p.title)}" hidden>
  <div class="lightbox__bar"><span class="meta" style="color:#b9beba" data-lb-count></span><button class="iconbtn" type="button" data-lb-close>${icon("x", "Close photographs")}</button></div>
  <div class="lightbox__stage" data-lb-stage><img alt="" data-lb-img><button class="lightbox__nav lightbox__nav--prev" type="button" data-lb-prev>${icon("arrow-left", "Previous photograph")}</button><button class="lightbox__nav lightbox__nav--next" type="button" data-lb-next>${icon("arrow-right", "Next photograph")}</button></div>
  <p class="lightbox__foot">${esc(p.title)}, ${esc(place(p))}</p>
</div>
<script type="application/json" id="gallery-data">${JSON.stringify(m.images.map((f) => ({ src: u(`images/properties/${p.slug}/${f.n}-1080.webp`), w: Math.min(1080, f.width), h: Math.round((Math.min(1080, f.width) / f.width) * f.height) })))}</script>`;
  write(`properties/${p.slug}/index.html`, layout({
    title: `${p.title}, ${place(p)}`,
    description: tidy(`${p.propertyType} ${p.status === "for-sale" ? "for sale" : ""} in ${place(p)}, ${p.province}. ${priceLabel(p)}. ${specItems(p, { long: true }).map(([v, k]) => `${v} ${k.toLowerCase()}`).join(", ")}.`).replace(/\s+/g, " "),
    path: `properties/${p.slug}/`, body, image: heroImg(p), bodyClass: "has-stickybar", scripts: ["property.js"],
  }));
}

// ============================ LOCATIONS ============================
function locations() {
  const tree = {};
  for (const p of forSale) {
    const pv = (tree[p.province] ??= { all: 0, cur: 0, cities: {} });
    pv.all++; if (p.status === "for-sale") pv.cur++;
    const c = (pv.cities[p.city] ??= { all: 0, cur: 0, places: {} });
    c.all++; if (p.status === "for-sale") c.cur++;
    const k = p.estate || p.suburb || p.area;
    if (k && k !== p.city) { const pl = (c.places[k] ??= { all: 0, cur: 0 }); pl.all++; if (p.status === "for-sale") pl.cur++; }
  }
  const count = (o) => `${o.cur} for sale`;
  const toConfirm = props.length - forSale.length;
  const provs = Object.entries(tree).sort((a, b) => b[1].all - a[1].all).map(([pv, o]) => `
  <section class="loc-prov" aria-labelledby="pv-${pv.replace(/\W+/g, "-")}">
    <div><h2 class="h2" id="pv-${pv.replace(/\W+/g, "-")}"><a href="${u(`properties/?province=${encodeURIComponent(pv)}`)}" style="text-decoration:none">${esc(pv)}</a></h2><p class="meta" style="margin-top:8px">${count(o)}</p></div>
    <div class="loc-cities">${Object.entries(o.cities).sort((a, b) => b[1].all - a[1].all).map(([c, co]) => `
      <div class="loc-city"><h3><a href="${u(`properties/?city=${encodeURIComponent(c)}`)}" style="text-decoration:none">${esc(c)}</a></h3><p class="meta">${count(co)}</p>
      ${Object.keys(co.places).length ? `<ul>${Object.entries(co.places).sort((a, b) => b[1].all - a[1].all).map(([pl, po]) => `<li><a href="${u(`properties/?q=${encodeURIComponent(pl)}`)}"><span>${esc(pl)}</span><span class="meta">${po.all}</span></a></li>`).join("")}</ul>` : ""}</div>`).join("")}
    </div>
  </section>`).join("");
  const body = `<div class="wrap"><header class="phead"><nav aria-label="Breadcrumb"><ol class="crumbs meta"><li><a href="${u("")}">Home</a></li><li aria-current="page">Locations</li></ol></nav>
  <h1 class="display" style="font-size:clamp(2rem,1.4rem+2.6vw,3.4rem)">Locations</h1><p class="lede">Homes currently for sale, by province, city, suburb and estate. You don’t need to know an estate name to find a home.</p></header>
  <div class="loc-tree">${provs}</div>
  <p class="note" style="padding-block:28px 96px;border-top:1px solid var(--line)">A further ${toConfirm} homes featured earlier in the year are awaiting confirmation that they are still on the market. <a class="link" href="${u("properties/?avail=all")}">Browse them with availability to be confirmed</a>.</p></div>`;
  write("locations/index.html", layout({ title: "Locations", description: "Homes for sale across South Africa, organised by province, city, suburb and estate.", path: "locations/", body }));
}

// ============================ CONTENT PAGES ============================
function prosePage(path, title, lede, sections, extra = "") {
  const body = `<div class="wrap"><header class="phead"><nav aria-label="Breadcrumb"><ol class="crumbs meta"><li><a href="${u("")}">Home</a></li><li aria-current="page">${esc(title)}</li></ol></nav>
  <h1 class="display" style="font-size:clamp(2rem,1.4rem+2.6vw,3.4rem)">${esc(title)}</h1><p class="lede">${esc(lede)}</p></header>
  ${sections.map(([h, html]) => `<section class="prose"><h2>${esc(h)}</h2><div class="body-copy">${html}</div></section>`).join("")}${extra}</div>`;
  return body;
}

function about() {
  const body = prosePage("about/", "About", "Luxury Homes of SA is a South African property publication on Instagram, featuring notable homes for sale across the country.", [
    ["What we do", `<p>Luxury Homes of SA publishes homes for sale to a following of more than 41,000 on Instagram (@${BIZ.instagramHandle}). Listings are shared in collaboration with the estate agents who market them, and this site gathers those listings into one place with their asking prices and particulars.</p>`],
    ["Who you deal with", `<p>Each home is marketed by an estate agent or agency. Where the agent is credited, their name and contact details appear on the property page and your enquiry goes to them directly. Where a home was featured without an agent credit, send your enquiry to Luxury Homes of SA and we will put you in touch with the listing agent.</p><p>Luxury Homes of SA does not hold sales mandates.</p>`],
    ["How listings are kept current", `<p>A home is shown as <strong>for sale</strong> when it has been published within the last 60 days or confirmed on a current agency listing. Older features are marked <strong>availability to be confirmed</strong> and are hidden from the default search until an agent confirms them.</p><p>Prices, sizes, rates and levies are shown exactly as the agent published them. Where a detail wasn’t published, we leave it out rather than estimate it.</p>`],
    ["Contact", `<p>Email <a class="link" href="mailto:${BIZ.email}">${BIZ.email}</a> or message <a class="link" href="${BIZ.instagramUrl}" rel="noopener">@${BIZ.instagramHandle}</a> on Instagram.</p>`],
  ]);
  write("about/index.html", layout({ title: "About", description: "Luxury Homes of SA features notable South African homes for sale in collaboration with the agents who market them.", path: "about/", body: body + closing() }));
}

function listWithUs() {
  const body = prosePage("list-with-us/", "List with us", "Marketing a notable home? Luxury Homes of SA features listings from agents across South Africa on Instagram.", [
    ["How it works", `<p>Listings on @${BIZ.instagramHandle} are published as collaborations with the marketing agent: the post carries the home’s photography and particulars, and can credit the agent with their contact details so enquiries reach them directly.</p><p>Terms for each collaboration are agreed directly with Luxury Homes of SA.</p>`],
    ["What to send", `<ul><li>Asking price, location (suburb or estate), and bedrooms, bathrooms and garages</li><li>Floor and erf size, rates and levies, if available</li><li>Professional photography you have the right to share, and any property film</li><li>The agent’s name, agency, phone and email as they should appear</li><li>A link to the current agency listing</li></ul>`],
    ["Get in touch", `<p>Email <a class="link" href="mailto:${BIZ.email}?subject=${encodeURIComponent("Listing collaboration")}">${BIZ.email}</a> with the subject “Listing collaboration”, or send a message to <a class="link" href="${BIZ.instagramUrl}" rel="noopener">@${BIZ.instagramHandle}</a>.</p><p style="margin-top:18px"><a class="btn btn--primary" href="mailto:${BIZ.email}?subject=${encodeURIComponent("Listing collaboration")}">Email the particulars</a></p>`],
  ]);
  write("list-with-us/index.html", layout({ title: "List with us", description: "Feature a notable South African home for sale with Luxury Homes of SA on Instagram.", path: "list-with-us/", body }));
}

function contact() {
  const form = `<section class="prose"><h2>Send an enquiry</h2><div>
    <form class="form" data-enquiry data-to="${BIZ.email}" data-subject="Property enquiry" novalidate>
      <fieldset class="radios"><legend class="sr-only">Enquiry type</legend>
        <label class="check"><input type="radio" name="intent" value="I am looking to buy" checked> I’m looking to buy</label>
        <label class="check"><input type="radio" name="intent" value="Listing collaboration"> I’m an agent with a listing</label>
      </fieldset>
      <div class="row"><label class="field"><span>Name</span><input class="input" name="name" autocomplete="name" required></label>
      <label class="field"><span>Phone (optional)</span><input class="input" name="phone" type="tel" autocomplete="tel"></label></div>
      <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>Area, budget and requirements</span><textarea class="input" name="message"></textarea></label>
      <p class="form__error" data-error hidden></p>
      <div><button class="btn btn--primary" type="submit">Email your enquiry</button></div>
      <p class="form__help">Opens your email app with a message to ${BIZ.email}. Nothing is sent until you send it.</p>
    </form></div></section>`;
  const body = prosePage("contact/", "Enquire", "Looking for a home, or asking about one on this site? We reply by email or Instagram message.", [
    ["Direct", `<ul class="contact-lines" style="margin:0"><li><a href="mailto:${BIZ.email}">${icon("envelope-simple")} ${BIZ.email}</a></li><li><a href="${BIZ.instagramUrl}" rel="noopener">${icon("instagram-logo")} Message @${BIZ.instagramHandle} on Instagram</a></li></ul><p class="note" style="margin-top:14px">About a specific home? Use the agent contact on its property page for the fastest reply.</p>`],
  ], form);
  write("contact/index.html", layout({ title: "Enquire", description: "Contact Luxury Homes of SA by email or Instagram message.", path: "contact/", body: body + '<div style="height:80px"></div>' }));
}

function notFound() {
  const body = `<div class="wrap" style="padding-block:clamp(64px,10vw,140px);display:grid;gap:20px;justify-items:start">
  <p class="meta">Page not found</p><h1 class="display">This address doesn’t lead anywhere.</h1><p class="lede">The home may have been removed from the site, or the link is mistyped.</p>
  <div class="hero__actions"><a class="btn btn--primary" href="${u("properties/")}">Explore properties</a><a class="textlink" href="${u("")}">Home</a></div></div>`;
  write("404.html", layout({ title: "Page not found", description: "Page not found.", path: "404.html", body }));
}

// ============================ RUN ============================
home();
collection();
props.forEach(propertyPage);
locations();
about();
listWithUs();
contact();
notFound();
writeFileSync(`${OUT}/favicon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1b2023"/><text x="16" y="21.5" font-family="Arial,sans-serif" font-size="13" font-weight="700" text-anchor="middle" fill="#f1f2ef">SA</text></svg>`);
writeFileSync(`${OUT}/robots.txt`, cfg.PROPOSAL_MODE ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${abs("sitemap.xml")}\n`);
if (!cfg.PROPOSAL_MODE) {
  const urls = ["", "properties/", "locations/", "about/", "list-with-us/", "contact/", ...props.map((p) => `properties/${p.slug}/`)];
  writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((x) => `<url><loc>${abs(x)}</loc></url>`).join("")}</urlset>`);
}
writeFileSync(`${OUT}/.nojekyll`, "");
console.log(`built ${props.length} property pages + 7 pages into ${OUT}/ (PROPOSAL_MODE=${cfg.PROPOSAL_MODE})`);
