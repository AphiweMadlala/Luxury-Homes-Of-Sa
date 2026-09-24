// Location picker on the collection: inventory-backed options, counts, URL state, availability scope,
// keyboard and mobile sheet behaviour.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const props = JSON.parse(readFileSync("data/properties.json", "utf8"));
const forSale = props.filter((p) => p.status === "for-sale");
const countIn = (list, f) => list.filter(f).length;

const trigger = (page) => page.locator("[data-loc-open]").first();
const panel = (page) => page.locator("#loc-panel");
const options = (page) => panel(page).locator('[role="option"]');
const resultCount = async (page) => +(await page.locator("[data-count]").textContent()).match(/^\d+/)[0];
async function pick(page, name) {
  await trigger(page).click();
  await options(page).filter({ has: page.locator(".loc__name", { hasText: new RegExp(`^${name}$`) }) }).first().click();
}

test.describe("location picker", () => {
  test("opens and closes (button, Escape, close button, outside click) and restores focus", async ({ page }) => {
    await page.goto("properties/");
    await expect(panel(page)).toBeHidden();
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    await expect(panel(page)).toHaveAttribute("role", "dialog");
    await expect(panel(page).locator('[role="listbox"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await trigger(page).click();
    await panel(page).getByRole("button", { name: "Close location" }).click();
    await expect(panel(page)).toBeHidden();
    await trigger(page).click();
    await page.locator("h1").click();
    await expect(panel(page)).toBeHidden();
  });

  test("every listed location has homes, and each count equals the results it produces", async ({ page }) => {
    await page.goto("properties/");
    await trigger(page).click();
    const labels = await options(page).evaluateAll((els) => els.map((e) => ({ name: e.querySelector(".loc__name").textContent, n: +e.querySelector(".loc__n").textContent })));
    expect(labels[0]).toEqual({ name: "All South Africa", n: forSale.length });
    expect(labels.length).toBeGreaterThan(20);
    for (const l of labels) expect(l.n, `${l.name} count`).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    for (let i = 0; i < labels.length; i++) {
      await trigger(page).click();
      await options(page).nth(i).click();
      expect(await resultCount(page), `results for ${labels[i].name}`).toBe(labels[i].n);
      await expect(page.locator(".results .card")).toHaveCount(labels[i].n);
    }
  });

  test("counts are derived from the dataset (province, city, district, estate)", async ({ page }) => {
    await page.goto("properties/");
    await trigger(page).click();
    const n = async (name) => +(await options(page).filter({ has: page.locator(".loc__name", { hasText: new RegExp(`^${name}$`) }) }).first().locator(".loc__n").textContent());
    expect(await n("Western Cape")).toBe(countIn(forSale, (p) => p.province === "Western Cape"));
    expect(await n("Cape Town")).toBe(countIn(forSale, (p) => p.city === "Cape Town"));
    expect(await n("Sandton")).toBe(countIn(forSale, (p) => p.area === "Sandton"));
    expect(await n("Zimbali Coastal Estate")).toBe(countIn(forSale, (p) => p.estate === "Zimbali Coastal Estate"));
  });

  test("province selection filters and writes ?province=", async ({ page }) => {
    await page.goto("properties/");
    await pick(page, "Western Cape");
    await expect(page).toHaveURL(/\?province=Western\+Cape$/);
    await expect(trigger(page).locator("[data-loc-label]")).toHaveText("Western Cape");
    expect(await resultCount(page)).toBe(countIn(forSale, (p) => p.province === "Western Cape"));
    await expect(page.locator(".chip", { hasText: "Western Cape" })).toBeVisible();
  });

  test("city selection filters and writes ?city=", async ({ page }) => {
    await page.goto("properties/");
    await pick(page, "Cape Town");
    await expect(page).toHaveURL(/\?city=Cape\+Town$/);
    const places = await page.locator(".card__place").allTextContents();
    expect(places.length).toBe(countIn(forSale, (p) => p.city === "Cape Town"));
    for (const pl of places) expect(pl).toMatch(/Cape Town$/);
  });

  test("district and estate selection filter and write ?area= / ?place=", async ({ page }) => {
    await page.goto("properties/");
    await pick(page, "Sandton");
    await expect(page).toHaveURL(/\?area=Sandton$/);
    expect(await resultCount(page)).toBe(countIn(forSale, (p) => p.area === "Sandton"));
    await pick(page, "Zimbali Coastal Estate");
    await expect(page).toHaveURL(/\?place=Zimbali\+Coastal\+Estate$/);
    for (const pl of await page.locator(".card__place").allTextContents()) expect(pl).toContain("Zimbali");
  });

  test("deep links, legacy ?q= and ?estate= links restore the location", async ({ page }) => {
    await page.goto("properties/?city=Ballito");
    await expect(trigger(page).locator("[data-loc-label]")).toHaveText("Ballito");
    expect(await resultCount(page)).toBe(countIn(forSale, (p) => p.city === "Ballito"));
    await page.goto("properties/?q=Zimbali%20Coastal%20Estate");
    await expect(page).toHaveURL(/\?place=Zimbali\+Coastal\+Estate$/);
    await expect(trigger(page).locator("[data-loc-label]")).toHaveText("Zimbali Coastal Estate");
    await page.goto("properties/?estate=Zimbali+Coastal+Estate");
    await expect(page).toHaveURL(/\?place=Zimbali\+Coastal\+Estate$/);
    await page.goto("properties/?province=Gauteng");
    await expect(trigger(page).locator("[data-loc-label]")).toHaveText("Gauteng");
  });

  test("Back and Forward restore location, label, filters and results", async ({ page }) => {
    await page.goto("properties/");
    await pick(page, "Johannesburg");
    const jhb = await resultCount(page);
    await page.locator('select[name="beds"]').selectOption("5");
    await expect(page).toHaveURL(/city=Johannesburg&beds=5/);
    const jhb5 = await resultCount(page);
    await page.goBack();
    await expect(page).toHaveURL(/\?city=Johannesburg$/);
    await expect(page.locator('select[name="beds"]')).toHaveValue("");
    expect(await resultCount(page)).toBe(jhb);
    await page.goBack();
    await expect(trigger(page).locator("[data-loc-label]")).toHaveText("All South Africa");
    expect(await resultCount(page)).toBe(forSale.length);
    await page.goForward();
    await expect(trigger(page).locator("[data-loc-label]")).toHaveText("Johannesburg");
    await page.goForward();
    await expect(page.locator('select[name="beds"]')).toHaveValue("5");
    expect(await resultCount(page)).toBe(jhb5);
  });

  test("current inventory by default; including unconfirmed expands locations and counts, clearly labelled", async ({ page }) => {
    await page.goto("properties/");
    await trigger(page).click();
    await expect(panel(page).locator("[data-loc-scope]")).toHaveText("Homes currently for sale");
    // Camps Bay exists only in unconfirmed inventory: never offered by default.
    await expect(options(page).filter({ hasText: "Camps Bay" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.locator("[data-filters-open]").click();
    await page.locator('#filters input[name="avail"][value="all"]').check();
    await page.locator("#filters").getByRole("button", { name: /^Show \d+ homes$/ }).click();
    await trigger(page).click();
    await expect(panel(page).locator("[data-loc-scope]")).toContainText("including availability to be confirmed");
    await expect(options(page).first().locator(".loc__n")).toHaveText(String(props.length));
    const camps = options(page).filter({ has: page.locator(".loc__name", { hasText: /^Camps Bay$/ }) });
    await expect(camps.locator(".loc__n")).toHaveText(String(countIn(props, (p) => p.suburb === "Camps Bay")));
    await camps.click();
    await expect(page).toHaveURL(/place=Camps\+Bay&avail=all/);
    await expect(page.locator(".status--unknown").first()).toBeVisible();
  });

  test("with other filters active, counts follow them and locations without a match are not offered", async ({ page }) => {
    await page.goto("properties/?pmax=5000000");
    await trigger(page).click();
    await expect(panel(page).locator("[data-loc-scope]")).toHaveText("Homes currently for sale, matching your other filters");
    const labels = await options(page).evaluateAll((els) => els.map((e) => ({ name: e.querySelector(".loc__name").textContent, n: +e.querySelector(".loc__n").textContent })));
    const under = forSale.filter((p) => p.priceZAR && p.priceZAR <= 5e6);
    expect(labels[0].n).toBe(under.length);
    for (const l of labels) expect(l.n, l.name).toBeGreaterThan(0);
    await expect(options(page).filter({ has: page.locator(".loc__name", { hasText: /^Cape Town$/ }) })).toHaveCount(countIn(under, (p) => p.city === "Cape Town") ? 1 : 0);
    await page.keyboard.press("Escape");
    for (let i = 1; i < labels.length; i++) {
      await trigger(page).click();
      await options(page).nth(i).click();
      expect(await resultCount(page), labels[i].name).toBe(labels[i].n);
    }
  });

  test("find a location searches known locations only, with an explicit no-match message", async ({ page }) => {
    await page.goto("properties/");
    await trigger(page).click();
    await page.getByPlaceholder("Find a location").fill("zim");
    await expect(options(page)).toHaveCount(1);
    await expect(options(page).first()).toContainText("Zimbali Coastal Estate");
    await expect(options(page).first()).toContainText("Ballito");
    await page.getByPlaceholder("Find a location").fill("Atlantis");
    await expect(options(page)).toHaveCount(0);
    await expect(panel(page).locator("[data-loc-none]")).toHaveText("No current homes in that location.");
    // results are untouched by typing in the finder
    expect(await resultCount(page)).toBe(forSale.length);
  });

  test("keyboard: Enter opens, arrows move, Enter selects, typing jumps to find, Tab stays inside", async ({ page }) => {
    await page.goto("properties/");
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeVisible();
    const focused = () => page.evaluate(() => document.activeElement.querySelector(".loc__name")?.firstChild.textContent);
    expect(await focused()).toBe("All South Africa");
    await page.keyboard.press("ArrowDown");
    expect(await focused()).toBe("Gauteng");
    await page.keyboard.press("ArrowDown");
    expect(await focused()).toBe("Johannesburg");
    await page.keyboard.press("End");
    await page.keyboard.press("Home");
    expect(await focused()).toBe("All South Africa");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page).locator("[data-loc-label]")).toHaveText("Johannesburg");
    // reopen: focus lands on the selected option; typing moves to the finder
    await page.keyboard.press("Enter");
    expect(await focused()).toBe("Johannesburg");
    await expect(page.locator('#loc-panel [aria-selected="true"]')).toHaveCount(1);
    await page.keyboard.type("bal");
    await expect(page.getByPlaceholder("Find a location")).toBeFocused();
    await expect(page.getByPlaceholder("Find a location")).toHaveValue("bal");
    await page.keyboard.press("ArrowDown");
    expect(await focused()).toBe("Ballito");
    for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("#loc-panel"))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger(page)).toBeFocused();
  });

  test("mobile: full-screen sheet, 44px rows, internal scroll, body scroll lock, no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("properties/");
    await trigger(page).click();
    const box = await panel(page).boundingBox();
    expect(box.x).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.height)).toBe(844);
    expect(await page.evaluate(() => document.body.classList.contains("is-locked"))).toBe(true);
    const heights = await options(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    const last = options(page).last();
    await expect(last).not.toBeInViewport();
    const y0 = await page.evaluate(() => scrollY);
    await panel(page).locator(".sheet__body").evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(last).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(y0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await last.click();
    await expect(panel(page)).toBeHidden();
    expect(await page.evaluate(() => document.body.classList.contains("is-locked"))).toBe(false);
  });
});
