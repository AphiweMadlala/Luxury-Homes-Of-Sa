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
