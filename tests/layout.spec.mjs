// Typography and layout at the main breakpoints: fonts load, no overflow, no console errors or failed
// requests, headings aren't clipped, the palette ignores OS dark mode. Screenshots are written to
// test-results/screens/ for visual review.
import { test, expect } from "@playwright/test";

const WIDTHS = [375, 390, 430, 768, 1024, 1440, 1920];
const PAGES = [["home", "./"], ["properties", "properties/"], ["property", "properties/the-coves-aviation-residence/"], ["locations", "locations/"], ["about", "about/"]];

for (const [name, path] of PAGES) {
  test(`${name}: fonts, overflow, errors and heading metrics at ${WIDTHS.join("/")}`, async ({ page }) => {
    const errors = [], failed = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    // lazy images still loading when the test navigates to the next width are cancelled (ERR_ABORTED): not a failure
    page.on("requestfailed", (r) => !/ERR_ABORTED/.test(r.failure()?.errorText || "") && failed.push(r.url()));
    page.on("response", (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: w < 800 ? 844 : 900 });
      await page.goto(path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        bodoni: document.fonts.check('500 40px "Bodoni Moda"'),
        manrope: document.fonts.check('400 16px "Manrope"'),
        h1Font: getComputedStyle(document.querySelector("h1")).fontFamily,
        bodyFont: getComputedStyle(document.body).fontFamily,
        navH: document.querySelector(".nav__in").getBoundingClientRect().height,
        wordmarkFits: (() => { const w = document.querySelector(".nav .wordmark").getBoundingClientRect(); return w.right <= innerWidth && w.height <= 44; })(),
        // A heading is clipped if its content is taller than its box inside an overflow-hidden ancestor;
        // check that no heading's text box is cut by its own scroll box.
        clipped: [...document.querySelectorAll("h1, h2, h3, .wordmark__main")].filter((h) => !h.classList.contains("sr-only") && h.scrollHeight > h.clientHeight + 2 && getComputedStyle(h).overflow !== "visible").length,
        loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")),
      }));
      expect(r.overflow, `${name} ${w} horizontal overflow`).toBeLessThanOrEqual(0);
      expect(r.bodoni && r.manrope, `${name} ${w} fonts`).toBe(true);
      expect(r.h1Font).toContain("Bodoni Moda");
      expect(r.bodyFont).toContain("Manrope");
      expect(r.navH).toBe(64);
      expect(r.wordmarkFits).toBe(true);
      expect(r.clipped).toBe(0);
      expect(r.loaded).not.toContain("Archivo");
      await page.screenshot({ path: `test-results/screens/${name}-${w}.png`, fullPage: w === 390 || w === 1440 });
    }
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
  });
}

test("brand palette is fixed: OS dark mode does not change it", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(241, 242, 239)");
  const ink = await page.evaluate(() => getComputedStyle(document.body).color);
  expect(ink).toBe("rgb(27, 32, 35)");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light");
});

test("mono is limited to labels, references and selected figures", async ({ page }) => {
  for (const path of ["./", "properties/", "properties/the-coves-aviation-residence/", "locations/"]) {
    await page.goto(path);
    const mono = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
      const cs = getComputedStyle(el);
      return cs.fontFamily.includes("Plex Mono") && el.offsetParent !== null;
    }).map((el) => el.className || el.tagName));
    // every mono run is a small label-type element, never a heading, paragraph copy, price or button
    for (const cls of mono) expect(String(cls), path).toMatch(/label|fig|status|cell__k|fx|swipe__count|^SPAN$|^DT$/);
  }
});
