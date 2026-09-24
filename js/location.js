// Structured location picker. Options come only from the inventory tree generated at build time
// (scripts/site/lib.mjs locationTree), so every location offered has at least one home. Any level can be
// chosen: province, city, district or estate/suburb. Semantics: a dialog holding a listbox; options take
// roving focus (Arrow keys, Home/End, Enter/Space), typing jumps to "Find a location", which filters the
// known locations only. Also wires the homepage search strip, which submits to /properties/.
(() => {
  const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and");
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const homes = (n) => `${n} ${n === 1 ? "home" : "homes"}`;

  // Flatten the tree in display order; each entry keeps its ancestors (nearest first) for context.
  function flatten(tree) {
    const out = [];
    const walk = (nodes, trail, depth) => nodes.forEach((n) => {
      out.push({ k: n.k, v: n.v, n: n.n, depth, trail });
      if (n.kids) walk(n.kids, [n.v, ...trail], depth + 1);
    });
    walk(tree, [], 0);
    return out;
  }
  // Context shown with a search result and read to screen readers: "Sandton, Johannesburg".
  const context = (o) => (o.k === "province" ? "" : o.k === "city" ? o.trail[0] : o.trail.slice(0, -1).join(", "));

  window.lhLocationPicker = (root, { tree, total, scope = "current", onChange }) => {
    const trigger = root.querySelector("[data-loc-open]");
    const panel = root.querySelector("[data-loc-panel]");
    const list = root.querySelector("[data-loc-list]");
    const find = root.querySelector("[data-loc-find]");
    const findWrap = root.querySelector("[data-loc-findwrap]");
    const none = root.querySelector("[data-loc-none]");
    const label = root.querySelector("[data-loc-label]");
    const scopeEl = root.querySelector("[data-loc-scope]");
    const uid = panel.id;
    let all = [], shown = [], sel = null;
    // Optional live counter: with other filters active (price, bedrooms…) the collection passes a function
    // giving each location's matching count; locations with no match are left out (the selected one stays).
    let counter = null;

    function setTree(t, n, sc) {
      tree = t; total = n; scope = sc;
      all = [{ k: null, v: "All South Africa", n: total, depth: 0, trail: [] }, ...flatten(tree)];
      writeScope();
      // A search field only earns its place when the list is long.
      findWrap.hidden = all.length <= 12;
      if (!panel.hidden) render();
    }
    function writeScope() {
      if (!scopeEl) return;
      const base = scope === "all" ? "Homes for sale, including availability to be confirmed" : "Homes currently for sale";
      scopeEl.textContent = counter ? `${base}, matching your other filters` : base;
    }
    function setCounter(fn) {
      counter = fn;
      writeScope();
      if (!panel.hidden) render();
    }
    const isSel = (o) => (sel ? o.k === sel.k && o.v === sel.v : o.k === null);

    function render() {
      const q = norm(find.value.trim());
      const pool = counter ? all.map((o) => ({ ...o, n: counter(o) })).filter((o) => o.n > 0 || isSel(o)) : all;
      shown = q
        ? pool.filter((o) => o.k && (norm(o.v).includes(q) || (o.k === "place" && norm(o.trail[0]).startsWith(q))))
            .sort((a, b) => (norm(b.v).startsWith(q) - norm(a.v).startsWith(q)) || a.depth - b.depth || b.n - a.n)
        : pool;
      none.hidden = !!shown.length;
      none.textContent = shown.length ? "" : counter ? "No location has homes matching your other filters under that name." : scope === "all" ? "No homes in that location." : "No current homes in that location.";
      const tab = shown.findIndex(isSel) >= 0 ? shown.findIndex(isSel) : 0;
      list.innerHTML = shown.map((o, i) => {
        const ctx = context(o);
        const aria = `${o.v}${ctx ? ", " + ctx : ""}, ${homes(o.n)}`;
        return `<li role="option" id="${uid}-o${i}" class="loc__opt loc__opt--${o.k || "all"}${q ? " loc__opt--flat" : ""}" style="--d:${q ? 0 : o.depth}" data-i="${i}" tabindex="${i === tab ? 0 : -1}" aria-selected="${isSel(o)}" aria-label="${esc(aria)}"><span class="loc__name">${esc(o.v)}${q && ctx ? `<span class="loc__ctx">${esc(ctx)}</span>` : ""}</span><span class="loc__n">${o.n}</span></li>`;
      }).join("");
    }

    function setSelection(s) {
      sel = s && s.k ? { k: s.k, v: s.v } : null;
      label.textContent = sel ? sel.v : "All South Africa";
      trigger.classList.toggle("is-set", !!sel);
      if (!panel.hidden) render();
    }
    function choose(i) {
      const o = shown[i];
      if (!o) return;
      setSelection(o.k ? o : null);
      pop.close();
      onChange && onChange(sel);
    }

    const opts = () => [...list.querySelectorAll('[role="option"]')];
    // Scroll only the list's own scroller (scrollIntoView would also move the page under a popover).
    const scroller = list.parentElement;
    function reveal(o, center) {
      const top = o.offsetTop, h = o.offsetHeight, view = scroller.clientHeight; // scroller is the offsetParent
      if (center) scroller.scrollTop = top - (view - h) / 2;
      else if (top < scroller.scrollTop) scroller.scrollTop = top;
      else if (top + h > scroller.scrollTop + view) scroller.scrollTop = top + h - view;
    }
    function focusOpt(i) {
      const all = opts();
      if (!all.length) return;
      i = Math.max(0, Math.min(all.length - 1, i));
      all.forEach((o, j) => (o.tabIndex = j === i ? 0 : -1));
      all[i].focus({ preventScroll: true });
      reveal(all[i]);
    }
    list.addEventListener("click", (e) => { const o = e.target.closest('[role="option"]'); if (o) choose(+o.dataset.i); });
    list.addEventListener("keydown", (e) => {
      const cur = e.target.closest('[role="option"]');
      if (!cur) return;
      const i = +cur.dataset.i, n = opts().length;
      if (e.key === "ArrowDown") { e.preventDefault(); focusOpt(i + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (i === 0 && !findWrap.hidden) find.focus(); else focusOpt(i - 1); }
      else if (e.key === "Home") { e.preventDefault(); focusOpt(0); }
      else if (e.key === "End") { e.preventDefault(); focusOpt(n - 1); }
      else if (e.key === "PageDown") { e.preventDefault(); focusOpt(i + 8); }
      else if (e.key === "PageUp") { e.preventDefault(); focusOpt(i - 8); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(i); }
      else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !findWrap.hidden) find.focus();
    });
    find.addEventListener("input", render);
    find.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); focusOpt(0); }
      else if (e.key === "Enter") { e.preventDefault(); if (find.value.trim() && shown.length) choose(0); }
    });

    const pop = window.lhPop(trigger, panel, {
      onOpen: () => { find.value = ""; render(); },
      focus: () => {
        const o = list.querySelector('[aria-selected="true"]') || list.querySelector('[role="option"]');
        if (o) reveal(o, true);
        return o;
      },
    });

    setTree(tree, total, scope);
    setSelection(null);
    return { setTree, setCounter, setSelection, get: () => sel, close: () => pop.close(false) };
  };

  // ---- homepage search strip: location, budget and bedrooms, submitted to the collection ----
  const form = document.querySelector("[data-home-search]");
  if (form) {
    const data = JSON.parse(document.getElementById("home-search-data").textContent);
    const picker = window.lhLocationPicker(form.querySelector("[data-loc]"), { tree: data.tree, total: data.total });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const p = new URLSearchParams();
      const loc = picker.get();
      if (loc) p.set(loc.k, loc.v);
      const [lo, hi] = String(form.elements.price.value || "-").split("-");
      if (lo) p.set("pmin", lo);
      if (hi) p.set("pmax", hi);
      if (form.elements.beds.value) p.set("beds", form.elements.beds.value);
      const q = p.toString();
      location.href = form.getAttribute("action") + (q ? "?" + q : "");
    });
  }
})();
