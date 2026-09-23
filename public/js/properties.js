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
  const clearBtn = document.querySelector(".results-head [data-reset]");
  const KEYS = ["q", "sort", "avail", "province", "city", "type", "pmin", "pmax", "beds", "baths", "garages"];

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const group = (n) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const rand = (n) => (n ? "R" + group(n) : "Price on request");
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
    ["province", "type", "pmin", "pmax", "beds", "baths", "garages"].forEach((k) => (panel.querySelector(`[name="${k}"]`).value = s[k]));
    // Accept a city even when no province is chosen (links from Locations / home).
    citiesFor(s.province);
    citySel.value = s.city;
    panel.querySelectorAll('[name="f"]').forEach((c) => (c.checked = s.f.includes(c.value)));
  }
  function collect() {
    const s = { q: toolbar.elements.q.value.trim(), sort: toolbar.elements.sort.value, avail: panel.querySelector('[name="avail"]:checked').value };
    ["province", "city", "type", "pmin", "pmax", "beds", "baths", "garages"].forEach((k) => (s[k] = panel.querySelector(`[name="${k}"]`).value));
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

  function card(i) {
    const img = `${BASE}images/properties/${i.s}/01`;
    const h = Math.round((Math.min(1080, i.w) / i.w) * i.h);
    const specs = [
      i.bd != null && [i.bd, i.bd === 1 ? "bed" : "beds"],
      i.ba != null && [i.ba, i.ba === 1 ? "bath" : "baths"],
      i.g != null ? [i.g, i.g === 1 ? "garage" : "garages"] : i.pk != null && [i.pk, "parking"],
      i.fl != null && [group(i.fl) + " m²", ""],
    ].filter(Boolean).map(([v, k]) => `<li><b>${esc(v)}</b>${k ? " " + k : ""}</li>`).join("");
    return `<article class="card"><div class="card__img"><picture><source type="image/webp" srcset="${img}-480.webp 480w, ${img}-720.webp 720w, ${img}-1080.webp ${Math.min(1080, i.w)}w" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"><img src="${img}-1080.jpg" width="${Math.min(1080, i.w)}" height="${h}" alt="${esc(i.t)}, ${esc(i.pl)}" loading="lazy" decoding="async"></picture>${i.st !== "for-sale" ? '<span class="status status--unknown">Availability to be confirmed</span>' : ""}</div>
<div class="card__body"><p class="meta">${esc(i.pl)}</p><h3 class="card__title"><a href="${BASE}properties/${i.s}/">${esc(i.t)}</a></h3><div class="card__row"><span class="price card__price">${rand(i.pr)}</span><ul class="specs">${specs}</ul></div></div></article>`;
  }

  function activeCount(s) {
    return ["province", "city", "type", "pmin", "pmax", "beds", "baths", "garages"].filter((k) => s[k]).length + s.f.length + (s.avail === "all" ? 1 : 0);
  }

  function render(s) {
    const list = items.filter((i) => match(i, s)).sort(sorters[s.sort] || sorters.rec);
    const hidden = s.avail !== "all" ? items.filter((i) => i.st !== "for-sale" && match(i, { ...s, avail: "all" })).length : 0;
    countEl.textContent = `${list.length} ${list.length === 1 ? "home" : "homes"}${s.avail === "all" ? "" : " currently for sale"}`;
    applyLabel.textContent = `Show ${list.length} ${list.length === 1 ? "home" : "homes"}`;
    const n = activeCount(s);
    badge.textContent = n ? `(${n})` : "";
    clearBtn.hidden = !(n || s.q);
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
    update();
  });
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
