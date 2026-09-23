# Listing reconciliation

Source: 150 Instagram posts (2025-04-26 to 2026-09-23).

## Outcome

| Result | Count |
|---|---|
| Canonical sale properties | 104 |
| Posts merged into those properties | 130 |
| Status: for sale | 37 |
| Status: unknown (availability to be confirmed) | 67 |
| Sold records (not inventory) | 2 |
| Posts excluded | 17 |

## Classification counts (a post can carry several)

| Category | Posts |
|---|---|
| FOR SALE | 135 |
| PROPERTY TOUR | 49 |
| NEW BUILD | 25 |
| RENTAL-EXCLUDED | 10 |
| SOLD | 2 |
| OTHER | 2 |
| PRICE REDUCED | 1 |
| BRAND-PARTNER | 1 |

## Status methodology

- **for-sale**: an Instagram listing post on or after 2026-07-25 (60 days before verification on 2026-09-23), or a live agency listing confirmed by fetching the page.
- **unknown**: most recent evidence older than the cutoff and no live listing confirmed. Shown only when the visitor opts in to 'Include availability to be confirmed', and labelled on the card and page.
- **sold / under-offer**: only with explicit evidence. None of the 104 properties has it; two sold announcements concern homes never listed with data (see sold.json).
- Instagram post dates are never presented as listing dates. There is no 'Newest' sort.

## Merged duplicates

Merges confirmed visually (contact sheets of carousels/covers) and/or by identical price + specs + agent.

| Property | Posts merged | Evidence |
|---|---|---|
| sandown-estate-townhouse | DdULQX2hwEQ, Dc5q-xWCDNS, Dc0STyBI8QL, Dcx8n4eo0sJ | identical caption, price, agent (4 posts) |
| zululami-sea-view-new-build | DcT1JNqsv4Z, DcRGtrhDGbp | same kitchen/pool frames; same R11,995,000 |
| midstream-ridge-trophy-home | Dc-ivCAIEW2, Dcp86krom-q, DI6gOiOMiiZ | identical caption; agent Fran La Reservee; R33,999,999 (2025) then R33,999,000 |
| eye-of-africa-single-storey-home | Db-i0klsrCy, DbsgbqrMPXU, Da2TfOsR4yd, DX6P8zDs4z4, DVyoYx0jML1, DVbXjzijbhj | same facade and quiver trees in all covers; price R5.1M → R4.99M → R4.8M |
| bedfordview-entertainers-home | DamvwVSoY2r, DaicRFzIUQY, DahileeCEan | identical caption, price, agent Jade Aglioti |
| southdowns-architectural-home | Daj8pGhNESQ, DacMi95jQqP, DYWlNAaCJdY | same ring pendant/dining/timber ceiling in both carousels; same R14,500,000, 3 bed, ±600 m², 4 garages |
| clifton-nettleton-road-residence | DaK7yOQoQs7, DaBUFVnxOXW | same road, R175,000,000, 4 bed; both tagged Lance Real Estate; photos differ |
| hyde-park-arthur-quinton-residence | DZw1rLpI4FC, DZmU1MKIIr0, DUC-A7aCEyV | same pool/night facade in reel covers; same caption and agent |
| thaba-eco-village-apartment | DYkLo1aMsef, DYfIKQljPwz | same agent, estate, R1.1M, 1 bed |
| ridgehill-estate-family-home | DYjcbatDHzY, DYjTLENosg0 | same estate, R4,925,000, 5 bed, same agent |
| oakdene-three-bedroom-apartment | DWbH9NojNfd, DVtcZaYDK4U | same agent, R1,199,000, 3 bed apartment in Oakdene |
| eye-of-africa-double-storey-home | DWHKsmYDAQj, DV_fJmojD-V | same double-storey facade; 5 bed/6 bath/4 garages/930 m² both; price conflict R7.5M vs R7.99M |
| zimbali-ilanga-villa | DdZXLEBsVY0, DcjRjmWDCMH, DcblGfUsAiJ | house number '2', same pergola entrance in all covers; same R5.9M |
| elaleni-the-woods-home | DdRvqqhDBi9, DdHcm-NMbbe | same townhouse row and stepping stones; same R4.25M |
| palm-lakes-family-home | Dcg8Cl4Mvs3, DcgsMroDCMB | same twin-garage facade; same R3,999,990 |

## Look-alikes deliberately NOT merged

| Properties | Why kept separate |
|---|---|
| zululami-ocean-view-residence vs zululami-sea-view-new-build | Different kitchens (brass cone vs white dome pendants, different cabinetry), 5 vs 4 bed, R11.5M vs R11.995M |
| camps-bay-contemporary-family-home, camps-bay-elevated-home, camps-bay-double-storey-home | All R39,995,000 but 6 bed/erf 1,041 vs 5 bed/erf 595 vs 5 bed/floor 1,126 m²; different photography |
| pearl-valley-furnished-residence vs pearl-valley-grand-residence | Both R45M, 5 bed; erf 1,000 vs 1,954 m²; different houses in photos |
| three Val de Vie listings | Different prices, erfs and photography |
| hyde-park-master-built-home vs hyde-park-arthur-quinton-residence | R27.9M vs R39.995M, different specs |

## Field conflicts

| Property | Field | Values (value, post, date) | Chosen |
|---|---|---|---|
| midstream-ridge-trophy-home | priceZAR | 33999999 (DI6gOiOMiiZ, 2025-04-26); 33999000 (Dcp86krom-q, 2026-08-30) | 33999000 (latest) |
| eye-of-africa-single-storey-home | priceZAR | 5100000 (DVyoYx0jML1, 2026-03-12); 4990000 (Da2TfOsR4yd, 2026-07-16); 4800000 (DbsgbqrMPXU, 2026-08-06) | 4800000 (latest) |
| eye-of-africa-double-storey-home | priceZAR | 7500000 (DV_fJmojD-V, 2026-03-17); 7990000 (DWHKsmYDAQj, 2026-03-20) | 7990000 (latest) |
| camps-bay-five-bedroom-home | priceZAR | caption: '**REDUCED** ASKING R15 MILLION' and 'ASKING PRICE: R17.995 MILLION' in the same post | R15,000,000 (reduced) |
| hyde-park-arthur-quinton-residence | floor vs erf | both 912 | both kept as published; flagged |
| bedfordview-entertainers-home | agency | caption: Jade Aglioti (Live Real Estate); search index: Pam Golding | caption retained |

## Excluded posts

| Post | Date | Author | Reason |
|---|---|---|---|
| [Ddapx4-IE8G](https://www.instagram.com/p/Ddapx4-IE8G/) | 2026-09-18 | @properties_by_fran_la_reservee | No price, specification or identifiable property (insufficient data) |
| [DcldtqoCGR6](https://www.instagram.com/p/DcldtqoCGR6/) | 2026-08-28 | @kylarose_realty | Rental / holiday let (sales-only site) |
| [Dbsb0IcCCO0](https://www.instagram.com/p/Dbsb0IcCCO0/) | 2026-08-06 | @luxuryhomesofsa | Rental / holiday let (sales-only site) |
| [DaxlQsPCImS](https://www.instagram.com/p/DaxlQsPCImS/) | 2026-07-14 | @kylarose_realty | Rental / holiday let (sales-only site) |
| [Dau0tefCMIU](https://www.instagram.com/p/Dau0tefCMIU/) | 2026-07-13 | @kylarose_realty | Rental / holiday let (sales-only site) |
| [DZE1PadIUdy](https://www.instagram.com/p/DZE1PadIUdy/) | 2026-06-02 | @luxuryhomesofsa | Rental / holiday let (sales-only site) |
| [DZCzlpLodMQ](https://www.instagram.com/p/DZCzlpLodMQ/) | 2026-06-01 | @luxuryhomesofsa | Rental / holiday let (sales-only site) |
| [DYzJwyhiD_w](https://www.instagram.com/p/DYzJwyhiD_w/) | 2026-05-26 | @luxuryhomesofsa | Rental / holiday let (sales-only site) |
| [DYjd8HLtkuM](https://www.instagram.com/p/DYjd8HLtkuM/) | 2026-05-20 | @arielvanheerden | Rental (Bantry Bay villa) |
| [DYMtmwRCPaQ](https://www.instagram.com/p/DYMtmwRCPaQ/) | 2026-05-11 | @luxuryhomesofsa | Rental / holiday let (sales-only site) |
| [DYFWtjuMmaa](https://www.instagram.com/p/DYFWtjuMmaa/) | 2026-05-08 | @neo_your_fav_realtor | No price, specification or identifiable property (insufficient data) |
| [DYEZxlBCG8v](https://www.instagram.com/p/DYEZxlBCG8v/) | 2026-05-08 | @luxuryhomesofsa | Rental / holiday let (sales-only site) |
| [DX_NPSDiI3Z](https://www.instagram.com/p/DX_NPSDiI3Z/) | 2026-05-06 | @luxuryhomesofsa | Rental / holiday let (sales-only site) |
| [DX9YD76jFaJ](https://www.instagram.com/p/DX9YD76jFaJ/) | 2026-05-05 | @neo_your_fav_realtor | No price, specification or identifiable property (insufficient data) |
| [DXTdt4qiClf](https://www.instagram.com/p/DXTdt4qiClf/) | 2026-04-19 | @luxuryhomesofsa | Brand partner content (KTE Construction) |
| [DWRd7YQjHEW](https://www.instagram.com/p/DWRd7YQjHEW/) | 2026-03-24 | @neo_your_fav_realtor | Teaser reel with no property data |
| [DWEx73aDF0d](https://www.instagram.com/p/DWEx73aDF0d/) | 2026-03-19 | @neo_your_fav_realtor | Teaser reel with no property data |

## Sold records

- **bryanston-sold-2026**: Agent caption (Fran La Reservee, 7 Jun 2026): 'The property has since been sold and is no longer available'. No price or specifications published.
- **eye-of-africa-sold-2026**: Agent reel (neo_your_fav_realtor, 26 Mar 2026): 'Congratulations to the seller and buyer for a seamless transaction'. No price or specifications published.
