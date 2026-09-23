// Property collection: deterministic search, filters, sorting, URL state (back/forward safe), filter drawer.
(() => {
  const data = JSON.parse(document.getElementById("index-data").textContent);
  const BASE = data.base, items = data.items;
  const toolbar = document.querySelector("[data-toolbar]");
  const panel = document.querySelector("[data-filters]");
  const results = document.querySelector("[data-results]");
  const countEl = document.querySelector("[data-count]");
  const citySel = panel.querySelector('[name="city"]');
  const provSel = panel.querySelector('[name="province"]');
  const applyLabel = panel.querySelector("[data-apply-label]");
  const badge = document.querySelector("[data-filter-count]");
  const KEYS = ["q", "sort", "avail", "province", "city", "type", "pmin", "pmax", "beds", "baths", "garages"];

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const group = (n) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const rand = (n) => (n ? "R" + group(n) : "Price on request");
  // ---- price range: typed min/max + two-handle slider on a logarithmic scale ----
  const pr = panel.querySelector("[data-price-range]");
  const LO = +pr.dataset.lo, HI = +pr.dataset.hi, STEPS = 1000;
  const pminIn = panel.querySelector('[name="pmin"]'), pmaxIn = panel.querySelector('[name="pmax"]');
  const rMin = panel.querySelector("[data-range-min]"), rMax = panel.querySelector("[data-range-max]");
  const fill = panel.querySelector("[data-range-fill]");
  const MIN_GAP = 20; // slider positions kept between handles so they never overlap
  // Accepts "R5 000 000", "R5000000", "5,000,000", "5.5m", "750k"; returns a number or null.
  const parsePrice = (v) => {
    let t = String(v ?? "").toLowerCase().replace(/r|\s|,/g, "");
    if (!t) return null;
    let mult = 1;
    if (/m$/.test(t)) { mult = 1e6; t = t.slice(0, -1); } else if (/k$/.test(t)) { mult = 1e3; t = t.slice(0, -1); }
    const n = parseFloat(t);
    return Number.isFinite(n) && n > 0 ? Math.round(n * mult) : null;
  };
  const snap = (v) => { const step = v < 2e6 ? 50e3 : v < 10e6 ? 100e3 : v < 30e6 ? 250e3 : v < 100e6 ? 500e3 : 1e6; return Math.round(v / step) * step; };
  const toPos = (v) => Math.round((STEPS * Math.log(v / LO)) / Math.log(HI / LO));
  const toPrice = (pos) => (pos <= 0 ? LO : pos >= STEPS ? HI : Math.min(HI, Math.max(LO, snap(LO * Math.pow(HI / LO, pos / STEPS)))));
  const clampPrice = (v) => (v == null ? null : Math.min(HI, Math.max(LO, v)));
  function syncRange(min, max) {
    const a = min == null ? 0 : toPos(min), b = max == null ? STEPS : toPos(max);
    rMin.value = a; rMax.value = b;
    rMin.setAttribute("aria-valuetext", min == null ? "No minimum" : rand(min));
    rMax.setAttribute("aria-valuetext", max == null ? "No maximum" : rand(max));
    fill.style.left = (a / STEPS) * 100 + "%";
    fill.style.right = 100 - (b / STEPS) * 100 + "%";
    // keep the lower handle reachable when both sit at the top end
    rMin.style.zIndex = a > STEPS - 50 ? 3 : 1;
  }
  // Normalise typed values: clamp to dataset bounds; minimum can never exceed maximum.
  let swapped = false;
  const help = panel.querySelector("[data-price-help]");
  const HELP = help.textContent;
  function readPrices() {
    let min = clampPrice(parsePrice(pminIn.value)), max = clampPrice(parsePrice(pmaxIn.value));
    if (min === LO) min = null;
    if (max === HI) max = null;
    if (min != null && max != null && min > max) { [min, max] = [max, min]; swapped = true; }
    return [min, max];
  }
  function writePrices(min, max) {
    pminIn.value = min == null ? "" : rand(min);
    pmaxIn.value = max == null ? "" : rand(max);
    syncRange(min, max);
  }

  const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function citiesFor(prov) {
    const set = [...new Set(items.filter((i) => !prov || i.pv === prov).map((i) => i.c))].sort();
    const cur = citySel.value;
    citySel.innerHTML = '<option value="">All cities</option>' + set.map((c) => `<option>${esc(c)}</option>`).join("");
    citySel.value = set.includes(cur) ? cur : "";
  }

  function readState() {
    const s = {};
    const p = new URLSearchParams(location.search);
    KEYS.forEach((k) => (s[k] = p.get(k) || ""));
    s.f = p.getAll("f");
    return s;
  }
  function writeControls(s) {
    toolbar.elements.q.value = s.q;
    toolbar.elements.sort.value = s.sort || "rec";
    panel.querySelectorAll('[name="avail"]').forEach((r) => (r.checked = r.value === (s.avail || "current")));
    ["province", "type", "beds", "baths", "garages"].forEach((k) => (panel.querySelector(`[name="${k}"]`).value = s[k]));
    writePrices(clampPrice(parsePrice(s.pmin)), clampPrice(parsePrice(s.pmax)));
    // Accept a city even when no province is chosen (links from Locations / home).
    citiesFor(s.province);
    citySel.value = s.city;
    panel.querySelectorAll('[name="f"]').forEach((c) => (c.checked = s.f.includes(c.value)));
  }
  function collect() {
    const s = { q: toolbar.elements.q.value.trim(), sort: toolbar.elements.sort.value, avail: panel.querySelector('[name="avail"]:checked').value };
    ["province", "city", "type", "beds", "baths", "garages"].forEach((k) => (s[k] = panel.querySelector(`[name="${k}"]`).value));
    const [min, max] = readPrices();
    s.pmin = min == null ? "" : String(min);
    s.pmax = max == null ? "" : String(max);
    s.f = [...panel.querySelectorAll('[name="f"]:checked')].map((c) => c.value);
    return s;
  }
  function toQuery(s) {
    const p = new URLSearchParams();
    KEYS.forEach((k) => {
      if (!s[k]) return;
      if (k === "sort" && s[k] === "rec") return;
      if (k === "avail" && s[k] === "current") return;
      p.set(k, s[k]);
    });
    s.f.forEach((f) => p.append("f", f));
    const q = p.toString();
    return q ? "?" + q : location.pathname;
  }

  function match(i, s) {
    if (s.avail !== "all" && i.st !== "for-sale") return false;
    if (s.province && i.pv !== s.province) return false;
    if (s.city && i.c !== s.city) return false;
    if (s.type && i.ty !== s.type) return false;
    if (s.pmin && !(i.pr >= +s.pmin)) return false;
    if (s.pmax && !(i.pr && i.pr <= +s.pmax)) return false;
    if (s.beds && !(i.bd >= +s.beds)) return false;
    if (s.baths && !(i.ba >= +s.baths)) return false;
    if (s.garages && !(i.g >= +s.garages)) return false;
    if (s.f.length && !s.f.every((f) => i.f.includes(f))) return false;
    if (s.q) {
      const hay = norm([i.t, i.pl, i.pv, i.c, i.a, i.sb, i.e, i.ty, i.ag, i.ref].join(" "));
      if (!norm(s.q).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const sorters = {
    rec: (a, b) => (a.st === b.st ? 0 : a.st === "for-sale" ? -1 : 1) || b.ls.localeCompare(a.ls) || (b.pr || 0) - (a.pr || 0),
    asc: (a, b) => (a.pr == null) - (b.pr == null) || a.pr - b.pr,
    desc: (a, b) => (a.pr == null) - (b.pr == null) || b.pr - a.pr,
  };

  function card(i, idx) {
    const img = `${BASE}images/properties/${i.s}/01`;
    const h = Math.round((Math.min(1080, i.w) / i.w) * i.h);
    const specs = [
      i.bd != null && [i.bd, i.bd === 1 ? "bed" : "beds"],
      i.ba != null && [i.ba, i.ba === 1 ? "bath" : "baths"],
      i.g != null ? [i.g, i.g === 1 ? "garage" : "garages"] : i.pk != null && [i.pk, "parking"],
      i.fl != null && [group(i.fl) + " m²", ""],
    ].filter(Boolean).map(([v, k]) => `<li><b>${esc(v)}</b>${k ? " " + k : ""}</li>`).join("");
    return `<article class="card"><div class="card__img"><picture><source type="image/webp" srcset="${img}-480.webp 480w, ${img}-720.webp 720w, ${img}-1080.webp ${Math.min(1080, i.w)}w" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"><img src="${img}-1080.jpg" width="${Math.min(1080, i.w)}" height="${h}" alt="${esc(i.t)}, ${esc(i.pl)}" loading="${idx < 2 ? "eager" : "lazy"}" decoding="async"></picture>${i.st !== "for-sale" ? '<span class="status status--unknown">Availability to be confirmed</span>' : ""}</div>
<div class="card__body"><p class="card__place">${esc(i.pl)}</p><h3 class="card__title"><a href="${BASE}properties/${i.s}/">${esc(i.t)}</a></h3><div class="card__row"><span class="price card__price">${rand(i.pr)}</span><ul class="specs">${specs}</ul></div></div></article>`;
  }

  function activeCount(s) {
    return ["province", "city", "type", "pmin", "pmax", "beds", "baths", "garages"].filter((k) => s[k]).length + s.f.length + (s.avail === "all" ? 1 : 0);
  }

  // ---- active filter chips ----
  const chipsEl = document.querySelector("[data-chips]");
  const FEAT = Object.fromEntries([...panel.querySelectorAll('[name="f"]')].map((c) => [c.value, c.parentElement.textContent.trim()]));
  const x = '<svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor"><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></svg>';
  const short = (n) => (n >= 1e6 ? `R${+(n / 1e6).toFixed(n % 1e6 ? 2 : 0)}m` : `R${Math.round(n / 1e3)}k`);
  function chipList(s) {
    const c = [];
    if (s.q) c.push(["q", `“${s.q}”`]);
    if (s.avail === "all") c.push(["avail", "Including to be confirmed"]);
    if (s.province) c.push(["province", s.province]);
    if (s.city) c.push(["city", s.city]);
    if (s.type) c.push(["type", s.type]);
    if (s.pmin || s.pmax) c.push(["price", s.pmin && s.pmax ? `${short(+s.pmin)} to ${short(+s.pmax)}` : s.pmin ? `From ${short(+s.pmin)}` : `Up to ${short(+s.pmax)}`]);
    if (s.beds) c.push(["beds", `${s.beds}+ bedrooms`]);
    if (s.baths) c.push(["baths", `${s.baths}+ bathrooms`]);
    if (s.garages) c.push(["garages", `${s.garages}+ garages`]);
    s.f.forEach((f) => c.push(["f:" + f, FEAT[f] || f]));
    return c;
  }
  function renderChips(s) {
    const c = chipList(s);
    chipsEl.hidden = !c.length;
    chipsEl.innerHTML = c.map(([k, l]) => `<button class="chip" type="button" data-chip="${esc(k)}" aria-label="Remove filter: ${esc(l)}">${esc(l)}${x}</button>`).join("") + (c.length > 1 ? '<button class="chips__clear" type="button" data-reset>Clear all</button>' : "");
  }
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-chip]");
    if (!b) return;
    const k = b.dataset.chip;
    if (k === "q") toolbar.elements.q.value = "";
    else if (k === "avail") panel.querySelector('[name="avail"][value="current"]').checked = true;
    else if (k === "price") writePrices(null, null);
    else if (k.startsWith("f:")) panel.querySelector(`[name="f"][value="${k.slice(2)}"]`).checked = false;
    else { panel.querySelector(`[name="${k}"]`).value = ""; if (k === "province") citiesFor(""); }
    update();
    (chipsEl.querySelector("[data-chip]") || toolbar.elements.q).focus();
  });

  function render(s) {
    renderChips(s);
    const list = items.filter((i) => match(i, s)).sort(sorters[s.sort] || sorters.rec);
    const hidden = s.avail !== "all" ? items.filter((i) => i.st !== "for-sale" && match(i, { ...s, avail: "all" })).length : 0;
    countEl.textContent = `${list.length} ${list.length === 1 ? "home" : "homes"}${s.avail === "all" ? "" : " currently for sale"}`;
    applyLabel.textContent = `Show ${list.length} ${list.length === 1 ? "home" : "homes"}`;
    const n = activeCount(s);
    badge.textContent = n ? `(${n})` : "";
    results.innerHTML = list.length
      ? list.map(card).join("")
      : `<div class="empty"><p class="h3">No homes match these filters.</p><p class="body-copy">${hidden ? `${hidden} older ${hidden === 1 ? "feature matches" : "features match"} if you include homes whose availability is still to be confirmed.` : "Try a wider price range, fewer features or another area."}</p><div class="hero__actions">${hidden ? '<button class="btn btn--ink" type="button" data-include-all>Include to be confirmed</button>' : ""}<button class="btn btn--line" type="button" data-reset>Clear filters</button></div></div>`;
  }

  function update(push = true) {
    const s = collect();
    const q = toQuery(s);
    if (push && q !== location.search && !(q === location.pathname && !location.search)) history.pushState(null, "", q);
    render(s);
  }

  // events
  let t;
  toolbar.elements.q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => update(false) || history.replaceState(null, "", toQuery(collect())), 180); });
  toolbar.elements.sort.addEventListener("change", () => update());
  panel.addEventListener("change", (e) => {
    if (e.target === provSel) citiesFor(provSel.value);
    if (e.target === pminIn || e.target === pmaxIn) {
      swapped = false;
      const [a, b] = readPrices();
      writePrices(a, b);
      if (swapped) help.textContent = "The minimum was higher than the maximum, so the two were swapped.";
    }
    if (e.target === rMin || e.target === rMax) { /* committed below */ }
    update();
  });
  [pminIn, pmaxIn].forEach((el) => el.addEventListener("input", () => (help.textContent = HELP)));
  [pminIn, pmaxIn].forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el.blur(); el.dispatchEvent(new Event("change", { bubbles: true })); } }));
  // Slider drives from its own position (never re-derived from the snapped price), so single
  // arrow-key steps always move the handle even while the snapped price is still at a bound.
  const onSlide = (which) => {
    let a = +rMin.value, b = +rMax.value;
    if (b - a < MIN_GAP) { if (which === "min") a = rMin.value = Math.max(0, b - MIN_GAP); else b = rMax.value = Math.min(STEPS, a + MIN_GAP); }
    let min = a <= 0 ? null : toPrice(a), max = b >= STEPS ? null : toPrice(b);
    if (min != null && min <= LO) min = null;
    if (max != null && max >= HI) max = null;
    pminIn.value = min == null ? "" : rand(min);
    pmaxIn.value = max == null ? "" : rand(max);
    rMin.setAttribute("aria-valuetext", min == null ? "No minimum" : rand(min));
    rMax.setAttribute("aria-valuetext", max == null ? "No maximum" : rand(max));
    fill.style.left = (a / STEPS) * 100 + "%";
    fill.style.right = 100 - (b / STEPS) * 100 + "%";
    rMin.style.zIndex = a > STEPS - 50 ? 3 : 1;
    render(collect());
  };
  rMin.addEventListener("input", () => onSlide("min"));
  rMax.addEventListener("input", () => onSlide("max"));
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-reset]")) { history.pushState(null, "", location.pathname); writeControls(readState()); render(collect()); }
    if (e.target.closest("[data-include-all]")) { panel.querySelector('[name="avail"][value="all"]').checked = true; update(); }
  });
  window.addEventListener("popstate", () => { writeControls(readState()); render(collect()); });

  // mobile drawer
  const openBtn = document.querySelector("[data-filters-open]");
  let release = null;
  const close = () => { if (!panel.classList.contains("is-open")) return; panel.classList.remove("is-open"); openBtn.setAttribute("aria-expanded", "false"); release && release(); release = null; };
  openBtn.addEventListener("click", () => {
    panel.classList.add("is-open"); openBtn.setAttribute("aria-expanded", "true");
    release = window.lhTrap(panel, openBtn);
    panel.querySelector("[data-filters-close]").focus();
  });
  panel.querySelectorAll("[data-filters-close]").forEach((b) => b.addEventListener("click", close));
  panel.addEventListener("keydown", (e) => e.key === "Escape" && close());
  matchMedia("(min-width: 1025px)").addEventListener("change", (e) => e.matches && close());

  writeControls(readState());
  render(collect());
})();
