// Property page: lightbox, mobile swipe counter, enquiry intent, illustrative bond calculator, sticky bar.
(() => {
  const imgs = JSON.parse(document.getElementById("gallery-data").textContent);
  const lb = document.querySelector("[data-lightbox]");
  const lbImg = lb.querySelector("[data-lb-img]");
  const lbCount = lb.querySelector("[data-lb-count]");
  const title = lb.querySelector(".lightbox__foot").textContent;
  let idx = 0, release = null;

  function show(i) {
    idx = (i + imgs.length) % imgs.length;
    const f = imgs[idx];
    lbImg.src = f.src; lbImg.width = f.w; lbImg.height = f.h;
    lbImg.alt = `${title}: photograph ${idx + 1} of ${imgs.length}`;
    lbCount.textContent = `${idx + 1} / ${imgs.length}`;
    // warm the neighbours
    [idx + 1, idx - 1].forEach((j) => { const n = imgs[(j + imgs.length) % imgs.length]; if (n) new Image().src = n.src; });
  }
  function open(i, opener) {
    show(i);
    lb.hidden = false;
    release = window.lhTrap(lb, opener);
    lb.querySelector("[data-lb-close]").focus();
  }
  function close() {
    if (lb.hidden) return;
    lb.hidden = true;
    release && release();
    release = null;
  }
  document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => open(+b.dataset.open, b)));
  lb.querySelector("[data-lb-close]").addEventListener("click", close);
  lb.querySelector("[data-lb-prev]").addEventListener("click", () => show(idx - 1));
  lb.querySelector("[data-lb-next]").addEventListener("click", () => show(idx + 1));
  lb.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
  });
  // swipe inside the lightbox
  let x0 = null;
  const stage = lb.querySelector("[data-lb-stage]");
  stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  stage.addEventListener("pointerup", (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
  });
  if (imgs.length < 2) lb.querySelectorAll(".lightbox__nav").forEach((b) => (b.hidden = true));

  // mobile swipe gallery counter
  const track = document.querySelector("[data-swipe]");
  const counter = document.querySelector("[data-swipe-count]");
  if (track && counter) {
    const update = () => { counter.textContent = `${Math.round(track.scrollLeft / track.clientWidth) + 1} / ${imgs.length}`; };
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); track.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * track.clientWidth, behavior: "smooth" }); }
    });
  }

  // enquiry intent from CTA buttons
  document.querySelectorAll("[data-intent]").forEach((a) => a.addEventListener("click", () => {
    const val = a.dataset.intent === "viewing" ? "Arrange a viewing" : "Request more details";
    const r = document.querySelector(`[data-enquiry] [name="intent"][value="${val}"]`);
    if (r) r.checked = true;
    setTimeout(() => document.querySelector('[data-enquiry] [name="name"]')?.focus({ preventScroll: true }), 350);
  }));

  // illustrative bond repayment (standard amortisation)
  const calc = document.querySelector("[data-calc]");
  if (calc) {
    const out = calc.querySelector("output");
    const val = (n) => parseFloat(String(calc.querySelector(`[name="${n}"]`).value).replace(/[^\d.]/g, "")) || 0;
    const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const run = () => {
      const P = Math.max(0, val("price") - val("deposit"));
      const r = val("rate") / 100 / 12, n = Math.round(val("years") * 12);
      if (!P || !n) { out.textContent = "R0"; return; }
      const m = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
      out.textContent = "R" + group(m) + " per month";
    };
    calc.addEventListener("input", run);
    run();
  }

  // sticky mobile enquiry bar: shown while any section below the particulars is on screen,
  // hidden at the enquiry form. Section-based so scroll jumps (anchors, restored position) also work.
  const bar = document.querySelector("[data-stickybar]");
  const form = document.getElementById("enquire");
  const aside = document.querySelector(".aside");
  const zones = [...document.querySelectorAll(".detail-section, .section")].filter((z) => z !== form);
  if (bar && form && "IntersectionObserver" in window) {
    const seen = new Set();
    let formIn = false, asideIn = true;
    const sync = () => bar.classList.toggle("is-visible", seen.size > 0 && !formIn && !asideIn);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === form) formIn = e.isIntersecting;
        else if (e.target === aside) asideIn = e.isIntersecting;
        else e.isIntersecting ? seen.add(e.target) : seen.delete(e.target);
      });
      sync();
    });
    zones.forEach((z) => io.observe(z));
    io.observe(form);
    if (aside) io.observe(aside);
  }
})();
