# DESIGN.md: Luxury Homes of SA, "Particulars"

Derived from the shipped build (`public/css/site.css`, `scripts/site/lib.mjs`, `scripts/build.mjs`). Brand provenance for each decision is in `reports/brand-audit.md`.

## Concept

**Architectural sales particulars, published as an editorial.** The account's own caption discipline (spec checklists, sizes, rates and levies, ZAR plus foreign-currency price) becomes the typographic system. Photography carries all colour; the interface is mineral and quiet. The emotional line is *ownership*, not a stay.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--ground` | `#f1f2ef` render plaster | page |
| `--surface` | `#fafaf8` | enquiry aside, dossier panel, inputs, discovery strip, sheets |
| `--sunk` | `#e5e7e3` | image placeholders, unknown-status tag |
| `--ink` | `#1b2023` anodised aluminium | text, ink buttons, sheet borders, field focus ring |
| `--ink-2` | `#384045` | body copy |
| `--muted` | `#586165` | meta, labels, notes (≥5:1 on all grounds) |
| `--line` | `#cfd3ce` | section rules (decorative) |
| `--line-strong` | `#7b837f` | control borders (≥3:1) |
| `--brick` | `#a1421f` face-brick | **the only accent**: primary CTA, focus ring on buttons and links, selected location, feature markers, highlight rule, error text |
| `--scrim` | `rgba(18,21,23,.62)` | text over photography |

**One light palette, no automatic dark mode (typography pass).** The site is an art-directed brand presentation, so it no longer follows `prefers-color-scheme`: `color-scheme: light`, `<meta name="color-scheme" content="light">` and a single `theme-color`. All text pairs meet WCAG AA on the light ground (ink 14.6:1, muted 5.6:1). The brick accent was reviewed against Bodoni and kept at `#a1421f`: side-by-side renders at `#94391a` and `#873316` were barely different or drifted to brown oxblood (a luxury cliché), and contrast is already 5.6:1 on the ground (6.1:1 for plaster text on brick buttons). There is one deliberate colour block per page: the ink closing band on home and About.

## Type

Three families, each with one job. All are self-hosted latin subsets (no runtime Google Fonts request), and Bodoni and Manrope are preloaded.

- **Bodoni Moda** (variable, `wght` limited to 400–600 with fontTools, `opsz` 6–96; 40 KB) is the **editorial voice**: hero headline, page titles, section `h2`s, property titles (page and cards), the dossier title, market and city names, the home statement, the property standfirst, the results count, sheet titles and the wordmark. Weight 500 for headings and 400 for editorial statements. No italics.
  - **Optical size is held at 30** for large settings (`font-variation-settings: "opsz" 30` on `.display`, `.h2`, statement, dossier title, markets, standfirst…). The opsz 96 display cut has hairline serifs that read as a fashion magazine and thin out on phones; opsz 30 keeps the Didone contrast with sturdier, architectural hairlines. Settings of 24px and below (card titles) use automatic optical sizing.
  - Bodoni is **not** used for filters, buttons, body copy, specifications, prices, agent details or anything below about 22px. The location picker rows are Manrope for this reason.
- **Manrope** (variable 400–600; 23 KB) for everything functional: navigation, body, descriptions, buttons, forms, filters, strip values, prices, specs, contact details, chips and the `.h3` sub-heading.
  - Prices: Manrope 600, tabular lining numerals, rand grouped with spaces (`R15 862 500`), letter-spacing −0.015 to −0.025em at large sizes.
  - Body 1rem/1.62; `.body-copy` 1.03rem; `.lede` 1.08–1.25rem.
- **IBM Plex Mono 500** only (the 400 file was removed) for small technical particulars: `.label` micro-labels (Pictured, Asking price, Marketed by, Featured residence, footer heads), the particulars-sheet keys, discovery-strip keys (Location, Price, Bedrooms, Property type), the unconfirmed status tag, the gallery counters and the dated FX line. Minimum 0.7rem (11.2px). Never used for headings, prose, prices, place names, buttons or long labels.
- Scale: display `clamp(2.5rem, …, 4.85rem)` (hero `…4.4rem`, max 12ch), page title `…4.3rem`, h2 `clamp(1.9rem, …, 3.05rem)`, detail/prose h2 1.5–1.85rem, card title 1.5rem/1.3, `.h3` Manrope 600 1.1–1.25rem.
- Sentence case everywhere. Uppercase is reserved for the small mono labels and the picker's province rows.

## Wordmark

A typographic lockup, no graphic device: **"Luxury Homes"** in Bodoni Moda 500 over **"of South Africa"** in Manrope 600 capitals (0.49em, 0.13em tracking, ≥11px in the nav), led by a short 1.5px face-brick rule: the one owned detail, the same device as the hero's issue line. Everything is sized in em of `.wordmark`'s font-size (1.42rem in the nav and menu, 2.1rem in the footer), so the lockup scales as one; the row gap clears the descender of the "y". The nav stays 64px. The favicon is "LH" drawn from Bodoni Moda outlines (extracted with fontTools, so it needs no webfont) in plaster on ink. Its accessible name is "Luxury Homes of South Africa, home", so the visible text is contained in the name (WCAG 2.5.3). The boxed mono "SA" tile of the Archivo concept is retired.

## Geometry

- Radius **0** everywhere: buttons, inputs, cards, images, lightbox controls.
- Rules, not boxes: sections are separated by 1px `--line` top rules. Filled `--surface` areas are limited to the enquiry aside, the homepage dossier band, the Collaborate CTA panel and the Contact agent panel.
- Cards are **unboxed**: image, small Manrope place line, Bodoni title, Manrope 600 price and a Manrope spec row.

## Layout

- Container max 1440px; gutter `clamp(16px, 4.2vw, 56px)`; section rhythm `clamp(64px, 9vw, 128px)`.
- **Hero: asymmetric split** (5fr text / 7fr photograph). The "Pictured" particulars block anchors the top of the text column; headline, lede and one CTA sit at the bottom. The split exists because Instagram originals top out at 1080px, so the photograph is never shown far above native size.
- Home sections use a different layout family each (see the polish-pass additions below for the current order).
- Property page: a five-frame opening mosaic (2.2fr lead plus a 2×2 grid, "All N photographs"; lead plus two below 5 frames) on desktop, and a scroll-snap swipe with counter on mobile; then 7/4 particulars and the sticky aside; then ruled 3/8 detail rows.

## Layout additions (polish pass)

- **Home:** hero → curated five (7/5 lead + stacked pair, then 8/4 wide and narrow at different aspect ratios) → positioning statement with real figures (homes for sale, provinces, asking-price range) → **dossier spread** on the surface tone (main image, two supporting frames chosen by eye, particulars panel) → **Explore markets** → collaborate band → closing buyer CTA.
- **Explore markets** is generated from inventory: every city with two or more homes for sale, ordered by count. The image is the highest-priced home there with a full gallery, avoiding images already used above. Tiles show the province, the market name (Bodoni), the count (Manrope 600) and price range, and the estates. Layout: 7/5, 5/7, then four at 3 columns.
- **Property page, first viewport:** gallery → place line → title → asking price → spec strip; the aside holds attribution, one primary CTA plus one secondary (Call the agent, or Message on Instagram), and contact lines with copy email. Then the editorial introduction (lede and body, sans), a desktop photo sequence (4 frames, 7/5 alternating, with "View all N photographs"), features, film, financials, location, enquiry, and the **Listing information** disclosure (source, mandate note, Instagram dates).
- **Content pages:** `split` (text plus photograph), `pillars` (3 columns under a rule), `gallery-pair` (7/5), `steps` (3 columns with 2px ink top rules), `cta-panel` (surface), `audiences` (buyer form 7 / agent panel 5 on surface).

## Components

- **Buttons**: primary (brick), ink, line, and line-inverse on the ink closing band. 48px minimum height, never wrap. One label per intent: "Enquire" (site contact), "Explore properties", "Arrange a viewing" (for-sale) or "Check availability" (unconfirmed), "Call {first name}" when a phone is published.
- **Status**: for-sale is the default and carries no badge. Unconfirmed homes carry a sunk mono tag, "Availability to be confirmed", on cards and a status line on the page.
- **Features**: two-column list with 10×2px brick markers. Caption highlights get a 2px brick left rule.
- **Financials**: figure tiles (value plus mono label), the dated FX line "As published {date}: US$… / £… / €…. Indicative only", and a collapsible illustrative bond calculator (for-sale only, editable example rate, disclaimer).
- **Copy email** (`.copy`): a small square outline button next to every email address. Clipboard API with a textarea fallback; the label changes to "Copied" and "Email copied" is announced in a live region.
- **Active filter chips** (`.chip`): square, 36px, surface fill, 1px line-strong border, × glyph. Each removes one filter; "Clear all" appears with two or more.
- **Price range**: typed Minimum/Maximum (accepts R5 000 000, 5000000, 5,000,000, 5m, 750k) plus a two-handle slider on a logarithmic scale between the dataset bounds, snapped to R50k/R100k/R250k/R500k/R1m steps by band. Square ink thumbs, brick fill, `aria-valuetext` in rand, and a 20-step minimum gap so the handles never overlap.
- **Attribution** (`.attrib`): "Marketed by / name / agency / Featured by Luxury Homes of SA", or "Featured by Luxury Homes of SA / Enquiries are connected with the agent marketing the home."
- **Listing information** (`details.listing-info`): muted, collapsed by default.
- **Lightbox**: near-black, max 1080px image, arrows/Escape/swipe, focus trap and restore, scroll lock.
- **Filter drawer** (<1025px): full-screen, sticky head, pinned Reset / "Show N homes" foot.
- **Sticky enquiry bar** (<900px): price, place and Enquire. Shown only when the aside is off screen and the form is not.
- **Icons**: Phosphor regular, inlined at build time, 1.15em (18px in buttons).

## Discovery (typography pass)

- **Structured location picker** (`public/js/location.js`, markup from `locPicker()` in `scripts/build.mjs`). The options are generated at build time from `data/properties.json` by `locationTree()` in `scripts/site/lib.mjs`: province → city → district → estate or suburb, each with its home count. A district level (Sandton, Atlantic Seaboard, Midstream, Waterfall) appears only where an area sits inside one city that has several areas, and groups two or more places. Regional areas that span cities (Garden Route, Ekurhuleni, North Coast, Cape Winelands) never nest under a city. There are two trees, current inventory and all inventory, and the picker shows the one matching the availability state, with a scope line ("Homes currently for sale"). When other filters are active (price, bedrooms, type, bathrooms, garages, features, keyword), counts are recomputed against them, locations with no match are left out (the selected one stays) and the scope line adds "matching your other filters". Nothing with zero homes is ever offered.
  - Semantics: a trigger button (`aria-haspopup="dialog"`) opens a dialog holding a `listbox`; options take roving focus (Arrow keys, Home/End, PageUp/PageDown, Enter/Space), typing jumps to **Find a location**, which filters the known locations only ("No current homes in that location."), and Escape or the close button restores focus to the trigger. A click outside closes without stealing focus.
  - Visual: an "All South Africa" row, then Manrope rows indented 18px per level: province in small capitals, city 600, district 600, estate or suburb regular. Right-aligned tabular counts. Selected option has a brick inset rule; focused option an ink inset rule.
- **Discovery strip** (`.strip`): one ruled bar of labelled cells with a mono key over a Manrope value. Collection: Location, Price (popover with the typed min/max and log slider), Bedrooms, Property type (native selects dressed as cells), More filters (with a brick count badge) and Show N homes (ink). Sticky under the nav on desktop, with `scroll-padding-top` so focused elements are never hidden behind it. Below 900px it becomes a two-column grid (Location full width). Home: Location, Price band, Bedrooms and a brick **Find a home**, placed directly below the hero under the Bodoni line "Search N homes".
- **Sheets** (`.sheet`): one dialog pattern for the location picker, price and More filters. Anchored popovers with a 1px ink border (no drop shadow) on desktop; More filters is a right side sheet over a scrim; on phones all become full-screen sheets (price is a bottom sheet) with 44px+ rows, internal scroll, body scroll lock, focus trap and focus restore (`window.lhPop` in `site.js`).
- **Keyword field**: "Property, agent or reference" searches title, development, agent and listing reference only. Location words are not searched; older `?q=<exact location>` links are converted to the structured location.
- **Phones**: the collection's first photograph sits within the first viewport (lede and spacing tightened); property breadcrumbs drop Home and province so they stay on one line.
- **Zero results**: the Show button reads "No matches", and the empty state names the one filter whose removal brings back the most homes, with a "Remove …" button, alongside "Include to be confirmed" where relevant.
- **Focus**: buttons and links keep the brick ring; fields take an ink ring, because brick is also the error colour.

## Motion

A 16px rise plus fade on `.reveal` sections (0.7s, `cubic-bezier(.2,.7,.2,1)`), gated on JS (`html.js`) and `prefers-reduced-motion: no-preference`. The hero photograph settles from 1.04 scale. Card images scale 1.025 on hover. Nothing loops and nothing autoplays.

## Voice

Terminology: **Collaborate** (nav, footer) and **Feature a property** (CTAs), from the account's verified "Let's Collaborate". "List with us" was retired because it implied the account takes mandates; `/list-with-us/` redirects to `/collaborate/`.


Factual, confident and brief. Ownership vocabulary: asking price, for sale, arrange a viewing, request details, marketed by, erf, rates and levies, transfer duty. No rental words (stay, book, guests, per night), no "dream home" or "luxury redefined". No em-dashes in visible copy (source captions are normalised).

## Explicitly not Exclusive Cape Town

Light ground (not navy), no gold, no Fraunces or Jost (Bodoni Moda at opsz 30 plus Manrope, square geometry), no pills, no wide-tracked uppercase nav, no "N° 0x" numbering, no manifesto, no map, no full-bleed hero with search (the search strip sits below the split hero). Also not Durban Luxe: no bronze or warm metallic; the accent stays face-brick.
