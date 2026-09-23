# Business model audit: Luxury Homes of SA

Retrieved: 23 September 2026. Sources: Apify `apify/instagram-scraper` (profile details + latest 150 posts, raw output in `data/raw/`), web search, and fetches of agency pages.

## Conclusion

**Luxury Homes of SA (LHOSA) is an Instagram property curation and marketing platform.** It publishes South African homes for sale and runs paid or arranged collaborations with estate agents. On the evidence available it is **not a registered estate agency and does not hold sales mandates.**

In the prompt's taxonomy it is **D (property curation/media account) combined with E (lead generation via Instagram collaborations)**. There is no evidence for A (a registered agency) or B (an individual agent/team).

## Evidence

| Signal | Finding | Status |
|---|---|---|
| Instagram bio | "Luxury Real Estate / Let's Collaborate👉📩 / Luxuryhomesofsa@gmail.com" | Verified (profile scrape) |
| Business category | "Real Estate Service", `isBusinessAccount: false`, not verified | Verified |
| Link in bio | None (`externalUrl: null`) | Verified |
| Website | None found | Verified absence (web search) |
| Phone / WhatsApp | None published in the bio or any LHOSA-authored caption | Verified absence |
| Email | Gmail address, not an agency domain | Verified |
| Post authorship | 102 of 150 posts authored by @luxuryhomesofsa; **48 are Instagram co-author collaborations authored by third-party agents** (neo_your_fav_realtor 18, properties_with_lelo 13, properties_by_fran_la_reservee 5, kylarose_realty 5, others) | Verified (`ownerUsername`) |
| LHOSA-authored captions | Strict template (features, sizes, rates/levies, beds/baths/garages, ZAR + USD/GBP/EUR). Most carry **no agent or agency credit**; some carry an explicit "For More Info 👤 name 📞 phone 📩 email" block for a third-party agent | Verified |
| Match to agency listings | The Coves listing (Ddn2uNkCAkG) matches Seeff Hartbeespoort & Brits listing 3046119 to the rand, including floor/erf size and hangar; the same home is also indexed on Chas Everitt, Harcourts and ERA | Verified (fetched 23 Sep 2026) |
| First-person agent language ("contact me", "trusting us to guide them", "#yourfavrealtor") | Occurs **only in posts authored by collaborating agents**, never in LHOSA-authored posts | Verified |
| PPRA / FFC registration | No reference anywhere | Cannot be verified |
| Named principal / owner | None published | Cannot be verified |
| Facebook "Luxury Homes South Africa" (Randburg) | Different page, not linked from the Instagram account | **Not** treated as the same entity |

## What LHOSA does (verified)

- Publishes homes for sale across 6 provinces with a consistent caption template.
- Runs Instagram co-author collaborations with agents (Live Real Estate, Zamosh Property Group, Lance Real Estate, and independent agents).
- Invites collaborations by email ("Let's Collaborate").
- Occasionally publishes **rentals and holiday lets** from collaborators (11 posts). These are off-brief for a sales site and excluded.
- Occasionally publishes brand-partner content (KTE Construction).

## Inferred (not verified)

- Uncredited LHOSA posts are reposts of live agency listings. This is confirmed for one listing and strongly suggested for the rest by the identical price formats.
- Collaborations are likely commercial (paid features), given "Let's Collaborate" and the co-author pattern. Terms are unknown.
- When captions say "DM📩", LHOSA forwards buyer enquiries to the listing agent.

## Cannot be verified

Legal entity, owner, PPRA status, commercial terms, whether LHOSA is permitted to republish agency photography, and the current availability of most features.

## Consequences for the website

1. LHOSA is never presented as the listing agency. Every property page says "Luxury Homes of SA does not hold the mandate", and the footer carries the same disclaimer.
2. Where a caption credits an agent, their name, agency (only where evidenced) and published phone/email/Instagram are shown, and enquiries route to them.
3. Where no agent is credited, enquiries route to LHOSA's only verified channels (email and Instagram DM), with the stated promise to connect the buyer with the listing agent.
4. "Sell With Us" is replaced by **List with us**: an agent-facing collaboration page backed by the verified "Let's Collaborate" offer. It promises nothing about reach, results or photography.
5. No Notable Sales section. The only two sold announcements were made by collaborating agents about their own deals, with no price, so they are not LHOSA's track record.

## Who enquiries should go to

| Case | Route |
|---|---|
| Caption credits an agent with phone/email | The agent (call / email), with LHOSA email as a fallback in the form |
| Collaboration authored by an agent with no published contact details | Agent's Instagram, plus LHOSA email |
| Uncredited LHOSA feature | LHOSA: luxuryhomesofsa@gmail.com or Instagram DM |
