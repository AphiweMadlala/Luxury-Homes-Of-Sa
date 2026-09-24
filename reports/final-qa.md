# Final QA

Date: 2026-09-23. Local static server with `dist/` mounted at `/Luxury-Homes-Of-Sa/` (the GitHub Pages base path). Chromium via Playwright CLI.

## Automated gates

| Gate | Result |
|---|---|
| `scripts/validate.mjs` (duplicate ids and slugs, prices, bed/bath plausibility, source URLs, image refs, zero-byte media, contact formats, agent refs, provenance, hero image, in-gallery duplicates) | **Pass**: 0 errors, 72 warnings (legitimately unpublished floor/erf/rates/levies, thin reel-only galleries) |
| Validator negative test (injected duplicate slug, 4.3 bedrooms, ghost agent, empty sources, R500 price) | All 5 caught, exit 1; data restored |
| `scripts/check_links.mjs` | 111 pages, 16,453 internal href/src/srcset/poster refs, **0 broken** |
| Console errors, all 111 pages at 375px | **0** (only the deliberate 404 probe, which the Python test server serves without `404.html`; GitHub Pages serves it) |
| Failed network requests | **0** |
| Horizontal overflow at 375 (all pages) and 390/430/768/1024/1440/1920 (key pages) | **None** |
| Impeccable detector (rendered, 5 pages) | 23 findings → fixes → **0** |
| WCAG contrast, token pairs, both themes | Text ≥5.09:1 everywhere; control borders raised to ≥3.46:1 |

## Functional tests

| Area | Test | Result |
|---|---|---|
| Home | Hero, curated set, statement, dossier, register, list-with-us band, closing band at 1440/390; reveal gated on JS | Pass |
| Search | "zimbali", by reference (DdN6deuCJuQ), by agent ("Jacqui") | Pass |
| Filters | Province → dependent city list; beds; features; price; availability toggle | Pass |
| Sorting | Recommended / price asc / desc (no "Newest": no reliable listing dates) | Pass |
| URL state | Filters written to query; back/forward restore controls **and** results; deep links (`?city=Ballito`) | Pass |
| Empty state | Offers "Include to be confirmed" with a count, plus Clear filters | Pass |
| Clear filters | Hidden with no active filter; shown when active | Pass (after fix) |
| Filter drawer (mobile) | Opens with focus on close; Escape closes and restores focus; Apply bar pinned | Pass (Apply bar fixed after critique) |
| Mobile menu | Focus trap, Escape, closes on navigation | Pass |
| Gallery / lightbox | Opens from mosaic/swipe/grid; arrows wrap 20→1; Tab trapped; Escape closes; focus restored; body scroll lock; swipe | Pass |
| Swipe counter | "1 / 10" updates on scroll; arrow keys step | Pass |
| Reel-only property (Clifton) | Film `preload=none` with poster; "Check availability" CTA; no calculator | Pass |
| POA / limited data | `zululami-three-bedroom-home` shows "Price on request"; missing fields show "not published; ask the agent" | Pass |
| Many images | Meyersdal (20 frames) lazy-loaded full-width grid | Pass |
| Agent contact | Lindi Spezialetti: `tel:+27676643880` Call button, Instagram link; form routes to LHOSA (no agent email published) | Pass |
| Email / call | `mailto:` with subject including title and reference; `tel:` links normalised | Pass |
| Enquiry form | Validation messages inline, focus moves to the first invalid field, `aria-invalid`; composes mailto (no fake backend) | Pass |
| Bond calculator | R7,875,000 at 11.25% for 20y = R82,629/month (matches hand amortisation); 0% → R32,813 | Pass |
| Sticky bar (mobile) | Hidden while aside visible; shown mid-page; hidden at form; works after scroll jumps | Pass (two bugs fixed: jump-scroll and aside overlap) |
| WhatsApp | Not offered anywhere: no verified WhatsApp number exists | By design |
| Reduced motion | Reveal and hero settle disabled; transitions ~0 | Pass |
| Dark mode | Home and property page checked | Pass |
| Proposal mode | Every page has `noindex, nofollow`; robots.txt `Disallow: /`; no sitemap; nothing visible to visitors | Pass |
| 404 | Branded page with Explore CTA | Pass |

## Design review (Impeccable critique, dual assessment)

Heuristics 29/40 before fixes. Answers to the brief's 11 questions (from the independent reviewer):

1. **Unmistakably different from Exclusive Cape Town?** Yes: light mineral versus navy, grotesk and mono versus Fraunces, square versus pill, brick versus gold, no numbering, manifesto or map.
2. **Property sales rather than rentals?** Yes, strongly: asking price, rates and levies, transfer duty, bond illustration, mandate language, zero rental vocabulary.
3. **Luxury Homes of SA rather than a template?** Content model and provenance were strongly specific; the chrome risked generic Swiss minimalism. **Fixed:** the curator-voice hero, the "Pictured" particulars block and a stronger use of the expanded width axis.
4. **Photography dominant?** Yes on property pages. On home, the dead hero column is now used by particulars.
5. **Price confidence?** Excellent. **Fixed:** repetition cut from four instances to two plus the sticky bar; the FX line moved into Financials.
6. **Too many cards?** No; cards are unboxed.
7. **Too many bordered boxes?** Rules rather than boxes. **Fixed:** the aside reduced to one primary CTA plus Call, Location and Listing source merged, Photographs full width.
8. **Typography identity?** **Fixed:** the hero is now expanded like the other display type.
9. **Mobile editorial?** Competent. **Fixed:** duplicated aside and sticky bar, breadcrumb tail removed on mobile.
10. **Enquiry obvious without aggression?** **Fixed:** from six routes down to one primary CTA plus Call; "Email your enquiry" label.
11. **South African without cliché?** Yes: braai, erf, rates and levies, rand spacing, face-brick accent; no protea, Big Five or flags.

Also fixed from the critique:
- Locations showed unconfirmed stock ("Bedfordview 0 for sale", "38 to confirm"). It now counts homes for sale only, with one line linking to the unconfirmed features.
- The desktop sticky toolbar overlapped the filter legend.
- Small-print line lengths were too long.

Not changed, deliberately:
- Card titles stay descriptive rather than invented editorial names; no facts are added.
- Rates, levies and erf are not glossed.
- There is no shortlist or map (out of scope for the proposal).

## Known residual issues

- 67 of 104 homes are "availability to be confirmed" pending agent or client confirmation.
- Reel-only galleries (14) and 1080px image ceiling: request originals from agents.
- Mailto depends on a configured mail client (the address is always visible as text too).
- The font preload warning in headless Chromium is timing-only; the font loads and renders.

---

# Polish pass QA (brand / UX / customer-facing presentation)

Date: 2026-09-23. Same local harness: `dist/` served under `/Luxury-Homes-Of-Sa/`, Chromium via Playwright CLI. The data discipline is unchanged: 37 for sale, 67 availability to be confirmed, 2 sold records, null fields kept, no re-scrape.

## Automated gates

| Gate | Result |
|---|---|
| `npm run validate` | Pass: 104 properties, 13 agents, 0 errors |
| `npm run build` | 104 property pages + 7 pages (+ `/list-with-us/` redirect) |
| `node scripts/check_links.mjs` | 112 pages, 12,975 internal refs, **0 broken**. The checker now skips `data:` URIs (the lightbox placeholder). Refs dropped from 16,453 because the repeated all-photos grid was removed. |
| Console errors / failed requests, all 111 pages at 375 | **0 / 0** |
| Horizontal overflow at 375 (all pages) and 390/430/768/1024/1440/1920 (key pages) | **None**. One regression was found and fixed: the "R2.3m to R100m" figure overflowed at 768/1024. |
| Impeccable detector (rendered) | Pass 1: 8 findings. After fixes: 5, of which 4 are deliberate or false positives (the single "Featured residence" label; heading leading; `.btn` min-height padding flagged twice). The last, the Locations footnote line length, was then fixed. |

## Functional tests (all pass)

| Area | Result |
|---|---|
| Typed price | "R5 000 000", "5000000", "5,000,000" and "12.5m" all normalise to rand. A minimum above the maximum swaps the two and says so in a live note. Values above the dataset bound clamp to "no maximum". |
| Two-handle slider | ARIA value text in rand. Arrow keys move both handles (fixed a bug where one step on the minimum snapped back to the lower bound). The handles never cross. Filters update live and the URL updates on commit. |
| Active filter chips | Chips for search, availability, province, city, type, price, beds, baths, garages and features. Each one removes a single filter; "Clear all" appears with two or more. The duplicate "Clear filters" control was removed. |
| URL state | `pmin`/`pmax` and all other filters persist. Back/Forward restores chips and controls. Deep links work (`?pmin=10000000&pmax=25000000&city=Johannesburg` gives 5 homes). |
| Search | The label now matches the searched fields. Search by agent ("Jacqui") and by reference works. |
| Filter drawer (mobile) | **P0 fixed**: the drawer was not scrollable (Garages and Features unreachable below 1025px). It is now full-height with internal scroll, the last feature is reachable, the Apply bar is pinned, check rows are 44px, and Escape restores focus. |
| Gallery | Five-frame mosaic, sequence and swipe all open the lightbox at the correct index (4/20, 7/20, 5/20). Arrows, keyboard, Escape, swipe, focus trap and restore, and scroll lock all work. |
| Copy email | The clipboard receives the address, the button reads "Copied", and "Email copied" is announced in the live region. A fallback exists for browsers without the Clipboard API. |
| Enquiry | For credited agents, the agent remains primary (call, email, Instagram). For uncredited homes, Email and Instagram message are equally prominent. Mailto composition only; no fake backend. |
| Redirect | `/list-with-us/` → `/collaborate/` |
| Reduced motion / dark mode | Reveals are visible without scrolling under reduce. Dark body text is 15.1:1 and muted text 7.1:1. |

## Impeccable review: findings fixed

The design review scored 28/36 (heuristic 10 n/a) before these fixes. It answered the brief's 10 questions:

- **As complete as Durban Luxe:** yes.
- **Publication feel:** partly; addressed below.
- **Too clinical:** yes in the collection and the lower property page; eased.
- **Photography:** leads on desktop but dropped out on mobile; fixed.
- **Identity:** tasteful but not distinctive; strengthened.
- **Disclosures:** secondary, but uncredited homes read ambiguously; fixed.
- **Discovery:** good on desktop, broken on mobile; fixed.
- **Mobile premium:** mixed; fixed.
- **Collaboration accuracy:** accurate but thin; enriched.
- **Distinctness:** clearly distinct from Exclusive Cape Town; the home skeleton resembled Durban Luxe, so it was differentiated.

Fixes applied:

1. **Mobile drawer scroll (P0):** fixed as above.
2. **Uncredited attribution:** the aside now says "Marketed by: An estate agency" (with "View the agency listing" where confirmed) above "Featured by Luxury Homes of SA". A one-line "Marketed by…" also appears under the specs on mobile. "Reference {shortcode}" and the raw date list were replaced with "First featured …, most recently … on Instagram: post 1, post 2".
3. **Agent copy was not editorial:** each property now opens with a **factual standfirst generated only from its particulars**, in sentence case, for example: "A five-bedroom home in The Coves Estate, Hartbeespoort, with 970 m² under roof on a 2 638 m² erf. Private aircraft hangar…". The agent's text sits beneath it, labelled "From the listing". Agent title-case headlines moved into Listing information.
4. **Durban Luxe structural resemblance:** the dossier was redesigned as a **particulars sheet**: a ruled key/value table (asking price, specs, levies) beside the photograph, with supporting frames as a vertical strip. There is also an editorial brick-rule issue line in the hero ("37 homes for sale in 4 provinces"). The brief-mandated section order and split hero were kept.
5. **Photography on mobile:** property pages keep two sequence frames on phones. Single-image (reel-only) heroes are shown at native aspect and capped at 1080px rather than cropped wide.
6. **Mobile polish:**
   - copy buttons are 44px on touch;
   - text-link hit areas are enlarged and contact links are 44px tall;
   - markets use a compact two-up grid on phones;
   - the search placeholder is shortened and breadcrumbs are no longer cut to a lone "Home".
7. **Collaborate:** added dated reach (41,131 followers at 23 September 2026, homes for sale, provinces), "What happens next" and "Featured in collaboration now" (live agent-collaboration listings). "Can credit you" became "credits you by name, agency and contact details". No results, reach or pricing are promised.
8. **Other fixes:**
   - About body copy was squeezed by a stray grid rule;
   - card spec rows now sit on their own line;
   - chips moved above the results column;
   - labels above headings reduced to one per page;
   - feature-list and footnote line lengths capped;
   - the first two collection cards load eagerly (LCP);
   - duplicated sequence CSS rules cleaned up.

Not changed, deliberately:

- The Durban Luxe-like section *order* stayed, because the brief prescribed it.
- There is no shortlist or map (out of scope).
- The follower count isn't repeated on the home page (the brief says avoid emphasising it).
- The camera operator in Clifton's reel frame stays: it's the only image available for that listing, and it needs replacement photography from the agent.

## Remaining client-confirmation items

Unchanged from the first pass:

- confirm availability of the 67 unconfirmed homes;
- permission to republish agency photography;
- original high-resolution images, especially for the 14 reel-only listings;
- a phone or WhatsApp number, if one exists;
- the collaboration terms, and whether features are paid;
- legal entity details for the footer.

---

# Typography and discovery pass QA

Date: 2026-09-24. `dist/` served under `/Luxury-Homes-Of-Sa/` (local static server; Playwright's own `tests/serve.mjs` for the suite). Chromium 153 via Playwright 1.63. Data discipline unchanged: 104 properties, 37 for sale, 67 availability to be confirmed, same statuses, prices, agents and provenance; no re-scrape.

## Automated gates

| Gate | Result |
|---|---|
| `npm run validate` | Pass: 104 properties, 13 agents, 0 errors. New rule: an estate/suburb name under two cities fails the build (none do). |
| `npm run build` | 104 property pages + 7 pages (+ `/list-with-us/` redirect) |
| `node scripts/check_links.mjs` | 112 pages, 13,107 internal refs, **0 broken** |
| `npm test` (Playwright, new) | **28 passed**, 0 failed (location picker 12, discovery and retained systems 9, typography and layout 7) |
| Console errors / failed requests / horizontal overflow, 110 pages at 375 | **0 / 0 / 0** |
| Overflow, fonts, nav height, heading clipping at 375, 390, 430, 768, 1024, 1440, 1920 (home, properties, property, locations, about) | Pass: no overflow, Bodoni and Manrope loaded, nav 64px, wordmark fits, no clipped headings, Archivo never requested |
| Layout shift on cold load (home 1440/390, properties 1440, property 390) | CLS **0.0000** (Bodoni and Manrope preloaded) |
| OS dark mode emulated | Palette unchanged (`rgb(241, 242, 239)` ground, `rgb(27, 32, 35)` ink) |
| Mono audit (rendered) | Plex Mono appears only on labels, strip keys, the status tag, counters and the FX line |
| Impeccable detector, served pages at 1440 and 390 | Before fixes 36 / 26 findings; after: **1 / 1**, the deliberate "Featured residence" dossier label |
| WCAG contrast | ink 14.6:1, muted 5.6:1 on ground (6.1:1 on surface), brick text 5.6:1, plaster on brick 6.1:1 |

## Location picker (Playwright)

| Test | Result |
|---|---|
| Opens and closes by button, Escape, close button and outside click; focus restored to trigger; `aria-expanded` kept in sync | Pass |
| Every listed location has more than 0 homes, and for **every** option (53), selecting it yields exactly the count shown | Pass |
| Counts match the dataset for a province, city, district and estate | Pass |
| Province → `?province=`, city → `?city=`, district → `?area=`, estate/suburb → `?place=` | Pass |
| Deep links (`?city=Ballito`), legacy `?q=Zimbali Coastal Estate` and `?estate=` convert to the structured location | Pass |
| Back/Forward restores location, label, bedrooms and results | Pass |
| Default shows current locations only (Camps Bay, unconfirmed-only, absent); including unconfirmed switches tree, totals (104) and scope line, and marks results | Pass |
| "Find a location" searches known locations only; "Atlantis" gives "No current homes in that location." and leaves results untouched | Pass |
| Keyboard: Enter opens, focus on selected option, arrows/Home/End move, Enter selects, typing jumps to the finder, Tab trapped, Escape restores | Pass |
| Mobile 390: full-screen sheet, rows ≥44px, internal scroll reaches the last option, body scroll locked and released, no overflow | Pass |

## Homepage search and collection

| Test | Result |
|---|---|
| Home strip: Ballito + R5m to R10m + 3+ beds → `/properties/?city=Ballito&pmin=5000000&pmax=10000000&beds=3`; collection label, price label, bedrooms and chips populated; count matches data | Pass |
| Empty home search → full collection; every budget band holds current homes | Pass |
| Strip shows Location, Price, Bedrooms, Property type; no Province/City selects remain; typed price normalises; More filters badge; chips; Clear all | Pass |
| Keyword searches property, agent and reference; "Sandton" no longer matches as free text | Pass |
| Property breadcrumb city link lands on the structured location with the right count | Pass |
| Locations page: every register link is `?province|city|area|place=` with a count > 0; unconfirmed block links with `avail=all` | Pass |
| Zero results name the filter to relax ("Removing “6+ bedrooms” shows 1 home.") and recover in one click; Show button reads "No matches" | Pass |
| Gallery (lightbox, arrows, Escape), enquiry validation, mobile menu, `noindex, nofollow` | Pass |

## Impeccable review

**Critique** (design review + detector as two isolated assessments). Heuristics **27/40** before fixes. Answers to the brief's questions:

1. **Luxury typography?** Yes at display sizes; Bodoni at small sizes (picker rows, sub-24px heads) was spindly. **Fixed:** picker rows moved to Manrope; Bodoni reserved for ≥22px; large settings held at opsz 30.
2. **Modern South African architecture?** Partly. A Didone leans fashion; opsz 30, the brick accent, square geometry and the particulars system keep it architectural.
3. **Not Durban Luxe?** Yes: no bronze or warm metallic.
4. **Not Exclusive Cape Town?** Yes: no navy/gold, no pills, split hero with the search strip below it, zero radius. Residual genre risk (serif + sans) noted.
5. **Search easier?** Yes, clearly: structured levels with counts and context beat free text plus province/city selects.
6. **Zero-result location?** Never on its own (every node ≥1; search filters known locations only). In combination with other filters, yes. **Fixed:** the empty state names the filter to relax with a one-step remove, and the Show button says "No matches". Picker counts stay inventory-based by design (the brief forbids showing 0 in the selector).
7. **Homepage editorial, not portal?** Yes; the 3-field strip sits after the hero.
8. **Mono overused?** Largely fixed; the long "Property, agent or reference" label was still mono caps. **Fixed** (Manrope).
9. **More memorable?** Somewhat. The lockup is clean but conventional; the memorable assets remain the Pictured block and the Locations register.
10. **Mobile quality?** Home and property hold up. **Fixed:** price is a bottom sheet (was a mostly empty full screen); keyword and sort share one row.

**Audit** (technical):

| Dimension | Score | Key finding |
|---|---|---|
| Accessibility | 3 | Dialog/listbox semantics, roving focus, focus restore and trap. **Fixed:** focus hidden under the sticky strip (`scroll-padding-top`, WCAG 2.4.11); brick focus ring on fields read as an error (now ink); wordmark name now contains its visible text (2.5.3). |
| Performance | 4 | Fonts cut from 120 KB to 78 KB; CLS 0; no new libraries. |
| Responsive | 4 | 375–1920 clean; strip switches to two columns below 900px (it truncated at 768). |
| Theming | 3 | One token set; a few literal colours remain in the lightbox and hero placeholder (unchanged). |
| Implementation integrity | 3 | Detector 36/26 → 1/1; the remaining kicker is deliberate. |
| **Total** | **17/20** | Good |

**Polish** fixes applied:
- small labels ≥11px;
- Bodoni card-title and statement leading loosened to 1.3;
- fine-print measures ≤66ch;
- popovers use a 1px ink border instead of a hairline plus diffuse shadow;
- one chevron for all selects;
- clearer empty-state copy.

Not changed, deliberately:
- the "Featured residence" dossier label (the only eyebrow on the site);
- Rates, levies and erf are still unglossed.

## Follow-up (same day)

The open items from the review were closed:

| Item | Change | Verified |
|---|---|---|
| Picker counts ignored other filters (P1): "Sandton 6" beside "0 homes" | Counts are recomputed against all non-location filters; locations with no match drop out (selected one kept); scope line says "matching your other filters". Supersedes the "not changed" note above. | New test: with `pmax=5000000`, every offered location's count equals its results, and the total matches the dataset |
| Wordmark conventional (brand question 9) | A short face-brick rule leads "of South Africa", reusing the hero issue-line device; still typography-only | Nav 64px, lockup 153×37 |
| Mobile collection showed controls before any photo | Tighter header and results spacing on phones | First card top 725px → 588px at 390×844 |
| Property breadcrumb wrapped on phones | Home and province hidden below 600px | One line (22px) for the longest estate names |
| Sort select clipped "Recommended" on phones | Column widened | Full label visible |

Gates after the follow-up: validate 0 errors; build OK; links 0 broken; Playwright **29 passed**.
