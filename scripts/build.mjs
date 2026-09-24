// Static site generator: data/*.json -> dist/. Run `npm run build` (validation runs first).
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { cfg, u, abs, esc, tidy, rand, randShort, copyEmail, priceLabel, num, m2, fmtDate, place, placeShort, placeKey, locationTree, locHref, icon, picture, specItems, statusBadge, card, layout } from "./site/lib.mjs";

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

// ============================ MARKETS ============================
// Markets are generated from current inventory: every city with at least two homes for sale,
// ordered by count. The image is the strongest-priced home there with a full gallery,
// preferring one not already used higher on the page.
function markets(exclude = new Set()) {
  const groups = {};
  for (const p of forSale) (groups[`${p.city}|${p.province}`] ??= []).push(p);
  return Object.entries(groups)
    .filter(([, ps]) => ps.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || Math.max(...b[1].map((p) => p.priceZAR || 0)) - Math.max(...a[1].map((p) => p.priceZAR || 0)))
    .map(([key, ps]) => {
      const [city, province] = key.split("|");
      const prices = ps.map((p) => p.priceZAR).filter(Boolean).sort((x, y) => x - y);
      const usable = ps.filter((p) => media[p.slug].images.length >= 4 && !media[p.slug].posterOnly).sort((x, y) => (y.priceZAR || 0) - (x.priceZAR || 0));
      const img = usable.find((p) => !exclude.has(p.slug)) || usable[0] || ps[0];
      exclude.add(img.slug);
      const places = [...new Set(ps.map((p) => p.estate || p.suburb).filter((x) => x && x !== city))];
      return { city, province, count: ps.length, lo: prices[0], hi: prices[prices.length - 1], img, places };
    });
}
function marketTile(mk, i, sizes) {
  const href = u(`properties/?city=${encodeURIComponent(mk.city)}`);
  return `<article class="market market--${i} reveal">
    <a class="market__img" href="${href}" tabindex="-1" aria-hidden="true">${picture(mk.img, media[mk.img.slug], 0, { sizes, alt: "" })}</a>
    <div class="market__body">
      <p class="market__prov">${esc(mk.province)}</p>
      <h3 class="market__name"><a href="${href}">${esc(mk.city)}</a></h3>
      <p class="market__fig fig">${mk.count} homes for sale${mk.lo ? `<span>${esc(randShort(mk.lo))}${mk.hi !== mk.lo ? ` to ${esc(randShort(mk.hi))}` : ""}</span>` : ""}</p>
      ${mk.places.length ? `<p class="market__places">${esc(mk.places.slice(0, 4).join(", "))}${mk.places.length > 4 ? ` and ${mk.places.length - 4} more` : ""}</p>` : ""}
    </div>
  </article>`;
}
function marketsSection(list, { heading = "Explore markets", id = "mk-h", lede = true } = {}) {
  const sizes = ["(min-width: 900px) 56vw, 100vw", "(min-width: 900px) 38vw, 100vw", "(min-width: 900px) 38vw, 100vw", "(min-width: 900px) 56vw, 100vw"];
  return `<section class="section" aria-labelledby="${id}">
  <div class="wrap">
    <div class="section-head"><h2 class="h2" id="${id}">${esc(heading)}</h2>${lede ? `<p class="body-copy">Where the current homes are, from the busiest markets down. Prices are the range of asking prices on the site today.</p>` : ""}</div>
    <div class="markets">${list.map((mk, i) => marketTile(mk, i, sizes[i] || "(min-width: 900px) 24vw, (min-width: 560px) 45vw, 100vw")).join("")}</div>
    <div class="section-foot"><a class="textlink" href="${u("locations/")}">Every province, city and estate ${icon("arrow-right")}</a></div>
  </div>
</section>`;
}

// ============================ HOME ============================
function home() {
  const hero = bySlug[HP.hero];
  const curated = HP.curated.map((s) => bySlug[s]);
  const dos = bySlug[HP.dossier];
  const band = bySlug[HP.band];
  const used = new Set([hero.slug, dos.slug, band.slug, ...HP.curated]);
  const mks = markets(used);
  const provCount = new Set(forSale.map((p) => p.province)).size;
  const prices = forSale.map((p) => p.priceZAR).filter(Boolean).sort((a, b) => a - b);
  const dSpecs = specItems(dos, { long: true }).slice(0, 5).map(([v, k]) => `<div><span class="spec__v">${esc(v)}</span><span class="spec__k">${esc(k)}</span></div>`).join("");
  const [f1, f2] = HP.dossierFrames || [1, 2];
  const dosFeatures = dos.features.filter((f) => f.length < 40).slice(0, 5).map((f) => f.charAt(0).toLowerCase() + f.slice(1));
  const cardAt = (p, cls, sizes) => `<div class="${cls} reveal">${card(p, media[p.slug], { sizes })}</div>`;
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
      <p class="issue">${forSale.length} homes for sale in ${new Set(forSale.map((q) => q.province)).size} provinces</p>
      <h1 class="display" id="hero-h">South Africa’s notable homes, for sale.</h1>
      <p class="lede">A national property publication. Explore residences on the market today and speak directly to the agents marketing them.</p>
      <div class="hero__actions"><a class="btn btn--primary" href="${u("properties/")}">Explore properties ${icon("arrow-right")}</a></div>
    </div>
  </div>
  <figure class="hero__figure">
    ${picture(hero, media[hero.slug], 0, { sizes: "(min-width: 900px) 58vw, 100vw", eager: true, alt: `${hero.title}, ${place(hero)}` })}
  </figure>
</section>

<section class="finder" aria-labelledby="find-h">
  <div class="wrap finder__in">
    <h2 class="finder__h" id="find-h">Search ${forSale.length} homes</h2>
    <form class="strip strip--home" action="${u("properties/")}" data-home-search>
      ${locPicker("home-loc")}
      ${selectCell("Price", "price", `<option value="">Any price</option>${homeBands().map(([lo, hi, l]) => `<option value="${lo || ""}-${hi || ""}">${l}</option>`).join("")}`)}
      ${selectCell("Bedrooms", "beds", `<option value="">Any</option>${BEDS.map((n) => `<option value="${n}">${n}+</option>`).join("")}`)}
      <button class="btn btn--primary strip__go" type="submit">Find a home ${icon("arrow-right")}</button>
    </form>
  </div>
</section>

<section class="section" aria-labelledby="cur-h">
  <div class="wrap">
    <div class="section-head section-head--row"><h2 class="h2" id="cur-h">Currently for sale</h2><a class="textlink" href="${u("properties/")}">All ${forSale.length} homes ${icon("arrow-right")}</a></div>
    <div class="curated">
      ${cardAt(curated[0], "curated__lead", "(min-width: 900px) 56vw, 100vw")}
      ${cardAt(curated[1], "curated__side", "(min-width: 900px) 38vw, 100vw")}
      ${cardAt(curated[2], "curated__side", "(min-width: 900px) 38vw, 100vw")}
      ${cardAt(curated[3], "curated__wide", "(min-width: 900px) 64vw, 100vw")}
      ${cardAt(curated[4], "curated__narrow", "(min-width: 900px) 30vw, 100vw")}
    </div>
  </div>
</section>

<section class="section--tight statement-wrap" aria-label="About Luxury Homes of SA">
  <div class="wrap statement">
    <p class="statement__text reveal">Luxury Homes of SA is a national property publication. We feature notable homes for sale across South Africa and connect buyers directly with the agents who market them.</p>
    <dl class="statement__facts">
      <div><dt class="fact__l">Homes for sale today</dt><dd class="fact__n num">${forSale.length}</dd></div>
      <div><dt class="fact__l">Provinces</dt><dd class="fact__n num">${provCount}</dd></div>
      <div><dt class="fact__l">Asking prices</dt><dd class="fact__n num">${esc(randShort(prices[0]))}<span class="fact__to">to</span>${esc(randShort(prices[prices.length - 1]))}</dd></div>
    </dl>
  </div>
</section>

<section class="section dossier-section" aria-labelledby="dos-h">
  <div class="wrap">
    <div class="dossier">
      <div class="dossier__panel reveal">
        <p class="label dossier__kicker">Featured residence</p>
        <h2 class="h2 dossier__title" id="dos-h">${esc(dos.title)}</h2>
        <p class="dossier__place">${esc(place(dos))}, ${esc(dos.province)}</p>
        <dl class="particulars-sheet">
          <div><dt>Asking price</dt><dd class="price">${esc(priceLabel(dos))}</dd></div>
          ${specItems(dos, { long: true }).map(([v, k]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
          ${dos.leviesZAR != null ? `<div><dt>Levies</dt><dd>${esc(rand(dos.leviesZAR))}</dd></div>` : ""}
        </dl>
        <p class="dossier__story">${esc(dos.highlights[0] || dos.description.split("\n")[0])}.${dosFeatures.length ? ` Also ${esc(dosFeatures.join(", "))}.` : ""}</p>
        <div><a class="btn btn--ink" href="${u(`properties/${dos.slug}/`)}">View property ${icon("arrow-right")}</a></div>
      </div>
      <a class="dossier__img" href="${u(`properties/${dos.slug}/`)}" tabindex="-1" aria-hidden="true">${picture(dos, media[dos.slug], 0, { sizes: "(min-width: 900px) 50vw, 100vw", alt: "" })}</a>
      <div class="dossier__strip">
        <figure class="dossier__sub">${picture(dos, media[dos.slug], f1, { sizes: "(min-width: 900px) 16vw, 50vw", alt: `${dos.title}: photograph ${f1 + 1}` })}</figure>
        <figure class="dossier__sub">${picture(dos, media[dos.slug], f2, { sizes: "(min-width: 900px) 16vw, 50vw", alt: `${dos.title}: photograph ${f2 + 1}` })}</figure>
      </div>
    </div>
  </div>
</section>

${marketsSection(mks)}

<section class="section" aria-labelledby="list-h">
  <div class="wrap band">
    <figure class="band__img" style="margin:0">${picture(band, media[band.slug], 0, { sizes: "(min-width: 900px) 52vw, 100vw", alt: `${band.title}, ${place(band)}` })}</figure>
    <div class="band__text reveal">
      <h2 class="h2" id="list-h">Marketing a notable home?</h2>
      <p class="body-copy">Luxury Homes of SA features homes for sale from estate agents and developers across the country, credited to the agent who markets them.</p>
      <a class="btn btn--line" href="${u("collaborate/")}">Feature a property</a>
    </div>
  </div>
</section>

${closing()}
<script type="application/json" id="home-search-data">${JSON.stringify({ tree: LOC.current, total: forSale.length }).replace(/</g, "\\u003c")}</script>`;
  write("index.html", layout({ title: "", description: `${forSale.length} notable homes for sale across South Africa, featured by Luxury Homes of SA. Asking prices, particulars and direct contact with the marketing agent.`, path: "", body, image: heroImg(hero), scripts: ["location.js"] }));
}

// Homepage budget bands, offered only where current inventory exists.
function homeBands() {
  return [[null, 5e6, "Up to R5m"], [5e6, 10e6, "R5m to R10m"], [10e6, 20e6, "R10m to R20m"], [20e6, null, "R20m and above"]]
    .filter(([lo, hi]) => forSale.some((p) => p.priceZAR && (!lo || p.priceZAR >= lo) && (!hi || p.priceZAR <= hi)));
}

function closing(heading = "Looking for something specific?") {
  return `<section class="closing section" aria-labelledby="close-h">
  <div class="wrap closing__in">
    <div style="display:grid;gap:14px"><h2 class="h2" id="close-h">${esc(heading)}</h2><p class="lede">Tell us the area, your budget and what the home needs to have. We reply by email or Instagram message.</p></div>
    <div class="closing__actions"><a class="btn btn--primary" href="${u("contact/")}">Enquire</a><a class="btn btn--line-inverse" href="${BIZ.instagramUrl}" rel="noopener">${icon("instagram-logo")} Message on Instagram</a></div>
  </div>
</section>`;
}

// ============================ COLLECTION ============================
function indexRecord(p) {
  return {
    s: p.slug, t: tidy(p.title), pl: tidy(place(p)), pv: p.province, c: p.city, a: p.area, lp: placeKey(p), dv: p.development, ty: p.propertyType,
    pr: p.priceZAR, bd: p.bedrooms, ba: p.bathrooms, g: p.garages, pk: p.parking, fl: p.floorSizeM2, st: p.status, ls: p.lastSeenAt,
    f: FILTER_FEATURES.filter((k) => p.featureFlags[k]), ag: p.agent ? tidy(agents[p.agent].name) : null, ref: p.reference,
    w: media[p.slug].images[0].width, h: media[p.slug].images[0].height,
  };
}
// Location trees for both availability states: the default collection offers current locations only.
const LOC = { current: locationTree(forSale, props), all: locationTree(props, props) };
const typesIn = (list) => [...new Set(list.map((p) => p.propertyType))].sort();

// The picker trigger and its dialog. The list itself is rendered by public/js/location.js from the tree.
const locPicker = (id) => `<div class="loc" data-loc>
  <button class="cell cell--loc" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}" data-loc-open><span class="cell__k">Location</span><span class="cell__v" data-loc-label>All South Africa</span>${icon("caret-down")}</button>
  <div class="sheet sheet--pop loc__panel" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-t" hidden data-loc-panel>
    <div class="sheet__head"><div><p class="sheet__title" id="${id}-t">Location</p><p class="sheet__scope" data-loc-scope>Homes currently for sale</p></div><button class="iconbtn" type="button" data-pop-close>${icon("x", "Close location")}</button></div>
    <div class="loc__find" data-loc-findwrap><label class="sr-only" for="${id}-f">Find a location</label>${icon("magnifying-glass")}<input class="input" id="${id}-f" type="search" placeholder="Find a location" autocomplete="off" spellcheck="false" aria-controls="${id}-l" data-loc-find></div>
    <div class="sheet__body"><ul class="loc__list" id="${id}-l" role="listbox" aria-labelledby="${id}-t" data-loc-list></ul><p class="loc__none" role="status" data-loc-none hidden></p></div>
  </div>
</div>`;
const selectCell = (label, name, options) => `<label class="cell cell--select"><span class="cell__k">${label}</span><select class="cell__select" name="${name}">${options}</select></label>`;
const BEDS = [1, 2, 3, 4, 5, 6];

function collection() {
  const types = typesIn(forSale);
  // Price-range bounds come from the dataset (all priced homes), rounded outward to sensible figures.
  const priced = props.map((p) => p.priceZAR).filter(Boolean);
  const pLo = Math.floor(Math.min(...priced) / 100000) * 100000;
  const pHi = Math.ceil(Math.max(...priced) / 1e6) * 1e6;
  const opt = (v, l) => `<option value="${v}">${l}</option>`;
  const featureChecks = FILTER_FEATURES.map((k) => `<label class="check"><input type="checkbox" name="f" value="${k}"> ${FEATURE_LABELS[k]}</label>`).join("");
  const initial = forSale;
  const body = `
<div class="wrap" data-collection>
  <header class="phead">
    <nav aria-label="Breadcrumb"><ol class="crumbs meta"><li><a href="${u("")}">Home</a></li><li aria-current="page">Properties</li></ol></nav>
    <h1 class="display page-title">Properties for sale</h1>
    <p class="lede">Every home currently for sale on Luxury Homes of SA, with asking prices and particulars as published by the marketing agent.</p>
  </header>
  <div class="strip strip--collection" role="search" aria-label="Find a home">
    ${locPicker("loc-panel")}
    <div class="pop" data-price>
      <button class="cell" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="price-panel" data-price-open><span class="cell__k">Price</span><span class="cell__v" data-price-label>Any price</span>${icon("caret-down")}</button>
      <div class="sheet sheet--pop price__panel" id="price-panel" role="dialog" aria-modal="true" aria-labelledby="price-panel-t" tabindex="-1" hidden>
        <div class="sheet__head"><div><p class="sheet__title" id="price-panel-t">Asking price</p></div><button class="iconbtn" type="button" data-pop-close>${icon("x", "Close asking price")}</button></div>
        <div class="sheet__body">
          <fieldset class="price-range" data-price-range data-lo="${pLo}" data-hi="${pHi}"><legend class="sr-only">Asking price</legend>
            <div class="pair">
              <label class="field"><span>Minimum</span><input class="input num" name="pmin" inputmode="numeric" autocomplete="off" placeholder="${esc(rand(pLo))}" aria-describedby="price-help"></label>
              <label class="field"><span>Maximum</span><input class="input num" name="pmax" inputmode="numeric" autocomplete="off" placeholder="${esc(rand(pHi))}" aria-describedby="price-help"></label>
            </div>
            <div class="range" data-range>
              <div class="range__track" aria-hidden="true"><div class="range__fill" data-range-fill></div></div>
              <input class="range__input" type="range" min="0" max="1000" step="1" value="0" data-range-min aria-label="Minimum asking price">
              <input class="range__input" type="range" min="0" max="1000" step="1" value="1000" data-range-max aria-label="Maximum asking price">
            </div>
            <p class="note" id="price-help" aria-live="polite" data-price-help>Type an amount such as R5 000 000 or 5,000,000, or drag the handles.</p>
          </fieldset>
        </div>
        <div class="sheet__foot"><button class="btn btn--line" type="button" data-price-clear>Any price</button><button class="btn btn--ink" type="button" data-price-apply><span class="price__apply-m">Apply</span><span class="price__apply-d" data-apply-label>Show homes</span></button></div>
      </div>
    </div>
    ${selectCell("Bedrooms", "beds", opt("", "Any") + BEDS.map((n) => opt(n, n + "+")).join(""))}
    ${selectCell("Property type", "type", opt("", "Any type") + types.map((t) => opt(t, t)).join(""))}
    <button class="cell cell--more" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="filters" data-filters-open>${icon("sliders-horizontal")}<span>More filters</span><span class="cell__badge" data-filter-count></span></button>
    <button class="btn btn--ink strip__go" type="button" data-show>Show ${initial.length} homes</button>
  </div>
  <div class="sheet sheet--side filters" id="filters" role="dialog" aria-modal="true" aria-labelledby="filters-t" hidden data-filters>
    <div class="sheet__head"><div><p class="sheet__title" id="filters-t">More filters</p></div><button class="iconbtn" type="button" data-pop-close>${icon("x", "Close filters")}</button></div>
    <div class="sheet__body filters__body">
      <fieldset><legend>Availability</legend>
        <label class="check"><input type="radio" name="avail" value="current" checked> Currently for sale</label>
        <label class="check"><input type="radio" name="avail" value="all"> Include availability to be confirmed</label>
      </fieldset>
      <div class="pair">
        <label class="field"><span>Bathrooms</span><select class="select" name="baths"><option value="">Any</option>${[1, 2, 3, 4, 5].map((n) => opt(n, n + "+")).join("")}</select></label>
        <label class="field"><span>Garages</span><select class="select" name="garages"><option value="">Any</option>${[1, 2, 3, 4].map((n) => opt(n, n + "+")).join("")}</select></label>
      </div>
      <fieldset><legend>Features</legend>${featureChecks}</fieldset>
      <p class="note">Features are filtered on what the listing text states, not on photographs.</p>
    </div>
    <div class="sheet__foot"><button class="btn btn--line" type="button" data-reset>Clear all</button><button class="btn btn--ink" type="button" data-pop-close><span data-apply-label>Show homes</span></button></div>
  </div>
  <div class="chips" data-chips aria-label="Active filters" hidden></div>
  <div class="results-head">
    <h2 class="results-count" id="res-h" aria-live="polite" tabindex="-1" data-count>${initial.length} homes currently for sale</h2>
    <form class="results-tools" role="search" aria-label="Property, agent or reference" onsubmit="return false">
      <label class="field field--inline keyword"><span>Property, agent or reference</span><span class="keyword__in">${icon("magnifying-glass")}<input class="input" type="search" name="q" autocomplete="off" placeholder="e.g. hangar or Jacqui"></span></label>
      <label class="field field--inline sort-field"><span>Sort</span><select class="select" name="sort"><option value="rec">Recommended</option><option value="asc">Price: low to high</option><option value="desc">Price: high to low</option></select></label>
    </form>
  </div>
  <section class="collection" aria-labelledby="res-h">
    <div class="results" data-results>${initial.map((p, i) => card(p, media[p.slug], { eager: i < 2 })).join("")}</div>
  </section>
</div>
<script type="application/json" id="index-data">${JSON.stringify({
    base: cfg.BASE_PATH, items: props.map(indexRecord),
    trees: LOC, totals: { current: forSale.length, all: props.length }, types: { current: types, all: typesIn(props) },
  }).replace(/</g, "\\u003c")}</script>`;
  write("properties/index.html", layout({ title: "Properties for sale", description: `Search ${forSale.length} homes for sale across South Africa by location, price, bedrooms and property type.`, path: "properties/", body, scripts: ["location.js", "properties.js"] }));
}

// ============================ PROPERTY ============================
const NUMW = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
// A factual Luxury Homes of SA standfirst assembled only from published particulars.
function standfirst(p) {
  const type = { House: "home", Cluster: "cluster home", Apartment: "apartment", Penthouse: "penthouse", Farm: "farm" }[p.propertyType] || "home";
  const beds = p.bedrooms ? `${NUMW[p.bedrooms] || p.bedrooms}-bedroom ` : "";
  const where = [p.estate || p.suburb, p.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
  const lead = `A ${beds}${type} in ${where}`.replace(/^A (?=(?!one)[aeio])/i, "An ");
  const size = p.floorSizeM2 && p.erfSizeM2 ? `, with ${m2(p.floorSizeM2)} under roof on a ${m2(p.erfSizeM2)} erf` : p.erfSizeM2 ? `, on a ${m2(p.erfSizeM2)} erf` : p.floorSizeM2 ? `, with ${m2(p.floorSizeM2)} under roof` : "";
  const hl = p.highlights.find((h) => h.length < 120 && !/\bprice\b|\bvat\b|transfer duty|furnish|available|p\/m/i.test(h));
  const tail = hl ? ` ${hl.charAt(0).toUpperCase() + hl.slice(1).replace(/\.$/, "")}.` : "";
  return `${lead}${size}.${tail}`;
}

function propertyPage(p) {
  const m = media[p.slug];
  const n = m.images.length;
  const c = contactFor(p);
  const a = c.a;
  const forSaleNow = p.status === "for-sale";
  const crumbs = [["", "Home"], ["properties/", "Properties"], [`properties/?province=${encodeURIComponent(p.province)}`, p.province], [`properties/?city=${encodeURIComponent(p.city)}`, p.city]];
  const subject = `Enquiry: ${tidy(p.title)}, ${tidy(place(p))} (ref ${p.reference})`;
  const long = specItems(p, { long: true });
  const keyspecs = long.map(([v, k]) => `<div><span class="spec__v">${esc(v)}</span><span class="spec__k">${esc(k)}</span></div>`).join("");
  const fx = p.fx && p.priceZAR ? `<p class="fx">As published ${fmtDate(p.fx.date)}: ${Object.entries(p.fx.asPublished).map(([k, v]) => `${{ USD: "US$", GBP: "£", EUR: "€" }[k]}${v.toLocaleString("en-US")}`).join(" / ")}. Indicative only.</p>` : "";
  const priceNote = p.priceNote ? `<p class="note">${esc(p.priceNote.replace(/ —.*$/, "").replace(/^Caption: /, "Published as: "))}</p>` : "";
  const history = p.priceHistory.length > 1 ? `<p class="note">Price history as published: ${p.priceHistory.map((h) => `${rand(h.priceZAR)} (${fmtDate(h.date)})`).join(", then ")}.</p>` : "";
  const fullPlace = [p.estate, p.suburb, p.city, p.province].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");

  // ---- gallery: desktop opening mosaic, mobile swipe (one gallery per breakpoint) ----
  const tile = (i, cls, sizes) => `<button class="gallery__item ${cls}" type="button" data-open="${i}" aria-label="Open photograph ${i + 1} of ${n} full screen">${picture(p, m, i, { sizes, eager: i === 0 })}</button>`;
  const allBtn = `<button class="btn btn--ink gallery__all" type="button" data-open="0">${icon("images")} All ${n} photographs</button>`;
  const mosaic = n >= 5
    ? `<div class="gallery gallery--five">${tile(0, "gallery__item--lead", "(min-width: 760px) 58vw, 100vw")}${[1, 2, 3, 4].map((i) => tile(i, "", "(min-width: 760px) 20vw, 50vw")).join("")}${allBtn}</div>`
    : n >= 3
    ? `<div class="gallery">${tile(0, "gallery__item--lead", "(min-width: 760px) 64vw, 100vw")}${tile(1, "", "(min-width: 760px) 32vw, 100vw")}${tile(2, "", "(min-width: 760px) 32vw, 100vw")}${allBtn}</div>`
    : `<div class="gallery gallery--single">${tile(0, "gallery__item--lead", "(min-width: 760px) 1080px, 100vw")}</div>`;
  const swipe = `<div class="swipe"><div class="swipe__track" data-swipe tabindex="0" role="group" aria-label="Photographs, swipe to browse">${m.images.map((_, i) => `<button class="swipe__slide" type="button" data-open="${i}" aria-label="Open photograph ${i + 1} of ${n} full screen">${picture(p, m, i, { sizes: "100vw", eager: i === 0 })}</button>`).join("")}</div>${n > 1 ? `<span class="swipe__count fig" data-swipe-count>1 / ${n}</span>` : ""}</div>`;

  // ---- editorial photo sequence (desktop only; mobile already swipes every frame) ----
  const seqIdx = n >= 9 ? [5, 6, 7, 8].filter((i) => i < n) : [];
  const sequence = seqIdx.length ? `<div class="sequence">${seqIdx.map((i, k) => `<button class="sequence__item sequence__item--${k}" type="button" data-open="${i}" aria-label="Open photograph ${i + 1} of ${n} full screen">${picture(p, m, i, { sizes: k === 0 || k === 3 ? "(min-width: 900px) 60vw, 100vw" : "(min-width: 900px) 36vw, 100vw" })}</button>`).join("")}</div>` : "";

  // ---- attribution: concise, premium; the full source note lives in "Listing information" ----
  const attribution = c.kind === "lhosa"
    ? `<div class="attrib"><p class="label">Marketed by</p><p class="attrib__name">An estate agency</p>${p.sourceListingUrl ? `<p class="attrib__agency"><a class="link" href="${p.sourceListingUrl}" rel="noopener">View the agency listing</a></p>` : ""}<p class="attrib__by">Featured by Luxury Homes of SA</p><p class="attrib__note">Enquiries are connected with the agent marketing the home.</p></div>`
    : `<div class="attrib"><p class="label">Marketed by</p><p class="attrib__name">${esc(a.name)}</p>${a.agency ? `<p class="attrib__agency">${esc(a.agency)}</p>` : ""}<p class="attrib__by">Featured by Luxury Homes of SA</p></div>`;

  const contactList = c.kind === "agent"
    ? `<ul class="contact-lines">${a.phone ? `<li><a href="${telHref(a.phone)}">${icon("phone")} ${esc(a.phone)}</a></li>` : ""}${a.email ? `<li><a href="mailto:${a.email}?subject=${encodeURIComponent(subject)}">${icon("envelope-simple")} ${esc(a.email)}</a> ${copyEmail(a.email)}</li>` : ""}${a.instagram[0] ? `<li><a href="https://www.instagram.com/${a.instagram[0]}/" rel="noopener">${icon("instagram-logo")} @${esc(a.instagram[0])}</a></li>` : ""}</ul>`
    : c.kind === "collab"
    ? `<ul class="contact-lines"><li><a href="https://www.instagram.com/${a.instagram[0]}/" rel="noopener">${icon("instagram-logo")} Message @${esc(a.instagram[0])}</a></li><li><a href="mailto:${BIZ.email}?subject=${encodeURIComponent(subject)}">${icon("envelope-simple")} ${esc(BIZ.email)}</a> ${copyEmail(BIZ.email)}</li></ul>`
    : `<ul class="contact-lines"><li><a href="mailto:${BIZ.email}?subject=${encodeURIComponent(subject)}">${icon("envelope-simple")} ${esc(BIZ.email)}</a> ${copyEmail(BIZ.email)}</li><li><a href="${BIZ.instagramUrl}" rel="noopener">${icon("instagram-logo")} Message @${BIZ.instagramHandle}</a></li></ul>`;

  const primary = forSaleNow
    ? `<a class="btn btn--primary btn--block" href="#enquire" data-intent="viewing">Arrange a viewing</a>`
    : `<a class="btn btn--primary btn--block" href="#enquire" data-intent="details">Check availability</a>`;
  const secondary = c.phone
    ? `<a class="btn btn--line btn--block" href="${telHref(c.phone)}">${icon("phone")} Call ${esc(a.name.split(" ")[0])}</a>`
    : c.kind === "lhosa"
    ? `<a class="btn btn--line btn--block" href="${BIZ.instagramUrl}" rel="noopener">${icon("instagram-logo")} Message on Instagram</a>`
    : c.kind === "collab"
    ? `<a class="btn btn--line btn--block" href="https://www.instagram.com/${a.instagram[0]}/" rel="noopener">${icon("instagram-logo")} Message ${esc(a.name.split(" ")[0])}</a>`
    : "";

  const flags = Object.entries(p.featureFlags).filter(([k, v]) => v && FEATURE_LABELS[k]).map(([k]) => FEATURE_LABELS[k]);
  const hl = new Set(p.highlights.map((h) => h.toLowerCase()));
  const featureItems = (p.features.length ? p.features : flags).filter((f) => !hl.has(f.toLowerCase()));
  const fin = [["Asking price", priceLabel(p)], ["Rates and taxes", p.ratesZAR != null ? rand(p.ratesZAR) : null], ["Levies", p.leviesZAR != null ? rand(p.leviesZAR) : null]]
    .filter(([, v]) => v).map(([k, v]) => `<div><span class="spec__v">${esc(v)}</span><span class="spec__k">${esc(k)}</span></div>`).join("");
  const taxNotes = [p.featureFlags.noTransferDuty ? "The listing states that no transfer duty is payable." : null, /includes VAT/i.test(p.highlights.join(" ")) ? "The listing states that the price includes VAT." : null].filter(Boolean);
  const missingFin = [p.ratesZAR == null ? "rates" : null, p.leviesZAR == null ? "levies" : null].filter(Boolean);

  const related = props.filter((q) => q.slug !== p.slug && q.status === "for-sale" && (q.city === p.city || q.province === p.province))
    .sort((x, y) => (y.city === p.city) - (x.city === p.city) || Math.abs((x.priceZAR || 0) - (p.priceZAR || 0)) - Math.abs((y.priceZAR || 0) - (p.priceZAR || 0))).slice(0, 3);

  const sourceNote = c.kind === "lhosa"
    ? `This home is marketed by an estate agency. Luxury Homes of SA features it and does not hold the mandate; enquiries are passed to the listing agent.${p.sourceListingUrl ? ` <a class="link" href="${p.sourceListingUrl}" rel="noopener">View the agency listing</a>.` : ""}`
    : `Marketed by ${esc(a.name)}${a.agency ? ` of ${esc(a.agency)}` : ""} and featured by Luxury Homes of SA in collaboration. Luxury Homes of SA does not hold the mandate.`;

  const body = `
<div class="wrap">
  <nav aria-label="Breadcrumb" class="crumbs-wrap"><ol class="crumbs">${crumbs.map(([h, l]) => `<li><a href="${u(h)}">${esc(l)}</a></li>`).join("")}<li aria-current="page">${esc(placeShort(p))}</li></ol></nav>
  ${mosaic}${swipe}

  <div class="particulars">
    <div class="particulars__main">
      <p class="particulars__place">${esc(fullPlace)}</p>
      <h1 class="display property-title">${esc(p.title)}</h1>
      <div class="priceline">
        <div class="priceblock"><span class="label">${p.priceZAR ? "Asking price" : "Price"}</span><span class="price">${esc(priceLabel(p))}</span></div>
        ${forSaleNow ? "" : `<p class="status-line"><span class="status status--unknown">Availability to be confirmed</span> Last featured ${fmtDate(p.lastSeenAt)}. Enquire to check it is still on the market.</p>`}
      </div>
      ${priceNote}
      <div class="keyspecs">${keyspecs}</div>
      <p class="particulars__by">${c.kind === "lhosa" ? "Marketed by an estate agency. Featured by Luxury Homes of SA." : `Marketed by ${esc(a.name)}${a.agency ? `, ${esc(a.agency)}` : ""}. Featured by Luxury Homes of SA.`}</p>
    </div>
    <aside class="aside" aria-label="Arrange a viewing">
      ${attribution}
      <div class="aside__actions">${primary}${secondary}</div>
      ${contactList}
    </aside>
  </div>

  <section class="story" aria-labelledby="story-h">
    <h2 class="sr-only" id="story-h">About the home</h2>
    <p class="story__lede">${esc(standfirst(p))}</p>
    ${p.description && p.description.length > 60 ? `<div class="story__body"><p class="label story__src">From the listing</p>${p.description.split(/\n{2,}/).map((para) => `<p>${esc(para.replace(/\n/g, " "))}</p>`).join("")}</div>` : ""}
  </section>

  ${sequence ? `<section class="detail-section detail-section--wide" aria-label="Photographs">${sequence}<p><button class="textlink textlink--button" type="button" data-open="0">${icon("images")} View all ${n} photographs</button></p></section>` : ""}

  ${p.highlights.length || featureItems.length ? `<section class="detail-section" aria-labelledby="feat-h"><h2 id="feat-h">Features</h2><div>
    ${p.highlights.length ? `<ul class="highlights">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
    <ul class="feature-list">${featureItems.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
  </div></section>` : ""}

  ${m.video ? `<section class="detail-section" aria-labelledby="film-h"><h2 id="film-h">Property film</h2><div class="film-wrap">
    <div class="film"><video controls preload="none" playsinline poster="${u(`images/properties/${p.slug}/01-720.webp`)}" aria-label="Property film for ${esc(p.title)}"><source src="${u(m.video)}" type="video/mp4"></video></div>
    <p class="note">As published on Instagram. Plays only when you press play.</p>
  </div></section>` : ""}

  <section class="detail-section" aria-labelledby="fin-h"><h2 id="fin-h">Financials</h2><div>
    <div class="fin">${fin}</div>
    ${fx ? fx.replace('class="fx"', 'class="fx" style="margin-top:16px"') : ""}
    ${taxNotes.length ? `<p class="note" style="margin-top:12px">${taxNotes.join(" ")}</p>` : ""}
    ${missingFin.length ? `<p class="note" style="margin-top:12px">${missingFin.join(" and ").replace(/^./, (x) => x.toUpperCase())} not published; ask the agent.</p>` : `<p class="note" style="margin-top:12px">Rates and levies as published by the agent.</p>`}
    ${history}
    ${p.priceZAR && forSaleNow ? `<details class="calc" data-calc data-price="${p.priceZAR}"><summary>Illustrative bond repayment</summary>
      <div class="calc__grid">
        <label class="field"><span>Purchase price (R)</span><input class="input num" name="price" inputmode="numeric" value="${p.priceZAR}"></label>
        <label class="field"><span>Deposit (R)</span><input class="input num" name="deposit" inputmode="numeric" value="${Math.round(p.priceZAR * 0.1)}"></label>
        <label class="field"><span>Example interest rate (% a year)</span><input class="input num" name="rate" inputmode="decimal" value="11.25"></label>
        <label class="field"><span>Term (years)</span><input class="input num" name="years" inputmode="numeric" value="20"></label>
      </div>
      <div class="calc__out"><span class="spec__k">Estimated monthly repayment</span><output name="result" aria-live="polite">R0</output>
      <p class="note">An illustration using standard amortisation. The rate is an editable example, not a quoted or current rate. Not a bond quote or finance offer; excludes transfer costs, bond fees and insurance.</p></div>
    </details>` : ""}
  </div></section>

  <section class="detail-section" aria-labelledby="loc-h"><h2 id="loc-h">Location</h2><div style="display:grid;gap:14px">
    <p class="body-copy">${esc([p.estate, p.suburb && p.suburb !== p.estate ? p.suburb : null, p.area && p.area !== p.city ? p.area : null, p.city, p.province].filter(Boolean).join(", "))}. The street address is shared by the agent on enquiry.</p>
    <p><a class="textlink" href="${u(`properties/?city=${encodeURIComponent(p.city)}`)}">More homes for sale in ${esc(p.city)} ${icon("arrow-right")}</a></p>
  </div></section>

  <section class="detail-section enquire" id="enquire" aria-labelledby="enq-h"><div><h2 id="enq-h">${forSaleNow ? "Arrange a viewing" : "Check availability"}</h2><p class="enquire__to">${c.kind === "agent" && a.email ? `Your message goes to ${esc(a.name)}${a.agency ? `, ${esc(a.agency)}` : ""}.` : c.kind === "agent" ? `Call ${esc(a.name)} directly, or send your message to Luxury Homes of SA to pass on.` : "Your message goes to Luxury Homes of SA, who connect you with the listing agent."}</p></div>
    <form class="form" data-enquiry data-to="${esc(c.email)}" data-subject="${esc(subject)}" novalidate>
      <fieldset class="radios"><legend class="sr-only">I would like to</legend>
        <label class="check"><input type="radio" name="intent" value="Arrange a viewing"${forSaleNow ? " checked" : ""}> Arrange a viewing</label>
        <label class="check"><input type="radio" name="intent" value="Request more details"${forSaleNow ? "" : " checked"}> ${forSaleNow ? "Request details" : "Check availability and details"}</label>
      </fieldset>
      <div class="row"><label class="field"><span>Name</span><input class="input" name="name" autocomplete="name" required></label>
      <label class="field"><span>Phone (optional)</span><input class="input" name="phone" type="tel" autocomplete="tel"></label></div>
      <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>Message (optional)</span><textarea class="input" name="message"></textarea></label>
      <p class="form__error" data-error hidden></p>
      <div class="form__actions"><button class="btn btn--primary" type="submit">Email your enquiry</button>${copyEmail(c.email)}</div>
      <p class="form__help">Opens your email app, addressed to ${esc(c.email)}. No email app? Copy the address instead.</p>
    </form>
  </section>

  <details class="listing-info">
    <summary>Listing information</summary>
    <div class="listing-info__body">
      <p>${sourceNote}</p>
      ${p.headline && p.headline !== p.description.split("\n")[0] ? `<p>Listing headline: “${esc(p.headline)}”</p>` : ""}
      <p>${p.instagramPosts.length > 1 ? `First featured ${fmtDate(p.firstSeenAt)}, most recently ${fmtDate(p.lastSeenAt)}` : `Featured ${fmtDate(p.lastSeenAt)}`} on Instagram: ${[...p.instagramPosts].reverse().map((ip, i) => `<a class="link" href="${ip.url}" rel="noopener">post ${i + 1}</a>`).join(", ")}. Details are as published by the marketing agent; confirm them before making an offer.</p>
    </div>
  </details>
</div>

${related.length ? `<section class="section related" aria-labelledby="rel-h"><div class="wrap"><div class="section-head section-head--row"><h2 class="h2" id="rel-h">More in ${esc(related.every((r) => r.city === p.city) ? p.city : p.province)}</h2><a class="textlink" href="${u(`properties/?province=${encodeURIComponent(p.province)}`)}">All in ${esc(p.province)} ${icon("arrow-right")}</a></div><div class="results results--three">${related.map((r) => card(r, media[r.slug])).join("")}</div></div></section>` : ""}

<div class="stickybar" data-stickybar><span><span class="price">${esc(priceLabel(p))}</span><br><span class="stickybar__place">${esc(placeShort(p))}</span></span><a class="btn btn--primary" href="#enquire">${forSaleNow ? "Arrange a viewing" : "Check availability"}</a></div>

<div class="lightbox" data-lightbox role="dialog" aria-modal="true" aria-label="Photographs of ${esc(p.title)}" hidden>
  <div class="lightbox__bar"><span class="fig" style="color:#b9beba" data-lb-count></span><button class="iconbtn" type="button" data-lb-close>${icon("x", "Close photographs")}</button></div>
  <div class="lightbox__stage" data-lb-stage><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-lb-img><button class="lightbox__nav lightbox__nav--prev" type="button" data-lb-prev>${icon("arrow-left", "Previous photograph")}</button><button class="lightbox__nav lightbox__nav--next" type="button" data-lb-next>${icon("arrow-right", "Next photograph")}</button></div>
  <p class="lightbox__foot">${esc(p.title)}, ${esc(place(p))}</p>
</div>
<script type="application/json" id="gallery-data">${JSON.stringify(m.images.map((f) => ({ src: u(`images/properties/${p.slug}/${f.n}-1080.webp`), w: Math.min(1080, f.width), h: Math.round((Math.min(1080, f.width) / f.width) * f.height) })))}</script>`;
  write(`properties/${p.slug}/index.html`, layout({
    title: `${p.title}, ${place(p)}`,
    description: tidy(`${p.propertyType}${forSaleNow ? " for sale" : ""} in ${place(p)}, ${p.province}. ${priceLabel(p)}. ${specItems(p, { long: true }).map(([v, k]) => `${v} ${k.toLowerCase()}`).join(", ")}.`).replace(/\s+/g, " "),
    path: `properties/${p.slug}/`, body, image: heroImg(p), bodyClass: "has-stickybar", scripts: ["property.js"],
  }));
}

// ============================ LOCATIONS ============================
// The register is the same inventory tree the location picker uses: every province, city, district and
// estate/suburb is a direct link into the collection, and nothing with zero current homes is listed.
// Locations that exist only in unconfirmed inventory sit in a clearly secondary block.
function locations() {
  const count = (n, word = "for sale") => `<span class="loc-n num">${n}<span class="sr-only"> ${n === 1 ? "home" : "homes"} ${word}</span></span>`;
  const leaf = (x) => `<li><a href="${locHref(x)}"><span>${esc(x.v)}</span>${count(x.n)}</a></li>`;
  const provs = LOC.current.map((pv) => {
    const id = "pv-" + pv.v.replace(/\W+/g, "-");
    return `
  <section class="loc-prov" aria-labelledby="${id}">
    <div class="loc-prov__head"><h2 class="h2" id="${id}"><a href="${locHref(pv)}">${esc(pv.v)}</a></h2><p class="meta">${pv.n} ${pv.n === 1 ? "home" : "homes"} for sale</p></div>
    <div class="loc-cities">${pv.kids.map((c) => `
      <div class="loc-city"><h3><a href="${locHref(c)}"><span>${esc(c.v)}</span>${count(c.n)}</a></h3>
      ${c.kids.length ? `<ul>${c.kids.map((k) => k.k === "area" ? `<li class="loc-area"><a href="${locHref(k)}"><span>${esc(k.v)}</span>${count(k.n)}</a><ul>${k.kids.map(leaf).join("")}</ul></li>` : leaf(k)).join("")}</ul>` : ""}</div>`).join("")}
    </div>
  </section>`;
  }).join("");
  // Unconfirmed-only view: count homes awaiting confirmation per city, linked to the collection including them.
  const unconfirmed = locationTree(props.filter((p) => p.status !== "for-sale"), props);
  const toConfirm = props.length - forSale.length;
  const later = unconfirmed.map((pv) => `<div class="loc-later__prov"><h3 class="loc-later__h">${esc(pv.v)}</h3><ul>${pv.kids.map((c) => `<li><a href="${locHref(c, "&avail=all")}"><span>${esc(c.v)}</span><span class="loc-n num">${c.n}<span class="sr-only"> to be confirmed</span></span></a></li>`).join("")}</ul></div>`).join("");
  const body = `<div class="wrap"><header class="phead"><nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="${u("")}">Home</a></li><li aria-current="page">Locations</li></ol></nav>
  <h1 class="display page-title">Locations</h1><p class="lede">Where the homes currently for sale are, by market, province, city and estate. Every place listed has at least one home for sale today.</p></header></div>
  ${marketsSection(markets(), { heading: "Markets", id: "mkt-h", lede: false }).replace(/<div class="section-foot">[\s\S]*?<\/div>\n  <\/div>\n<\/section>$/, "</div>\n</section>")}
  <div class="wrap"><div class="section-head"><h2 class="h2">Every province, city and estate</h2><p class="body-copy">Choose any level: a province, a city, a district such as Sandton, or a single estate or suburb. Figures are homes currently for sale.</p></div>
  <div class="loc-tree">${provs}</div>
  <section class="loc-later" aria-labelledby="later-h">
    <div class="loc-later__intro"><h2 class="h3" id="later-h">Availability to be confirmed</h2><p class="note">A further ${toConfirm} homes featured earlier in the year are awaiting confirmation that they are still on the market. Figures are those homes only; each link opens the collection including them, clearly marked.</p></div>
    <div class="loc-later__grid">${later}</div>
  </section></div>`;
  write("locations/index.html", layout({ title: "Locations", description: "Homes for sale across South Africa by market, province, city, district, suburb and estate.", path: "locations/", body }));
}

// ============================ CONTENT PAGES ============================
const pageHead = (title, lede, crumb = title) => `<header class="phead"><nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="${u("")}">Home</a></li><li aria-current="page">${esc(crumb)}</li></ol></nav>
  <h1 class="display page-title">${esc(title)}</h1>${lede ? `<p class="lede">${esc(lede)}</p>` : ""}</header>`;
const contactPair = (subject = "") => `<ul class="contact-lines contact-lines--large">
  <li><a href="mailto:${BIZ.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}">${icon("envelope-simple")} ${BIZ.email}</a> ${copyEmail(BIZ.email)}</li>
  <li><a href="${BIZ.instagramUrl}" rel="noopener">${icon("instagram-logo")} Message @${BIZ.instagramHandle} on Instagram</a></li>
</ul>`;
const photo = (slug, i = 0, sizes = "(min-width: 900px) 50vw, 100vw", cls = "") => {
  const p = bySlug[slug];
  return `<figure class="photo ${cls}">${picture(p, media[p.slug], i, { sizes, alt: `${p.title}, ${place(p)}` })}<figcaption><a href="${u(`properties/${p.slug}/`)}">${esc(placeShort(p))}, ${esc(p.city)}</a></figcaption></figure>`;
};

function about() {
  const provs = {};
  for (const p of forSale) provs[p.province] = (provs[p.province] || 0) + 1;
  const body = `<div class="wrap">
  ${pageHead("A national property publication.", "", "About")}
  <section class="split split--intro">
    <div class="split__text">
      <p class="statement__text statement__text--page">Luxury Homes of SA features notable homes for sale across South Africa, and connects buyers with the agents who market them.</p>
      <p class="body-copy">The homes are published on Instagram at @${BIZ.instagramHandle} and gathered here with their asking prices and particulars, exactly as the marketing agent published them.</p>
    </div>
    ${photo("baronetcy-panoramic-residence", 0, "(min-width: 900px) 50vw, 100vw", "photo--tall")}
  </section>

  <section class="pillars" aria-label="How Luxury Homes of SA works">
    <div class="pillar"><h2 class="h3">For buyers</h2><p class="body-copy">Browse homes that are on the market now. Where an agent is credited, you contact them directly from the property page. Otherwise send your enquiry to us and we put you in touch with the listing agent.</p><a class="textlink" href="${u("properties/")}">Explore properties ${icon("arrow-right")}</a></div>
    <div class="pillar"><h2 class="h3">For agents and developers</h2><p class="body-copy">Notable homes are featured in collaboration with the agent or developer marketing them, credited with their contact details.</p><a class="textlink" href="${u("collaborate/")}">Feature a property ${icon("arrow-right")}</a></div>
    <div class="pillar"><h2 class="h3">What we are not</h2><p class="body-copy">Luxury Homes of SA is not an estate agency and does not hold sales mandates. Prices and details are as published by the marketing agent; where a detail wasn’t published, we leave it out.</p></div>
  </section>

  <section class="gallery-pair" aria-label="Homes currently featured">
    ${photo("llandudno-elevated-residence", 0, "(min-width: 900px) 58vw, 100vw", "photo--wide")}
    ${photo("waterfall-equestrian-estate-residence", 0, "(min-width: 900px) 38vw, 100vw")}
  </section>

  <section class="prose" aria-labelledby="reach-h"><h2 id="reach-h">National reach</h2><div>
    <p class="body-copy">Homes currently for sale on the site are in ${Object.keys(provs).length} provinces.</p>
    <ul class="reach">${Object.entries(provs).sort((a, b) => b[1] - a[1]).map(([pv, nn]) => `<li><a href="${u(`properties/?province=${encodeURIComponent(pv)}`)}"><span>${esc(pv)}</span><span class="fig">${nn}</span></a></li>`).join("")}</ul>
  </div></section>

  <section class="prose" aria-labelledby="ab-c"><h2 id="ab-c">Contact</h2><div>${contactPair()}</div></section>
  </div>`;
  write("about/index.html", layout({ title: "About", description: "Luxury Homes of SA is a national property publication featuring notable South African homes for sale, in collaboration with the agents who market them.", path: "about/", body: body + closing() }));
}

function collaborate() {
  const subj = "Feature a property";
  const body = `<div class="wrap">
  ${pageHead("Feature a notable property.", "For estate agents, developers and property marketers with a notable South African home on the market.", "Collaborate")}
  <section class="split">
    ${photo("pinnacle-point-fairway-residence", 0, "(min-width: 900px) 50vw, 100vw")}
    <div class="split__text">
      <h2 class="h2">Let’s collaborate.</h2>
      <p class="body-copy">Homes on @${BIZ.instagramHandle} are published as collaborations with the agent or developer who markets them. Each feature carries the home’s photography and particulars and credits you by name, agency and contact details, so buyer enquiries reach you directly.</p>
      <p class="body-copy">Luxury Homes of SA is a publication, not an estate agency: the mandate stays with you. Terms for each feature are agreed directly with us.</p>
    </div>
  </section>

  <section class="reach-band" aria-label="Reach">
    <dl class="statement__facts statement__facts--flat">
      <div><dt class="fact__l">Instagram followers, ${fmtDate(BIZ.followersRetrievedAt)}</dt><dd class="fact__n num">${BIZ.followers.toLocaleString("en-ZA").replace(/\s/g, "\u00a0")}</dd></div>
      <div><dt class="fact__l">Homes currently for sale on the site</dt><dd class="fact__n num">${forSale.length}</dd></div>
      <div><dt class="fact__l">Provinces represented</dt><dd class="fact__n num">${new Set(forSale.map((q) => q.province)).size}</dd></div>
    </dl>
  </section>

  <section class="steps" aria-labelledby="send-h">
    <h2 class="h2" id="send-h">What to send</h2>
    <ol class="steps__list">
      <li><h3 class="h3">The particulars</h3><p class="body-copy">Asking price, suburb or estate, bedrooms, bathrooms and garages; floor and erf size, rates and levies if available.</p></li>
      <li><h3 class="h3">The photography</h3><p class="body-copy">Professional photographs you have the right to share, and any property film.</p></li>
      <li><h3 class="h3">The credit</h3><p class="body-copy">The agent’s name, agency, phone and email exactly as they should appear, and a link to the current agency listing.</p></li>
    </ol>
  </section>

  <section class="steps" aria-labelledby="next-h">
    <h2 class="h2" id="next-h">What happens next</h2>
    <ol class="steps__list">
      <li><h3 class="h3">You send the details</h3><p class="body-copy">By email or Instagram message, with the listing link.</p></li>
      <li><h3 class="h3">We agree the feature</h3><p class="body-copy">Luxury Homes of SA confirms the feature and its terms with you directly.</p></li>
      <li><h3 class="h3">The home is published</h3><p class="body-copy">On Instagram and on this site, credited to you, with enquiries routed to your contact details.</p></li>
    </ol>
  </section>

  <section class="section--tight" aria-labelledby="feat-now-h">
    <div class="section-head section-head--row"><h2 class="h2" id="feat-now-h">Featured in collaboration now</h2><a class="textlink" href="${u("properties/")}">All homes ${icon("arrow-right")}</a></div>
    <div class="results results--three">${forSale.filter((q) => q.provenance === "agent-collaboration" && media[q.slug].images.length >= 4 && !media[q.slug].posterOnly).slice(0, 3).map((q) => card(q, media[q.slug])).join("")}</div>
  </section>

  <section class="cta-panel" aria-labelledby="collab-c">
    <div><h2 class="h2" id="collab-c">Send the details</h2><p class="body-copy">Email with the subject “${subj}”, or send a message on Instagram.</p></div>
    <div class="cta-panel__actions"><a class="btn btn--primary" href="mailto:${BIZ.email}?subject=${encodeURIComponent(subj)}">${icon("envelope-simple")} Email the particulars</a><a class="btn btn--line" href="${BIZ.instagramUrl}" rel="noopener">${icon("instagram-logo")} Message on Instagram</a>${copyEmail(BIZ.email)}</div>
  </section>
  </div>`;
  write("collaborate/index.html", layout({ title: "Collaborate", description: "Feature a notable South African home for sale with Luxury Homes of SA, in collaboration with the marketing agent or developer.", path: "collaborate/", body }));
  // Old URL kept alive so earlier links still work.
  write("list-with-us/index.html", `<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><title>Collaborate | ${cfg.SITE_NAME}</title>${cfg.PROPOSAL_MODE ? '<meta name="robots" content="noindex, nofollow">' : ""}<link rel="canonical" href="${abs("collaborate/")}"><meta http-equiv="refresh" content="0; url=${u("collaborate/")}"></head><body><p><a href="${u("collaborate/")}">This page has moved to Collaborate.</a></p></body></html>`);
}

function contact() {
  const form = (to, subject, intent, messageLabel) => `<form class="form" data-enquiry data-to="${to}" data-subject="${esc(subject)}" novalidate>
      <input type="hidden" name="intent" value="${esc(intent)}">
      <div class="row"><label class="field"><span>Name</span><input class="input" name="name" autocomplete="name" required></label>
      <label class="field"><span>Phone (optional)</span><input class="input" name="phone" type="tel" autocomplete="tel"></label></div>
      <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>${esc(messageLabel)}</span><textarea class="input" name="message"></textarea></label>
      <p class="form__error" data-error hidden></p>
      <div class="form__actions"><button class="btn btn--primary" type="submit">Email your enquiry</button></div>
      <p class="form__help">Opens your email app, addressed to ${BIZ.email}.</p>
    </form>`;
  const body = `<div class="wrap">
  ${pageHead("Enquire", "We reply by email or Instagram message.")}
  <div class="audiences">
    <section class="audience" aria-labelledby="buy-h">
      <h2 class="h2" id="buy-h">I’m looking for a home.</h2>
      <p class="body-copy">Tell us the area, your budget and what the home needs to have. Asking about a specific property? The agent’s details are on its page.</p>
      ${form(BIZ.email, "Property search enquiry", "I am looking to buy", "Area, budget and requirements")}
    </section>
    <section class="audience audience--agent" aria-labelledby="agent-h">
      <h2 class="h2" id="agent-h">I’d like to feature a property.</h2>
      <p class="body-copy">Send the particulars, photography and agent credit.</p>
      <div class="cta-panel__actions"><a class="btn btn--ink" href="mailto:${BIZ.email}?subject=${encodeURIComponent("Feature a property")}">${icon("envelope-simple")} Email the particulars</a><a class="textlink" href="${u("collaborate/")}">What to send ${icon("arrow-right")}</a></div>
      ${photo("the-islands-waterfront-residence", 0, "(min-width: 900px) 40vw, 100vw")}
    </section>
  </div>
  <section class="prose" aria-labelledby="direct-h"><h2 id="direct-h">Direct</h2><div>${contactPair()}</div></section>
  </div>`;
  write("contact/index.html", layout({ title: "Enquire", description: "Contact Luxury Homes of SA by email or Instagram message: buyers looking for a home, and agents who would like a property featured.", path: "contact/", body: body + '<div style="height:80px"></div>' }));
}

function notFound() {
  const body = `<div class="wrap" style="padding-block:clamp(64px,10vw,140px);display:grid;gap:20px;justify-items:start">
  <p class="label">Page not found</p><h1 class="display page-title">This address doesn’t lead anywhere.</h1><p class="lede">The home may have been removed from the site, or the link is mistyped.</p>
  <div class="hero__actions"><a class="btn btn--primary" href="${u("properties/")}">Explore properties</a><a class="textlink" href="${u("")}">Home</a></div></div>`;
  write("404.html", layout({ title: "Page not found", description: "Page not found.", path: "404.html", body }));
}

// ============================ RUN ============================
home();
collection();
props.forEach(propertyPage);
locations();
about();
collaborate();
contact();
notFound();
writeFileSync(`${OUT}/robots.txt`, cfg.PROPOSAL_MODE ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${abs("sitemap.xml")}\n`);
if (!cfg.PROPOSAL_MODE) {
  const urls = ["", "properties/", "locations/", "about/", "collaborate/", "contact/", ...props.map((p) => `properties/${p.slug}/`)];
  writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((x) => `<url><loc>${abs(x)}</loc></url>`).join("")}</urlset>`);
}
writeFileSync(`${OUT}/.nojekyll`, "");
console.log(`built ${props.length} property pages + 7 pages into ${OUT}/ (PROPOSAL_MODE=${cfg.PROPOSAL_MODE})`);
