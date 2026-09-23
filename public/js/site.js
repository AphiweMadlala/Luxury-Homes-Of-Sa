// Shared behaviour: mobile menu (focus trap + restore), scroll reveals, enquiry forms.
(() => {
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  // Trap Tab inside `el`; returns a release function that restores focus.
  window.lhTrap = (el, opener) => {
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const f = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener("keydown", onKey);
    document.body.classList.add("is-locked");
    return () => {
      el.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
      if (opener) opener.focus();
    };
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
