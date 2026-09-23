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

"Particulars": architectural sales particulars presented as an editorial publication. Light render-plaster ground, anodised-aluminium ink, a single face-brick accent, Archivo (variable width) with IBM Plex Mono for figures, square geometry. The photography carries all the colour. The copy is about ownership (asking price, arrange a viewing, request details), never stays. Details are in `DESIGN.md`.

### How Exclusive Cape Town was used without copying it

Only its principles were taken: curation over portal density, large photography, restrained UI and attention to place. Everything concrete differs:

| Exclusive Cape Town | Luxury Homes of SA |
|---|---|
| Dark ink/navy + cream + gold | Light plaster ground, charcoal ink, face-brick accent |
| Fraunces + Jost | Archivo variable + IBM Plex Mono |
| Full-bleed cinematic hero with search bar | Asymmetric split hero, captioned with the pictured home's price |
| Pill buttons, wide-tracked uppercase labels, "N° 02" numbered sections | Square buttons, sentence case, no section numbering |
| Manifesto section, Leaflet map | Factual statement with real figures, typographic location register |
| Rentals, guests, "stay" | Asking price, dated multi-currency line, viewings, bond illustration |

## Proposal configuration

`site.config.json` holds `BASE_PATH`, `SITE_URL`, `PROPOSAL_MODE` and the business contact defaults. With `PROPOSAL_MODE: true`, every page carries `noindex, nofollow`, robots.txt disallows everything and no sitemap is generated. No proposal notice is visible to visitors.

## Known limitations

- 67 of 104 properties are "availability to be confirmed". Only 2 listings were confirmed live externally, because Firecrawl was unauthenticated and Property24 returned 503.
- Photography comes from Instagram at 1080 px maximum. The client should supply originals for large screens.
- 14 properties are reel-only (one cover frame plus film).
- The enquiry forms compose an email in the visitor's mail app; there is no backend.
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
