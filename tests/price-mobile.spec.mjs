// Mobile Price sheet: no keyboard on open, sits above the (iOS) keyboard, Apply commits and closes,
// scroll lock with position restore. iOS keyboards shrink window.visualViewport without resizing the
// layout viewport; a stand-in visualViewport reproduces that here.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const forSale = JSON.parse(readFileSync("data/properties.json", "utf8")).filter((p) => p.status === "for-sale");
const KEYBOARD = 336; // a typical iPhone numeric keyboard + accessory bar, only used to drive the fake viewport

async function fakeViewport(page) {
  await page.addInitScript(() => {
    const vv = new EventTarget();
    let kb = 0;
    Object.defineProperties(vv, {
      height: { get: () => innerHeight - kb }, width: { get: () => innerWidth },
      offsetTop: { get: () => 0 }, offsetLeft: { get: () => 0 }, scale: { get: () => 1 },
    });
    window.__keyboard = (h) => { kb = h; vv.dispatchEvent(new Event("resize")); };
    Object.defineProperty(window, "visualViewport", { get: () => vv });
  });
}
const resultCount = async (page) => +(await page.locator("[data-count]").textContent()).match(/^\d+/)[0];

for (const width of [375, 390, 393, 414, 430]) {
  test(`price sheet at ${width}px: open, Min and Max with keyboard, Apply`, async ({ page }) => {
    await fakeViewport(page);
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("properties/");
    await page.evaluate(() => scrollTo(0, 260));
    // measure after the trigger is in view: click() would otherwise scroll it into view first
    await page.locator("[data-price-open]").scrollIntoViewIfNeeded();
    const y0 = await page.evaluate(() => scrollY);
    expect(y0).toBeGreaterThan(100);
    const panel = page.locator("#price-panel");

    // A. open: whole sheet visible, nothing focused that would raise a keyboard
    await page.locator("[data-price-open]").click();
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => document.activeElement.id)).toBe("price-panel");
    expect(await page.evaluate(() => document.activeElement.tagName)).not.toBe("INPUT");
    const box = await panel.boundingBox();
    expect(Math.round(box.y + box.height)).toBe(844);
    expect(box.y).toBeGreaterThan(0);
    for (const sel of [".sheet__title", '[name="pmin"]', '[name="pmax"]', "[data-price-apply]", '[data-pop-close]']) await expect(panel.locator(sel).first()).toBeInViewport({ ratio: 1 });
    await expect(panel.locator("[data-price-apply]")).toHaveText("Apply", { useInnerText: true });
    await expect(panel.locator("[data-price-apply]")).toHaveAccessibleName("Apply");
    expect(await page.evaluate(() => getComputedStyle(document.body).position)).toBe("fixed");

    // B/C. focus an input, keyboard opens: sheet rises above it and the input stays visible
    for (const name of ["pmin", "pmax"]) {
      await panel.locator(`[name="${name}"]`).click();
      await page.evaluate((h) => window.__keyboard(h), KEYBOARD);
      await page.waitForTimeout(50);
      const b = await panel.boundingBox();
      const visibleBottom = 844 - KEYBOARD;
      expect(Math.round(b.y + b.height), `${name} sheet bottom`).toBe(visibleBottom);
      expect(b.y, `${name} sheet top`).toBeGreaterThanOrEqual(0);
      const f = await panel.locator(`[name="${name}"]`).boundingBox();
      expect(f.y).toBeGreaterThanOrEqual(b.y);
      expect(f.y + f.height, `${name} input above keyboard`).toBeLessThanOrEqual(visibleBottom);
      await expect(panel.locator(".sheet__title")).toBeInViewport();
      await page.keyboard.type(name === "pmin" ? "5m" : "20000000");
    }

    // Apply: validates/formats, keyboard (blur) goes, sheet closes, results and summary update
    await panel.locator("[data-price-apply]").click();
    await page.evaluate(() => window.__keyboard(0));
    await expect(panel).toBeHidden();
    expect(await page.evaluate(() => document.activeElement.matches("input"))).toBe(false);
    await expect(page.locator("[data-price-label]")).toHaveText("R5m to R20m");
    await expect(page).toHaveURL(/pmin=5000000&pmax=20000000/);
    expect(await resultCount(page)).toBe(forSale.filter((p) => p.priceZAR >= 5e6 && p.priceZAR <= 20e6).length);
    expect(await page.evaluate(() => getComputedStyle(document.body).position)).toBe("static");
    expect(await page.evaluate(() => scrollY)).toBe(y0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

    // X closes cleanly too, without a keyboard or scroll jump
    await page.locator("[data-price-open]").click();
    await panel.locator('[name="pmin"]').click();
    await page.evaluate((h) => window.__keyboard(h), KEYBOARD);
    await panel.locator("[data-pop-close]").click();
    await expect(panel).toBeHidden();
    expect(await page.evaluate(() => document.activeElement.matches("input"))).toBe(false);
    expect(await page.evaluate(() => [document.body.style.position, getComputedStyle(document.getElementById("price-panel")).getPropertyValue("--kb")])).toEqual(["", ""]);
    expect(await page.evaluate(() => scrollY)).toBe(y0);
    expect(errors).toEqual([]);
  });
}

test("desktop price popover unchanged: anchored, focuses Minimum, typed range applies", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("properties/");
  await page.locator("[data-price-open]").click();
  const panel = page.locator("#price-panel");
  await expect(page.locator('[name="pmin"]')).toBeFocused();
  const trig = await page.locator("[data-price-open]").boundingBox(), b = await panel.boundingBox();
  expect(b.y).toBeGreaterThan(trig.y + trig.height);
  expect(await page.evaluate(() => getComputedStyle(document.body).position)).toBe("static");
  await expect(panel.locator("[data-price-apply]")).toHaveText(/^Show \d+ homes$/, { useInnerText: true });
  await page.locator('[name="pmin"]').fill("10m");
  await panel.locator("[data-price-apply]").click();
  await expect(panel).toBeHidden();
  await expect(page.locator("[data-price-label]")).toHaveText("From R10m");
  await expect(page.locator("[data-price-open]")).toBeFocused();
});
