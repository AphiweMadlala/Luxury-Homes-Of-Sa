# DESIGN.md: Luxury Homes of SA, "Particulars"

Derived from the shipped build (`public/css/site.css`, `scripts/site/lib.mjs`, `scripts/build.mjs`). Brand provenance for each decision is in `reports/brand-audit.md`.

## Concept

**Architectural sales particulars, published as an editorial.** The account's own caption discipline (spec checklists, sizes, rates and levies, ZAR plus foreign-currency price) becomes the typographic system. Photography carries all colour; the interface is mineral and quiet. The emotional line is *ownership*, not a stay.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ground` | `#f1f2ef` render plaster | `#121517` | page |
| `--surface` | `#fafaf8` | `#191d20` | enquiry aside, dossier panel, inputs |
| `--sunk` | `#e5e7e3` | `#22272a` | image placeholders, unknown-status tag |
| `--ink` | `#1b2023` anodised aluminium | `#e8eae6` | text, ink buttons, SA tile |
| `--ink-2` | `#384045` | `#c9cdc9` | body copy |
| `--muted` | `#586165` | `#9ba3a6` | meta, labels, notes (≥5:1 on all grounds) |
| `--line` | `#cfd3ce` | `#2f3539` | section rules (decorative) |
| `--line-strong` | `#7b837f` | `#6e7875` | control borders (≥3:1) |
| `--brick` | `#a1421f` face-brick | `#e27b55` | **the only accent**: primary CTA, focus ring, feature markers, highlight rule |
| `--scrim` | `rgba(18,21,23,.62)` | `rgba(8,10,11,.66)` | text over photography |

Theme follows `prefers-color-scheme`. There is one deliberate colour block per page: the ink closing band on home and About.

## Type

- **Archivo** (variable, self-hosted, `wdth 62–125`, `wght 100–900`) for everything. The width axis is the signature: display at `font-stretch: 116–118%`, headings 104–112%, buttons 108%, body 100%.
- **IBM Plex Mono** 400/500 is reserved for **figures and technical particulars**: spec rows (beds/baths/garages/m²), market counts and price ranges, the dated FX line, form field labels, small uppercase `.label`s, references and the gallery counter. It is never used for place names, attribution, editorial copy or breadcrumbs (`.meta`, `.card__place` and `.crumbs` are sans since the polish pass).
- Scale: display `clamp(2.25rem, …, 4.25rem)` (hero `…3.3rem`), h2 `clamp(1.65rem, …, 2.6rem)`, h3 1.2–1.4rem, body 1.0625rem/1.6, meta .9rem sans, figures (`.fig`) .8125rem mono.
- Prices: Archivo 600 at 110% width, tabular lining numerals, rand grouped with non-breaking spaces (`R15 862 500`).
- Sentence case everywhere. Uppercase is reserved for small mono `.label`s (Pictured, Asking price, Marketed by, footer column heads).
- Deviation, recorded on purpose: the home hero headline sets as three short expanded lines at desktop, not two. It fits the first viewport with its CTA at every tested width; compressing it to two lines meant dropping the expanded width that carries the identity.

## Geometry

- Radius **0** everywhere: buttons, inputs, cards, images, lightbox controls.
- Rules, not boxes: sections are separated by 1px `--line` top rules. Filled `--surface` areas are limited to the enquiry aside, the homepage dossier band, the Collaborate CTA panel and the Contact agent panel.
- Cards are **unboxed**: image, sans place line, title, price and a mono spec row.

## Layout

- Container max 1440px; gutter `clamp(16px, 4.2vw, 56px)`; section rhythm `clamp(64px, 9vw, 128px)`.
- **Hero: asymmetric split** (5fr text / 7fr photograph). The "Pictured" particulars block anchors the top of the text column; headline, lede and one CTA sit at the bottom. The split exists because Instagram originals top out at 1080px, so the photograph is never shown far above native size.
- Home sections use a different layout family each (see the polish-pass additions below for the current order).
- Property page: a five-frame opening mosaic (2.2fr lead plus a 2×2 grid, "All N photographs"; lead plus two below 5 frames) on desktop, and a scroll-snap swipe with counter on mobile; then 7/4 particulars and the sticky aside; then ruled 3/8 detail rows.

## Layout additions (polish pass)

- **Home:** hero → curated five (7/5 lead + stacked pair, then 8/4 wide and narrow at different aspect ratios) → positioning statement with real figures (homes for sale, provinces, asking-price range) → **dossier spread** on the surface tone (main image, two supporting frames chosen by eye, particulars panel) → **Explore markets** → collaborate band → closing buyer CTA.
- **Explore markets** is generated from inventory: every city with two or more homes for sale, ordered by count. The image is the highest-priced home there with a full gallery, avoiding images already used above. Tiles show the province, the market name (expanded Archivo), the count and price range in mono, and the estates. Layout: 7/5, 5/7, then four at 3 columns.
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

## Motion

A 16px rise plus fade on `.reveal` sections (0.7s, `cubic-bezier(.2,.7,.2,1)`), gated on JS (`html.js`) and `prefers-reduced-motion: no-preference`. The hero photograph settles from 1.04 scale. Card images scale 1.025 on hover. Nothing loops and nothing autoplays.

## Voice

Terminology: **Collaborate** (nav, footer) and **Feature a property** (CTAs), from the account's verified "Let's Collaborate". "List with us" was retired because it implied the account takes mandates; `/list-with-us/` redirects to `/collaborate/`.


Factual, confident and brief. Ownership vocabulary: asking price, for sale, arrange a viewing, request details, marketed by, erf, rates and levies, transfer duty. No rental words (stay, book, guests, per night), no "dream home" or "luxury redefined". No em-dashes in visible copy (source captions are normalised).

## Explicitly not Exclusive Cape Town

Light ground (not navy), no gold, no Fraunces or Jost, no pills, no wide-tracked uppercase nav, no "N° 0x" numbering, no manifesto, no map, no full-bleed hero with search.
