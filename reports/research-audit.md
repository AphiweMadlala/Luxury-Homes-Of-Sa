# Research audit

Every material business fact, with its source, retrieval date and confidence. Retrieval date for everything below: **2026-09-23**.

| Fact | Source | URL | Confidence | Conflicts | Final value |
|---|---|---|---|---|---|
| Official business name | Instagram profile `fullName` | https://www.instagram.com/luxuryhomesofsa/ | High | Emoji flag in display name ("Luxury Homes Of SA🇿🇦") | Luxury Homes of SA |
| Instagram handle | Profile scrape | same | High | none | @luxuryhomesofsa |
| Followers | Profile scrape (`followersCount`) | same | High (point in time) | none | 41,131 (shown as "more than 41,000" / "41k") |
| Posts | Profile scrape | same | High | none | 530 |
| Bio / positioning | Profile scrape | same | High | none | "Luxury Real Estate / Let's Collaborate / Luxuryhomesofsa@gmail.com" |
| Website | Profile (`externalUrl` null), web search | n/a | High (absence) | none | None |
| Email | Bio | same | High | none | luxuryhomesofsa@gmail.com |
| Phone | Bio, all LHOSA captions | n/a | High (absence) | none | **None published**, not shown |
| WhatsApp | Bio, all 150 captions (text search) | n/a | High (absence) | none | **None**, no WhatsApp buttons anywhere |
| Business category | Profile scrape | same | Medium | "Real Estate Service" category is self-selected | Not used as a claim |
| Registered agency / PPRA | Web search; no reference found | n/a | Cannot verify | none | Not claimed |
| Service areas | Derived from 104 sale listings | `data/properties.json` | High | none | Gauteng, Western Cape, KwaZulu-Natal, North West, Mpumalanga, Eastern Cape |
| Agent/team information | Captions + co-author metadata | `data/agents.json` | High for the named fields | Kyla's surname is inferred only from a handle, so shown as "Kyla" | 13 contacts, see agents.json |
| Company description | Bio + observed behaviour | business-model-audit.md | Medium | none | "Instagram property publication featuring homes for sale, in collaboration with agents" |
| Seller services | Bio "Let's Collaborate" | profile | Medium | No stated terms, reach or pricing | "List with us" page, collaboration by email only |
| Buyer services | Captions "DM📩" | posts | Medium | none | Enquiries answered by email/DM and passed to the agent |
| Developments | Captions | posts | High (absence) | "New development in Northcliff" post has no data | None modelled |
| Property sourcing | Caption templates; one confirmed agency match | seeff.com listing 3046119 | Medium (1 confirmed) | 73 of 104 listings carry no agent credit | Stated as "marketed by an estate agency" |
| Viewing process | Captions ("private viewings by appointment", "DM to schedule") | posts | Medium | none | "Arrange a viewing" → email/call agent or LHOSA |
| Enquiry process | As above | posts | Medium | none | Email / Instagram DM / agent phone |
| Facebook page "Luxury Homes South Africa", Randburg | Web search | facebook.com/LuxuryHomesSA | Low link to LHOSA | Different name, no cross-link | **Excluded** |

## External listing checks

| Property | Method | Finding |
|---|---|---|
| the-coves-aviation-residence | WebFetch of the Seeff listing | Active, R15,862,500, 5 bed / 5 bath / 970 m² / 2,638 m², Seeff Hartbeespoort & Brits |
| southdowns-family-home | WebFetch of the Private Property area page | Active, R9,950,000, 5 bed, 40 Club Crescent |
| constantia-mountain-view-residence | Search index only | Possibly "Under Offer"; source page not retrieved, left unknown |
| pearl-valley-grand-residence | Search index + Property24 fetch | The Property24 page was a **different** house (R36.9M, Chas Everitt). Not matched |
| bedfordview-entertainers-home | Search index | Indexed under Pam Golding, but the caption credits Jade Aglioti (Live Real Estate). Caption attribution retained, conflict logged |
| 4 others | Search index | Leads only; see `data/external-verification.json` |

Tools: Firecrawl CLI was installed but **not authenticated**, so web research used web search and page fetches. Property24 returned HTTP 503 to fetches, while Private Property and agency sites were fetchable.
