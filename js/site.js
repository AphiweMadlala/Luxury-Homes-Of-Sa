// Shared behaviour: mobile menu (focus trap + restore), scroll reveals, enquiry forms.
(() => {
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  // Trap Tab inside `el`; returns a release function that restores focus (unless told not to).
  // `lock` adds the body scroll lock (full-screen sheets and menus; not anchored desktop popovers).
  // `pin` also fixes the body in place, which iOS Safari needs (it ignores overflow:hidden on body), and
  // puts the page back at the same scroll position on release.
  window.lhTrap = (el, opener, { lock = true, pin = false } = {}) => {
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const f = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener("keydown", onKey);
    if (lock) document.body.classList.add("is-locked");
    const y = scrollY, b = document.body.style;
    if (lock && pin) Object.assign(b, { position: "fixed", top: `-${y}px`, left: "0", right: "0" });
    return (restore = true) => {
      el.removeEventListener("keydown", onKey);
      if (lock) document.body.classList.remove("is-locked");
      if (lock && pin) { Object.assign(b, { position: "", top: "", left: "", right: "" }); scrollTo(0, y); }
      if (opener && restore) opener.focus({ preventScroll: pin });
    };
  };

  // Popover / sheet dialog: anchored to its trigger on larger screens, a full-screen sheet on phones
  // (CSS decides the geometry). One open at a time; Escape and the close buttons restore focus to the
  // trigger; a click outside closes without stealing focus. `lock` = "always" | "sheet" (phones only).
  let openPop = null;
  const SHEET = matchMedia("(max-width: 760px)");
  window.lhPop = (trigger, panel, { onOpen, onClose, focus, lock = "sheet", pin = false } = {}) => {
    let release = null;
    const isOpen = () => !panel.hidden;
    const outside = (e) => { if (!panel.contains(e.target) && !trigger.contains(e.target)) close(false); };
    function close(restore = true) {
      if (!isOpen()) return;
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", outside, true);
      if (openPop === api) openPop = null;
      release && release(restore);
      release = null;
      onClose && onClose();
    }
    function open() {
      if (isOpen()) return;
      openPop && openPop.close(false);
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      const locking = lock === "always" || SHEET.matches;
      release = window.lhTrap(panel, trigger, { lock: locking, pin: pin && SHEET.matches });
      onOpen && onOpen();
      const target = (focus && focus()) || panel.querySelector(FOCUSABLE);
      target && target.focus({ preventScroll: true });
      document.addEventListener("pointerdown", outside, true);
      openPop = api;
    }
    const api = { open, close, isOpen };
    trigger.addEventListener("click", () => (isOpen() ? close() : open()));
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } });
    panel.querySelectorAll("[data-pop-close]").forEach((b) => b.addEventListener("click", () => close()));
    SHEET.addEventListener("change", () => close(false));
    return api;
  };

  // Mobile menu
  const menu = document.getElementById("mnav");
  const opener = document.querySelector("[data-menu-open]");
  let release = null;
  const closeMenu = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    opener.setAttribute("aria-expanded", "false");
    release && release();
  };
  opener?.addEventListener("click", () => {
    menu.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    release = window.lhTrap(menu, opener);
    menu.querySelector("[data-menu-close]").focus();
  });
  menu?.querySelector("[data-menu-close]").addEventListener("click", closeMenu);
  menu?.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
  menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  matchMedia("(min-width: 901px)").addEventListener("change", (e) => e.matches && closeMenu());

  // Reveal on scroll (skipped entirely under reduced motion via CSS)
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((r) => io.observe(r));
  } else reveals.forEach((r) => r.classList.add("is-in"));

  // Copy email: for visitors without a configured mail app. Clipboard API with a textarea fallback.
  const status = document.querySelector("[data-copy-status]");
  const copyText = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (e) { /* fall through */ }
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  };
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const label = btn.querySelector("[data-copy-label]");
    const ok = await copyText(btn.dataset.copy);
    const msg = ok ? "Email copied" : `Copy failed. The address is ${btn.dataset.copy}`;
    if (status) { status.textContent = ""; requestAnimationFrame(() => (status.textContent = msg)); }
    if (label) {
      label.textContent = ok ? "Copied" : "Select and copy";
      btn.classList.toggle("is-done", ok);
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { label.textContent = "Copy email"; btn.classList.remove("is-done"); }, 2200);
    }
  });

  // Enquiry forms compose an email in the visitor's own mail app. No data is sent anywhere by the site.
  document.querySelectorAll("form[data-enquiry]").forEach((form) => {
    const err = form.querySelector("[data-error]");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const name = String(d.get("name") || "").trim();
      const email = String(d.get("email") || "").trim();
      const problems = [];
      if (!name) problems.push("your name");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("a valid email address");
      form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
      if (problems.length) {
        err.textContent = `Please add ${problems.join(" and ")}.`;
        err.hidden = false;
        if (!name) form.elements.name.setAttribute("aria-invalid", "true");
        if (problems.length === 2 || name) form.elements.email.setAttribute("aria-invalid", "true");
        (name ? form.elements.email : form.elements.name).focus();
        return;
      }
      err.hidden = true;
      const intent = d.get("intent") || "Enquiry";
      const lines = [`${intent}`, "", String(d.get("message") || "").trim(), "", `Name: ${name}`, `Email: ${email}`];
      if (d.get("phone")) lines.push(`Phone: ${d.get("phone")}`);
      lines.push("", `Sent from ${location.href}`);
      const subject = `${form.dataset.subject}`;
      location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    });
  });
})();
