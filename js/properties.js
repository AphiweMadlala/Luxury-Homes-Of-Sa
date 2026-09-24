// Property collection: structured location + discovery strip, filters, sorting, URL state (back/forward safe).
// One location state (province | city | area | place) comes from the inventory-backed picker; the keyword
// field searches property, agent and reference only.
(() => {
  const data = JSON.parse(document.getElementById("index-data").textContent);
  const BASE = data.base, items = data.items;
  const root = document.querySelector("[data-collection]");
  const $ = (sel) => root.querySelector(sel);
  const field = (name) => root.querySelector(`[name="${name}"]`);
  const results = $("[data-results]");
  const countEl = $("[data-count]");
  const applyLabels = root.querySelectorAll("[data-apply-label]");
  const showBtn = $("[data-show]");
  const badge = $("[data-filter-count]");
  const typeSel = field("type");
  const LOC_KEYS = ["province", "city", "area", "place"];
  const KEYS = [...LOC_KEYS, "type", "pmin", "pmax", "beds", "baths", "garages", "avail", "q", "sort"];

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const group = (n) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const rand = (n) => (n ? "R" + group(n) : "Price on request");
  const short = (n) => (n >= 1e6 ? `R${+(n / 1e6).toFixed(n % 1e6 ? 2 : 0)}m` : `R${Math.round(n / 1e3)}k`);
  const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // ---- price range: typed min/max + two-handle slider on a logarithmic scale ----
  const pr = $("[data-price-range]");
  const LO = +pr.dataset.lo, HI = +pr.dataset.hi, STEPS = 1000;
  const pminIn = field("pmin"), pmaxIn = field("pmax");
  const rMin = $("[data-range-min]"), rMax = $("[data-range-max]");
  const fill = $("[data-range-fill]");
  const priceLabel = $("[data-price-label]");
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
  const priceText = (min, max) => (min && max ? `${short(min)} to ${short(max)}` : min ? `From ${short(min)}` : max ? `Up to ${short(max)}` : "");
  function paintRange(a, b, min, max) {
    rMin.value = a; rMax.value = b;
    rMin.setAttribute("aria-valuetext", min == null ? "No minimum" : rand(min));
    rMax.setAttribute("aria-valuetext", max == null ? "No maximum" : rand(max));
    fill.style.left = (a / STEPS) * 100 + "%";
    fill.style.right = 100 - (b / STEPS) * 100 + "%";
    // keep the lower handle reachable when both sit at the top end
    rMin.style.zIndex = a > STEPS - 50 ? 3 : 1;
    priceLabel.textContent = priceText(min, max) || "Any price";
  }
  const syncRange = (min, max) => paintRange(min == null ? 0 : toPos(min), max == null ? STEPS : toPos(max), min, max);
  // Normalise typed values: clamp to dataset bounds; minimum can never exceed maximum.
  let swapped = false;
  const help = $("[data-price-help]");
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

  // ---- structured location ----
  const flat = (tree, out = []) => { tree.forEach((n) => { out.push(n); n.kids && flat(n.kids, out); }); return out; };
  const KNOWN = flat(data.trees.all);
  const matchLoc = (i, loc) => !loc || (loc.k === "province" ? i.pv : loc.k === "city" ? i.c : loc.k === "area" ? i.a : i.lp) === loc.v;
  let loc = null;
  const picker = window.lhLocationPicker($("[data-loc]"), {
    tree: data.trees.current, total: data.totals.current,
    onChange: (sel) => { loc = sel; update(); },
  });

  // Property types on offer follow the availability state, so the list never offers an empty type.
  function typesFor(avail) {
    const list = data.types[avail === "all" ? "all" : "current"];
    const cur = typeSel.value;
    const opts = cur && !list.includes(cur) ? [...list, cur] : list;
    typeSel.innerHTML = '<option value="">Any type</option>' + opts.map((t) => `<option>${esc(t)}</option>`).join("");
    typeSel.value = cur;
  }
  function scopeTo(avail) {
    const k = avail === "all" ? "all" : "current";
    picker.setTree(data.trees[k], data.totals[k], k);
    typesFor(avail);
  }

  // ---- state <-> URL ----
  function readState() {
    const p = new URLSearchParams(location.search);
    const s = {};
    KEYS.forEach((k) => (s[k] = p.get(k) || ""));
    s.f = p.getAll("f");
    // One location: the most specific level wins. `estate` / `suburb` are accepted as aliases of `place`.
    s.place = s.place || p.get("estate") || p.get("suburb") || "";
    const k = [...LOC_KEYS].reverse().find((x) => s[x]);
    s.loc = k ? { k, v: s[k] } : null;
    // Older links searched locations as free text (?q=Zimbali Coastal Estate): map an exact location name.
    if (s.q && !s.loc) {
      const hit = KNOWN.find((n) => norm(n.v) === norm(s.q.trim()));
      if (hit) { s.loc = { k: hit.k, v: hit.v }; s.q = ""; }
    }
    return s;
  }
  function writeControls(s) {
    field("q").value = s.q;
    field("sort").value = s.sort || "rec";
    root.querySelectorAll('[name="avail"]').forEach((r) => (r.checked = r.value === (s.avail || "current")));
    scopeTo(s.avail);
    ["type", "beds", "baths", "garages"].forEach((k) => (field(k).value = s[k]));
    if (s.type && typeSel.value !== s.type) { typeSel.insertAdjacentHTML("beforeend", `<option>${esc(s.type)}</option>`); typeSel.value = s.type; }
    writePrices(clampPrice(parsePrice(s.pmin)), clampPrice(parsePrice(s.pmax)));
    loc = s.loc;
    picker.setSelection(loc);
    root.querySelectorAll('[name="f"]').forEach((c) => (c.checked = s.f.includes(c.value)));
  }
  function collect() {
    const s = { q: field("q").value.trim(), sort: field("sort").value, avail: root.querySelector('[name="avail"]:checked').value, loc };
    ["type", "beds", "baths", "garages"].forEach((k) => (s[k] = field(k).value));
    const [min, max] = readPrices();
    s.pmin = min == null ? "" : String(min);
    s.pmax = max == null ? "" : String(max);
    s.f = [...root.querySelectorAll('[name="f"]:checked')].map((c) => c.value);
    return s;
  }
  function toQuery(s) {
    const p = new URLSearchParams();
    if (s.loc) p.set(s.loc.k, s.loc.v);
    KEYS.forEach((k) => {
      if (LOC_KEYS.includes(k) || !s[k]) return;
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
    if (!matchLoc(i, s.loc)) return false;
    if (s.type && i.ty !== s.type) return false;
    if (s.pmin && !(i.pr >= +s.pmin)) return false;
    if (s.pmax && !(i.pr && i.pr <= +s.pmax)) return false;
    if (s.beds && !(i.bd >= +s.beds)) return false;
    if (s.baths && !(i.ba >= +s.baths)) return false;
    if (s.garages && !(i.g >= +s.garages)) return false;
    if (s.f.length && !s.f.every((f) => i.f.includes(f))) return false;
    if (s.q) {
      const hay = norm([i.t, i.dv, i.ag, i.ref].join(" "));
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
      i.fl != null && [group(i.fl) + " m²", ""],
    ].filter(Boolean).map(([v, k]) => `<li><b>${esc(v)}</b>${k ? " " + k : ""}</li>`).join("");
    return `<article class="card"><div class="card__img"><picture><source type="image/webp" srcset="${img}-480.webp 480w, ${img}-720.webp 720w, ${img}-1080.webp ${Math.min(1080, i.w)}w" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"><img src="${img}-1080.jpg" width="${Math.min(1080, i.w)}" height="${h}" alt="${esc(i.t)}, ${esc(i.pl)}" loading="${idx < 2 ? "eager" : "lazy"}" decoding="async"></picture>${i.st !== "for-sale" ? '<span class="status status--unknown">Availability to be confirmed</span>' : ""}</div>
<div class="card__body"><p class="card__place">${esc(i.pl)}</p><h3 class="card__title"><a href="${BASE}properties/${i.s}/">${esc(i.t)}</a></h3><div class="card__row"><span class="price card__price">${rand(i.pr)}</span><ul class="specs">${specs}</ul></div></div></article>`;
  }

  // "More filters" badge counts only what lives in that sheet.
  const advancedCount = (s) => ["baths", "garages"].filter((k) => s[k]).length + s.f.length + (s.avail === "all" ? 1 : 0);

  // ---- active filter chips ----
  const chipsEl = $("[data-chips]");
  const FEAT = Object.fromEntries([...root.querySelectorAll('[name="f"]')].map((c) => [c.value, c.parentElement.textContent.trim()]));
  const x = '<svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor"><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></svg>';
  function chipList(s) {
    const c = [];
    if (s.loc) c.push(["loc", s.loc.v]);
    if (s.avail === "all") c.push(["avail", "Including to be confirmed"]);
    if (s.pmin || s.pmax) c.push(["price", priceText(+s.pmin, +s.pmax)]);
    if (s.beds) c.push(["beds", `${s.beds}+ bedrooms`]);
    if (s.type) c.push(["type", s.type]);
    if (s.baths) c.push(["baths", `${s.baths}+ bathrooms`]);
    if (s.garages) c.push(["garages", `${s.garages}+ garages`]);
    s.f.forEach((f) => c.push(["f:" + f, FEAT[f] || f]));
    if (s.q) c.push(["q", `“${s.q}”`]);
    return c;
  }
  function renderChips(s) {
    const c = chipList(s);
    chipsEl.hidden = !c.length;
    chipsEl.innerHTML = c.map(([k, l]) => `<button class="chip" type="button" data-chip="${esc(k)}" aria-label="Remove filter: ${esc(l)}">${esc(l)}${x}</button>`).join("") + (c.length > 1 ? '<button class="chips__clear" type="button" data-reset>Clear all</button>' : "");
  }
  const onChip = (e) => {
    const b = e.target.closest("[data-chip]");
    if (!b) return;
    const k = b.dataset.chip;
    if (k === "loc") { loc = null; picker.setSelection(null); }
    else if (k === "q") field("q").value = "";
    else if (k === "avail") { root.querySelector('[name="avail"][value="current"]').checked = true; scopeTo("current"); }
    else if (k === "price") writePrices(null, null);
    else if (k.startsWith("f:")) root.querySelector(`[name="f"][value="${k.slice(2)}"]`).checked = false;
    else field(k).value = "";
    update();
    (chipsEl.querySelector("[data-chip]") || $("[data-loc-open]")).focus();
  };
  chipsEl.addEventListener("click", onChip);
  results.addEventListener("click", onChip);

  // Zero results: find the single active filter whose removal brings back the most homes, so the empty
  // state and the Show button can name it instead of a generic "try widening".
  function bestRelax(s) {
    const drops = chipList(s).filter(([k]) => k !== "avail").map(([k, label]) => {
      const t = { ...s, f: [...s.f] };
      if (k === "loc") t.loc = null; else if (k === "price") { t.pmin = ""; t.pmax = ""; } else if (k.startsWith("f:")) t.f = t.f.filter((x) => x !== k.slice(2)); else t[k] = "";
      return { k, label, n: items.filter((i) => match(i, t)).length };
    }).filter((d) => d.n > 0).sort((a, b) => b.n - a.n);
    return drops[0] || null;
  }

  // Picker counts follow the other active filters (everything except location), so a location is only
  // offered while it still has matching homes. Without other filters the inventory counts stand as built.
  function syncPickerCounts(s) {
    const others = { ...s, loc: null };
    const active = s.pmin || s.pmax || s.beds || s.baths || s.garages || s.type || s.f.length || s.q;
    if (!active) return picker.setCounter(null);
    const n = {}, add = (k) => (n[k] = (n[k] || 0) + 1);
    let total = 0;
    items.forEach((i) => {
      if (!match(i, others)) return;
      total++;
      add("province|" + i.pv); add("city|" + i.c);
      if (i.a) add("area|" + i.a);
      if (i.lp) add("place|" + i.lp);
    });
    picker.setCounter((o) => (o.k ? n[o.k + "|" + o.v] || 0 : total));
  }

  function render(s) {
    renderChips(s);
    syncPickerCounts(s);
    const list = items.filter((i) => match(i, s)).sort(sorters[s.sort] || sorters.rec);
    const hidden = s.avail !== "all" ? items.filter((i) => i.st !== "for-sale" && match(i, { ...s, avail: "all" })).length : 0;
    const homes = `${list.length} ${list.length === 1 ? "home" : "homes"}`;
    countEl.textContent = `${homes}${s.avail === "all" ? "" : " currently for sale"}${s.loc ? ` in ${s.loc.v}` : ""}`;
    const relax = list.length ? null : bestRelax(s);
    applyLabels.forEach((l) => (l.textContent = list.length ? `Show ${homes}` : "No matches"));
    showBtn.textContent = list.length ? `Show ${homes}` : "No matches";
    const n = advancedCount(s);
    badge.textContent = n ? String(n) : "";
    badge.parentElement.setAttribute("aria-label", n ? `More filters, ${n} active` : "More filters");
    results.innerHTML = list.length
      ? list.map(card).join("")
      : `<div class="empty"><p class="h3">No homes match these filters.</p><p class="body-copy">${relax ? `Removing “${esc(relax.label)}” shows ${relax.n} ${relax.n === 1 ? "home" : "homes"}.` : "Try a wider price range, fewer features or another location."}${hidden ? ` ${hidden} ${hidden === 1 ? "home whose availability is" : "homes whose availability is"} still to be confirmed ${hidden === 1 ? "matches" : "match"} as they are.` : ""}</p><div class="hero__actions">${relax ? `<button class="btn btn--ink" type="button" data-chip="${esc(relax.k)}">Remove ${esc(relax.label)}</button>` : ""}${hidden ? `<button class="btn ${relax ? "btn--line" : "btn--ink"}" type="button" data-include-all>Include to be confirmed</button>` : ""}<button class="btn btn--line" type="button" data-reset>Clear filters</button></div></div>`;
  }

  function update(push = true) {
    const s = collect();
    const q = toQuery(s);
    if (push && q !== location.search && !(q === location.pathname && !location.search)) history.pushState(null, "", q);
    render(s);
  }

  // ---- events ----
  let t;
  field("q").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { render(collect()); history.replaceState(null, "", toQuery(collect())); }, 180); });
  ["sort", "beds", "type"].forEach((k) => field(k).addEventListener("change", () => update()));
  const sheet = $("[data-filters]");
  sheet.addEventListener("change", (e) => {
    if (e.target.name === "avail") scopeTo(e.target.value);
    update();
  });
  // price
  const pricePanel = $("#price-panel");
  pricePanel.addEventListener("change", (e) => {
    if (e.target === pminIn || e.target === pmaxIn) {
      swapped = false;
      const [a, b] = readPrices();
      writePrices(a, b);
      if (swapped) help.textContent = "The minimum was higher than the maximum, so the two were swapped.";
    }
    update();
  });
  [pminIn, pmaxIn].forEach((el) => el.addEventListener("input", () => (help.textContent = HELP)));
  [pminIn, pmaxIn].forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el.blur(); el.dispatchEvent(new Event("change", { bubbles: true })); } }));
  $("[data-price-clear]").addEventListener("click", () => { writePrices(null, null); help.textContent = HELP; update(); });
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
    paintRange(a, b, min, max);
    render(collect());
  };
  rMin.addEventListener("input", () => onSlide("min"));
  rMax.addEventListener("input", () => onSlide("max"));

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-reset]")) {
      history.pushState(null, "", location.pathname);
      writeControls(readState());
      render(collect());
      filtersPop.close(false);
    }
    if (e.target.closest("[data-include-all]")) { root.querySelector('[name="avail"][value="all"]').checked = true; scopeTo("all"); update(); }
  });
  window.addEventListener("popstate", () => { writeControls(readState()); render(collect()); });

  // Show homes: everything filters live, so this closes any panel and takes the visitor to the results.
  showBtn.addEventListener("click", () => {
    countEl.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    countEl.focus({ preventScroll: true });
  });

  // ---- panels ----
  // Price. Phones: opening never focuses an input (on iOS that summons the numeric keyboard over the
  // sheet); focus goes to the dialog itself and the keyboard only appears when an input is tapped. The
  // bottom sheet then tracks the visual viewport, so it sits above the keyboard and the focused input
  // stays in view. Desktop keeps focusing Minimum on open.
  const PHONE = matchMedia("(max-width: 760px)");
  const vv = window.visualViewport;
  const priceBody = pricePanel.querySelector(".sheet__body");
  function revealField() {
    const f = document.activeElement;
    if (!f || !priceBody.contains(f)) return;
    const b = priceBody.getBoundingClientRect(), r = f.closest(".field").getBoundingClientRect();
    if (r.top < b.top) priceBody.scrollTop -= b.top - r.top + 8;
    else if (r.bottom > b.bottom) priceBody.scrollTop += r.bottom - b.bottom + 8;
  }
  function fitPrice() {
    const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop);
    pricePanel.style.setProperty("--kb", `${Math.round(kb)}px`);
    pricePanel.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
    requestAnimationFrame(revealField);
  }
  const pricePop = window.lhPop($("[data-price-open]"), pricePanel, {
    pin: true,
    focus: () => (PHONE.matches ? pricePanel : pminIn),
    onOpen: () => {
      if (!PHONE.matches || !vv) return;
      fitPrice();
      vv.addEventListener("resize", fitPrice);
      vv.addEventListener("scroll", fitPrice);
      pricePanel.addEventListener("focusin", fitPrice);
    },
    onClose: () => {
      if (vv) { vv.removeEventListener("resize", fitPrice); vv.removeEventListener("scroll", fitPrice); }
      pricePanel.removeEventListener("focusin", fitPrice);
      pricePanel.style.removeProperty("--kb");
      pricePanel.style.removeProperty("--vvh");
    },
  });
  // Apply: commit whatever is typed (blur fires the inputs' change handler, which validates, formats and
  // updates the results), then close; the keyboard goes with the blur.
  $("[data-price-apply]").addEventListener("click", () => {
    const f = document.activeElement;
    if (f && pricePanel.contains(f) && f.matches("input")) f.blur();
    pricePop.close();
  });
  const filtersPop = window.lhPop($("[data-filters-open]"), sheet, { lock: "always", focus: () => sheet.querySelector("[data-pop-close]") });

  // ---- init ----
  const init = readState();
  writeControls(init);
  // Normalise legacy URLs (?q=<location>, ?estate=) to the structured form without adding history.
  const canon = toQuery(collect());
  if (canon !== (location.search || location.pathname)) history.replaceState(null, "", canon);
  render(collect());
})();
