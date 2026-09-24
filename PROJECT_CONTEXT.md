# Project context: Luxury Homes of SA website proposal

A static property-**sales** website built from the @luxuryhomesofsa Instagram feed. It is a client proposal (`PROPOSAL_MODE: true`), hosted on GitHub Pages under `/Luxury-Homes-Of-Sa/`.

## Business model

Luxury Homes of SA (LHOSA) is an **Instagram curation and marketing platform** (41,131 followers, "Luxury Real Estate · Let's Collaborate"), not an estate agency. Listings are marketed by third-party agents: 48 of the 150 scraped posts were co-authored by agents, and LHOSA's own posts mirror agency listings (one confirmed against Seeff). The site never presents LHOSA as the mandate holder. Evidence is in `reports/business-model-audit.md`.

## Source hierarchy

1. LHOSA Instagram captions and metadata: the fact source for every property field.
2. A live agency or portal listing, fetched and matched: used to confirm status and link the source.
3. Search-index snippets: leads only, never used to set a field or status.
4. Photographs: never used to infer a feature. Feature flags come from caption text only.

Missing values stay `null` and are shown as "not published; ask the agent".

## Pipeline

```
Apify (token/REST) ─► data/raw/profile-details.json, posts-150.json   (cached; never re-scrape casually)
scripts/parse_posts.py      ─► data/instagram-posts.json   (normalised + classified posts)
scripts/download_media.py   ─► data/raw/media/<shortcode>/NN.jpg (+ data/raw/video/*.mp4)
scripts/hash_media.mjs      ─► data/raw/media-hashes.json  (sha256 + dHash, dimensions, entropy)
scripts/contact_sheet.mjs   ─► visual dedup / audit sheets (manual review)
data/curation.json          ─  hand-reviewed: post→property merges, locations, sourced overrides,
                               verbatim-sourced descriptions, media flags, homepage selections
data/agents.json            ─  verified contacts only
data/external-verification.json ─ fetched live-listing confirmations + unconfirmed leads
scripts/build_dataset.py    ─► data/properties.json, data/sold.json, data/raw/conflicts.json
scripts/build_images.mjs    ─► public/images/properties/<slug>/NN-{480,720,1080}.webp, 01-1080.jpg; public/media/*.mp4
scripts/validate.mjs        ─  fails the build on data/media integrity errors
scripts/build.mjs           ─► dist/ (static HTML, one page per property)
scripts/check_links.mjs     ─  every internal href/src/srcset resolves
scripts/build_reports.py    ─► reports/listing-*.md, media-reconciliation.md
```

Commands: `npm run build` (validate, then generate), `node scripts/check_links.mjs`, `python3 scripts/build_reports.py`.

## Listing reconciliation

Duplicates (a launch post, reels, re-posts and agent collaborations) were merged using identical captions, prices, specs and agents, then **confirmed visually** on contact sheets. dHash alone could not match them, because collaborators reshoot or recrop. Look-alikes with differing specs or photography were kept apart; for example, two Zululami new builds have different kitchens. Conflicts resolve to the most recent published value and are logged. See `reports/listing-reconciliation.md`.

## Status methodology

- **For sale**: a post within 60 days of verification (cutoff 2026-07-25), or a fetched live listing.
- **Availability to be confirmed** (`unknown`): anything older. Hidden from the default collection and labelled wherever shown.
- **Sold / under offer**: only on explicit evidence.
- Instagram dates are never shown as listing dates, and there is no "Newest" sort.

## Third-party attribution

Where a caption credits an agent, the site shows their name, their agency (only with evidence such as an email domain or an explicit credit) and their published phone/email/Instagram, and routes enquiries to them. Uncredited features route to LHOSA (email and Instagram DM, its only verified channels). Agents found only on external agency pages are not copied in; the source listing is linked instead. No WhatsApp is shown anywhere, because none is published. See `reports/listing-provenance.md`.

## Media pipeline

Instagram originals are capped at 1080 px wide, so the design never displays photography above native size. That is why the hero is an asymmetric split rather than full bleed, and the lightbox is capped at 1080 px. Derivatives are WebP 720/1080 (plus 480 and a JPEG fallback for the hero). Reel-only properties get their film, played on demand. See `reports/media-reconciliation.md`.

## Design philosophy

"Particulars": architectural sales particulars presented as an editorial publication. Light render-plaster ground, anodised-aluminium ink, a single face-brick accent, Bodoni Moda for the editorial voice with Manrope for everything functional and IBM Plex Mono only for small technical labels, square geometry. The photography carries all the colour. The copy is about ownership (asking price, arrange a viewing, request details), never stays. Details are in `DESIGN.md`.

### How Exclusive Cape Town was used without copying it

Only its principles were taken: curation over portal density, large photography, restrained UI and attention to place. Everything concrete differs:

| Exclusive Cape Town | Luxury Homes of SA |
|---|---|
| Dark ink/navy + cream + gold | Light plaster ground, charcoal ink, face-brick accent |
| Fraunces + Jost | Bodoni Moda (held at opsz 30) + Manrope, IBM Plex Mono for micro-labels |
| Full-bleed cinematic hero with search bar | Asymmetric split hero with a "Pictured" particulars block (location, specs, asking price); a restrained search strip sits below the hero, never over it |
| Pill buttons, wide-tracked uppercase labels, "N° 02" numbered sections | Square buttons, sentence case, no section numbering |
| Manifesto section, Leaflet map | Factual statement with real figures, data-driven "Explore markets" photo tiles plus a typographic location register |
| Rentals, guests, "stay" | Asking price, dated multi-currency line, viewings, bond illustration |

## Proposal configuration

`site.config.json` holds `BASE_PATH`, `SITE_URL`, `PROPOSAL_MODE` and the business contact defaults. With `PROPOSAL_MODE: true`, every page carries `noindex, nofollow`, robots.txt disallows everything and no sitemap is generated. No proposal notice is visible to visitors.

## Polish pass (customer-facing presentation)

A design, UX and copy pass on the existing build. The dataset, status rules, provenance and validation pipeline were not changed, and Instagram was not re-scraped.

- **Customer-facing provenance simplified.** Property pages now show a concise attribution in the aside: "Marketed by {agent} / {agency} / Featured by Luxury Homes of SA", or "Featured by Luxury Homes of SA / Enquiries are connected with the agent marketing the home". The mandate note, reference, Instagram post dates and any confirmed agency listing link sit in a collapsed **Listing information** disclosure at the end of the page. The global not-an-agency disclaimer lives in the footer. All sourcing remains in `data/` and `reports/`. Accuracy is unchanged: nothing implies LHOSA holds a mandate.
- **Collaboration terminology.** "List with us" implied accepting mandates. It is now **Collaborate** in the nav and footer, and **Feature a property** in CTAs, echoing the verified bio line "Let's Collaborate". The page moved to `/collaborate/`, aimed at agents, developers and property marketers; `/list-with-us/` is a redirect so existing links keep working. It promises no results, reach, photography or valuations.
- **Location discovery.** A photo-led **Explore markets** layer, generated from current inventory (cities with at least two homes for sale; image, count and asking-price range), appears on the home page and at the top of Locations, above the unchanged province → city → estate register.
- **Collection price range.** The fixed price dropdowns were replaced by typed Minimum/Maximum inputs plus a two-handle logarithmic slider bounded by the dataset (R500k to R175m). Input parsing is tolerant, values are clamped, the minimum can never exceed the maximum, slider values are snapped, ARIA value text is given in rand, and state is kept in the URL (`pmin`/`pmax`).
- **Active filter UX.** Removable square chips under the toolbar, with Clear all.
- **Search label** now matches the searched fields: area, estate, property, agent or reference.
- **Enquiry resilience.** "Copy email" (Clipboard API with a fallback and an announced confirmation) sits next to every email address. For uncredited homes, email and Instagram message are equally prominent; credited agents remain the primary contact.
- **Visual polish.**
  - Home: a 5-card curated rhythm, a positioning statement with real figures and a 3-image dossier spread.
  - Property: a five-frame mosaic, and the first viewport answers what, where, how much, the specs and who markets it. The editorial introduction is separated from the particulars. A desktop photo sequence replaces the repeated all-photos grid, so mobile has only one gallery.
  - About, Collaborate and Contact: editorial, image-led pages. Contact splits buyers from agents.
  - Mono type is reduced to figures, labels and references.

## Typography and discovery pass

A targeted refinement of the polish pass. The dataset, status rules (only confirmed homes by default), provenance, agent attribution, prices, the price-range system, URL/Back/Forward behaviour, validation and proposal mode are unchanged. No re-scrape.

- **Typography.** Archivo is retired. Bodoni Moda (weights 400–600, optical size held at 30 for large settings so the hairlines stay architectural rather than fashion) carries the hero, page and section headings, property titles, the dossier, market and city names, the home statement and the property standfirst. Manrope carries navigation, body, buttons, forms, filters, prices, specs and contact details. IBM Plex Mono is cut to one weight (500) and limited to small labels, strip keys, the status tag, gallery counters and the dated FX line. All fonts are self-hosted and trimmed with fontTools. Font payload is 40 KB + 23 KB + 15 KB against the previous 90 KB + 15 KB + 15 KB.
- **Wordmark.** "Luxury Homes / of South Africa": Bodoni Moda over Manrope capitals led by a short face-brick rule, scaled as one em-based lockup in the nav, menu and footer. The boxed "SA" tile is retired. The favicon is "LH" drawn from Bodoni outlines.
- **No automatic dark mode.** One art-directed light palette regardless of the OS setting (a brand decision; all pairs meet WCAG AA). The brick accent was compared at two deeper values and kept.
- **Structured location discovery.** `locationTree()` in `scripts/site/lib.mjs` builds province → city → district → estate/suburb from `data/properties.json`, with counts, for current inventory and for all inventory. Districts are derived, not hard-coded: an area becomes a level only when it lies inside one city that has several areas (Sandton, Atlantic Seaboard, Midstream, Waterfall), so regions that span or contain cities (Garden Route, Ekurhuleni, North Coast) never nest under a city. `scripts/validate.mjs` fails the build if an estate/suburb name sits under two cities, which would make a count disagree with its results.
- **One location state.** The URL holds exactly one of `province`, `city`, `area` or `place` (estate or suburb). `estate=`/`suburb=` are accepted as aliases, and older `?q=<exact location name>` links convert to the structured form. The Province and City selects and the free-text location search were removed; the keyword field is now "Property, agent or reference" (title, development, agent, listing reference).
- **Availability-aware.** The picker offers current locations by default ("Homes currently for sale"); with "Include availability to be confirmed" it switches to the all-inventory tree and says so. With other filters active, counts follow them and locations with no matching home drop out, so a location choice never produces an empty result. Property types follow the same scope.
- **Discovery strip.** Collection: Location, Price (popover with the existing typed range and slider), Bedrooms, Property type, More filters (availability, bathrooms, garages, features) and Show N homes. Home: Location, Price band (only bands holding current homes), Bedrooms and Find a home, placed below the hero; it submits to `/properties/` with query parameters.
- **Locations page.** The register is the same tree: every province, city, district and estate/suburb links straight into the collection, with counts of current homes only. Locations that exist only in unconfirmed inventory sit in a secondary "Availability to be confirmed" block linking with `avail=all`.
- **Zero results.** The empty state names the single filter whose removal brings back the most homes, with a one-step "Remove …" button.
- **Tests.** `npm test` runs Playwright regression tests (`tests/`, served by `tests/serve.mjs` at the Pages base path) for the picker, homepage search, discovery strip, locations page, retained systems, and typography and layout at 375–1920. Run `npm run build` first.

## Known limitations

- 67 of 104 properties are "availability to be confirmed". Only 2 listings were confirmed live externally, because Firecrawl was unauthenticated and Property24 returned 503.
- Photography comes from Instagram at 1080 px maximum. The client should supply originals for large screens.
- 14 properties are reel-only (one cover frame plus film).
- The enquiry forms compose an email in the visitor's mail app; there is no backend. A copy-email fallback is provided for visitors without a mail app.
- Permission to republish agency photography and particulars is unknown and must be confirmed with each agent.
- The bond calculator is illustrative, with an editable example rate (not a quoted or current prime rate).

## Inventory refresh

1. Re-run the Apify scrape into a new `data/raw/posts-<date>.json`, point `parse_posts.py` at it, re-run it and `download_media.py` promptly (CDN URLs expire).
2. Map new posts in `data/curation.json` (new properties, merges into existing slugs, sold posts).
3. Update `recentCutoff`/`verifiedAt`, re-check leads in `data/external-verification.json`.
4. `python3 scripts/build_dataset.py && node scripts/build_images.mjs && npm run build && node scripts/check_links.mjs && python3 scripts/build_reports.py`.

## Potential production integration

- A listing feed from agents (or Property24/Private Property syndication) to replace Instagram scraping and give real listing dates and statuses.
- An enquiry backend (form service, CRM, or email relay) with per-agent routing and consent capture.
- A scheduled refresh (GitHub Action) running the pipeline above, with the validator gating deploys.
- Set `PROPOSAL_MODE: false` and a real domain in `site.config.json` at launch.
