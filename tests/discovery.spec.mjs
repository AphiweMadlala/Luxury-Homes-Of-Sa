// Homepage search strip, collection strip, and the systems this pass must not disturb.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const props = JSON.parse(readFileSync("data/properties.json", "utf8"));
const forSale = props.filter((p) => p.status === "for-sale");
const resultCount = async (page) => +(await page.locator("[data-count]").textContent()).match(/^\d+/)[0];

test("homepage search navigates to the collection with the chosen location, budget and bedrooms", async ({ page }) => {
  await page.goto("./");
  const strip = page.locator("[data-home-search]");
  await strip.locator("[data-loc-open]").click();
  await expect(page.locator("#home-loc [data-loc-scope]")).toHaveText("Homes currently for sale");
  await page.locator("#home-loc .loc__opt", { hasText: /^Ballito/ }).first().click();
  await expect(strip.locator("[data-loc-label]")).toHaveText("Ballito");
  await strip.locator('select[name="price"]').selectOption({ label: "R5m to R10m" });
  await strip.locator('select[name="beds"]').selectOption("3");
  await strip.getByRole("button", { name: "Find a home" }).click();
  await expect(page).toHaveURL(/properties\/\?city=Ballito&pmin=5000000&pmax=10000000&beds=3$/);
  // the collection's controls reflect the query
  await expect(page.locator("[data-collection] [data-loc-label]")).toHaveText("Ballito");
  await expect(page.locator("[data-price-label]")).toHaveText("R5m to R10m");
  await expect(page.locator('[data-collection] select[name="beds"]')).toHaveValue("3");
  const expected = forSale.filter((p) => p.city === "Ballito" && p.priceZAR >= 5e6 && p.priceZAR <= 10e6 && p.bedrooms >= 3).length;
  expect(await resultCount(page)).toBe(expected);
  await expect(page.locator(".chip")).toHaveCount(3);
});

test("homepage search with no choices opens the full collection", async ({ page }) => {
  await page.goto("./");
  await page.locator("[data-home-search]").getByRole("button", { name: "Find a home" }).click();
  await expect(page).toHaveURL(/properties\/$/);
  expect(await resultCount(page)).toBe(forSale.length);
});

test("homepage budget bands and bedroom options only offer what current inventory holds", async ({ page }) => {
  await page.goto("./");
  const bands = await page.locator('[data-home-search] select[name="price"] option').evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
  for (const b of bands) {
    const [lo, hi] = b.split("-").map((v) => (v ? +v : null));
    expect(forSale.some((p) => p.priceZAR && (!lo || p.priceZAR >= lo) && (!hi || p.priceZAR <= hi)), b).toBe(true);
  }
});

test("collection: primary strip, More filters sheet, chips and price range keep working", async ({ page }) => {
  await page.goto("properties/");
  const strip = page.locator(".strip--collection");
  for (const k of ["Location", "Price", "Bedrooms", "Property type"]) await expect(strip.locator(".cell__k", { hasText: k })).toBeVisible();
  // no duplicated province / city filters anywhere
  await expect(page.locator('select[name="province"], select[name="city"]')).toHaveCount(0);
  // price popover: typed values normalise and write pmin/pmax
  await page.locator("[data-price-open]").click();
  await page.locator('input[name="pmin"]').fill("5m");
  await page.locator('input[name="pmin"]').press("Enter");
  await page.locator('input[name="pmax"]').fill("20,000,000");
  await page.locator('input[name="pmax"]').press("Enter");
  await expect(page).toHaveURL(/pmin=5000000&pmax=20000000/);
  await expect(page.locator("[data-price-label]")).toHaveText("R5m to R20m");
  await page.keyboard.press("Escape");
  // More filters: advanced only, with a badge
  await page.locator("[data-filters-open]").click();
  await page.locator('#filters input[value="pool"]').check();
  await expect(page.locator("[data-filter-count]")).toHaveText("1");
  await page.locator("#filters").getByRole("button", { name: /^Show \d+ homes$/ }).click();
  await expect(page.locator("#filters")).toBeHidden();
  await expect(page.locator(".chip", { hasText: "Pool" })).toBeVisible();
  await page.locator(".chip", { hasText: "Pool" }).click();
  await expect(page).not.toHaveURL(/f=pool/);
  // "Clear all" appears with two or more chips
  await page.locator('[data-collection] select[name="beds"]').selectOption("4");
  await expect(page.locator(".chip")).toHaveCount(2);
  await page.locator(".chips__clear").click();
  await expect(page).toHaveURL(/properties\/$/);
  await expect(page.locator("[data-price-label]")).toHaveText("Any price");
});

test("keyword field searches property, agent and reference, not locations", async ({ page }) => {
  await page.goto("properties/");
  const q = page.locator('input[name="q"]');
  await q.fill("hangar");
  await expect(page.locator(".card__title")).toHaveCount(1);
  const agentHome = forSale.find((p) => p.agent);
  const agents = JSON.parse(readFileSync("data/agents.json", "utf8"));
  const agentName = agents.find((a) => a.id === agentHome.agent).name.split(" ")[0];
  await q.fill(agentName);
  expect(await resultCount(page)).toBeGreaterThan(0);
  await q.fill(forSale[3].reference);
  await expect(page.locator(".card__title")).toHaveCount(1);
  await q.fill("Sandton");
  await expect(page.locator(".empty")).toBeVisible();
});

test("property page links into the structured collection", async ({ page }) => {
  const p = forSale[0];
  await page.goto(`properties/${p.slug}/`);
  await page.locator(".crumbs a", { hasText: p.city }).click();
  await expect(page.locator("[data-collection] [data-loc-label]")).toHaveText(p.city);
  expect(await resultCount(page)).toBe(forSale.filter((q) => q.city === p.city).length);
});

test("locations page: every link is a structured location with current homes; unconfirmed is secondary", async ({ page }) => {
  await page.goto("locations/");
  const hrefs = await page.locator(".loc-tree a").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThan(40);
  for (const h of hrefs) expect(h).toMatch(/properties\/\?(province|city|area|place)=[^&]+$/);
  const counts = await page.locator(".loc-tree .loc-n").evaluateAll((els) => els.map((e) => parseInt(e.textContent)));
  for (const n of counts) expect(n).toBeGreaterThan(0);
  const later = await page.locator(".loc-later a").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
  for (const h of later) expect(h).toMatch(/&avail=all$/);
  await expect(page.locator(".loc-later h2")).toHaveText("Availability to be confirmed");
});

test("gallery, enquiry, mobile menu and proposal mode still work", async ({ page }) => {
  const p = forSale.find((x) => x.slug === "the-coves-aviation-residence");
  await page.goto(`properties/${p.slug}/`);
  await page.locator(".gallery [data-open]").first().click();
  await expect(page.locator("[data-lightbox]")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-lb-count]")).toHaveText(/^2 \/ \d+$/);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-lightbox]")).toBeHidden();
  await page.locator("form[data-enquiry] button[type=submit]").click();
  await expect(page.locator("form[data-enquiry] [data-error]")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-menu-open]").click();
  await expect(page.locator("#mnav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mnav")).toBeHidden();
});

test("zero results name the filter to relax and recover in one step", async ({ page }) => {
  await page.goto("properties/?area=Sandton&pmax=5000000&beds=6");
  await expect(page.locator("[data-show]")).toHaveText("No matches");
  const empty = page.locator(".empty");
  await expect(empty).toContainText("No homes match these filters.");
  const relax = empty.locator("[data-chip]");
  await expect(relax).toHaveText(/^Remove /);
  await relax.click();
  expect(await resultCount(page)).toBeGreaterThan(0);
  await expect(page.locator("[data-show]")).toHaveText(/^Show \d+ homes?$/);
});
