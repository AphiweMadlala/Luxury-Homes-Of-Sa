"""Generate data-driven reports (listing reconciliation, provenance, media) from the canonical dataset.
Re-run after any data refresh: python3 scripts/build_reports.py
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
R = lambda f: json.loads((ROOT / f).read_text())
props = R("data/properties.json")
posts = {p["shortcode"]: p for p in R("data/instagram-posts.json")}
agents = {a["id"]: a for a in R("data/agents.json")}
cur = R("data/curation.json")
media = R("data/media-manifest.json")
sold = R("data/sold.json")
unmapped = R("data/raw/unmapped-posts.json")
conflicts = R("data/raw/conflicts.json")
hashes = R("data/raw/media-hashes.json")
ext = R("data/external-verification.json")
rand = lambda n: "R" + f"{n:,.0f}".replace(",", " ") if n else "n/a"

REASONS = {
    "RENTAL-EXCLUDED": "Rental / holiday let (sales-only site)",
    "BRAND-PARTNER": "Brand partner content (KTE Construction)",
    "OTHER": "Teaser reel with no property data",
}

# ---------- listing reconciliation ----------
st = Counter(p["status"] for p in props)
cat = Counter(c for p in posts.values() for c in p["categories"])
L = ["# Listing reconciliation", "",
     f"Source: {len(posts)} Instagram posts ({min(p['date'] for p in posts.values())[:10]} to {max(p['date'] for p in posts.values())[:10]}).",
     "", "## Outcome", "",
     "| Result | Count |", "|---|---|",
     f"| Canonical sale properties | {len(props)} |",
     f"| Posts merged into those properties | {sum(len(p['instagramPosts']) for p in props)} |",
     f"| Status: for sale | {st['for-sale']} |", f"| Status: unknown (availability to be confirmed) | {st['unknown']} |",
     f"| Sold records (not inventory) | {len(sold)} |", f"| Posts excluded | {len(unmapped)} |", "",
     "## Classification counts (a post can carry several)", "", "| Category | Posts |", "|---|---|"]
L += [f"| {k} | {v} |" for k, v in cat.most_common()]
L += ["", "## Status methodology", "",
      f"- **for-sale**: an Instagram listing post on or after {cur['recentCutoff']} (60 days before verification on {cur['verifiedAt']}), or a live agency listing confirmed by fetching the page.",
      "- **unknown**: most recent evidence older than the cutoff and no live listing confirmed. Shown only when the visitor opts in to 'Include availability to be confirmed', and labelled on the card and page.",
      "- **sold / under-offer**: only with explicit evidence. None of the 104 properties has it; two sold announcements concern homes never listed with data (see sold.json).",
      "- Instagram post dates are never presented as listing dates. There is no 'Newest' sort.", "",
      "## Merged duplicates", "", "Merges confirmed visually (contact sheets of carousels/covers) and/or by identical price + specs + agent.", "",
      "| Property | Posts merged | Evidence |", "|---|---|---|"]
EVID = {
    "sandown-estate-townhouse": "identical caption, price, agent (4 posts)",
    "zululami-sea-view-new-build": "same kitchen/pool frames; same R11,995,000",
    "midstream-ridge-trophy-home": "identical caption; agent Fran La Reservee; R33,999,999 (2025) then R33,999,000",
    "eye-of-africa-single-storey-home": "same facade and quiver trees in all covers; price R5.1M → R4.99M → R4.8M",
    "bedfordview-entertainers-home": "identical caption, price, agent Jade Aglioti",
    "southdowns-architectural-home": "same ring pendant/dining/timber ceiling in both carousels; same R14,500,000, 3 bed, ±600 m², 4 garages",
    "clifton-nettleton-road-residence": "same road, R175,000,000, 4 bed; both tagged Lance Real Estate; photos differ",
    "hyde-park-arthur-quinton-residence": "same pool/night facade in reel covers; same caption and agent",
    "thaba-eco-village-apartment": "same agent, estate, R1.1M, 1 bed",
    "ridgehill-estate-family-home": "same estate, R4,925,000, 5 bed, same agent",
    "oakdene-three-bedroom-apartment": "same agent, R1,199,000, 3 bed apartment in Oakdene",
    "eye-of-africa-double-storey-home": "same double-storey facade; 5 bed/6 bath/4 garages/930 m² both; price conflict R7.5M vs R7.99M",
    "zimbali-ilanga-villa": "house number '2', same pergola entrance in all covers; same R5.9M",
    "elaleni-the-woods-home": "same townhouse row and stepping stones; same R4.25M",
    "palm-lakes-family-home": "same twin-garage facade; same R3,999,990",
}
for p in props:
    if len(p["instagramPosts"]) > 1:
        L.append(f"| {p['slug']} | {', '.join(x['shortcode'] for x in p['instagramPosts'])} | {EVID.get(p['slug'], 'identical caption/specs')} |")
L += ["", "## Look-alikes deliberately NOT merged", "",
      "| Properties | Why kept separate |", "|---|---|",
      "| zululami-ocean-view-residence vs zululami-sea-view-new-build | Different kitchens (brass cone vs white dome pendants, different cabinetry), 5 vs 4 bed, R11.5M vs R11.995M |",
      "| camps-bay-contemporary-family-home, camps-bay-elevated-home, camps-bay-double-storey-home | All R39,995,000 but 6 bed/erf 1,041 vs 5 bed/erf 595 vs 5 bed/floor 1,126 m²; different photography |",
      "| pearl-valley-furnished-residence vs pearl-valley-grand-residence | Both R45M, 5 bed; erf 1,000 vs 1,954 m²; different houses in photos |",
      "| three Val de Vie listings | Different prices, erfs and photography |",
      "| hyde-park-master-built-home vs hyde-park-arthur-quinton-residence | R27.9M vs R39.995M, different specs |", "",
      "## Field conflicts", "", "| Property | Field | Values (value, post, date) | Chosen |", "|---|---|---|---|"]
for c in conflicts:
    L.append(f"| {c['slug']} | {c['field']} | {'; '.join(f'{v[0]} ({v[1]}, {v[2]})' for v in c['values'])} | {c['chosen']} (latest) |")
L += ["| camps-bay-five-bedroom-home | priceZAR | caption: '**REDUCED** ASKING R15 MILLION' and 'ASKING PRICE: R17.995 MILLION' in the same post | R15,000,000 (reduced) |",
      "| hyde-park-arthur-quinton-residence | floor vs erf | both 912 | both kept as published; flagged |",
      "| bedfordview-entertainers-home | agency | caption: Jade Aglioti (Live Real Estate); search index: Pam Golding | caption retained |", "",
      "## Excluded posts", "", "| Post | Date | Author | Reason |", "|---|---|---|---|"]
for x in unmapped:
    reason = next((REASONS[c] for c in x["categories"] if c in REASONS), None)
    if not reason:
        reason = "Rental (Bantry Bay villa)" if x["shortcode"] == "DYjd8HLtkuM" else "No price, specification or identifiable property (insufficient data)"
    L.append(f"| [{x['shortcode']}](https://www.instagram.com/p/{x['shortcode']}/) | {x['date']} | @{x['author']} | {reason} |")
L += ["", "## Sold records", ""] + [f"- **{s['slug']}**: {s['evidence']}" for s in sold]
(ROOT / "reports/listing-reconciliation.md").write_text("\n".join(L) + "\n")

# ---------- provenance ----------
P = ["# Listing provenance", "",
     "LHOSA is a curation/marketing platform (see business-model-audit.md). **It is not treated as the mandate holder for any listing.**", "",
     "| Provenance | Properties | For sale |", "|---|---|---|"]
pv = Counter(p["provenance"] for p in props); pvs = Counter(p["provenance"] for p in props if p["status"] == "for-sale")
P += [f"| {k} | {v} | {pvs[k]} |" for k, v in pv.items()]
P += ["", "- **agent-collaboration**: a caption contact block credits an agent, or the post is authored/co-authored by the agent. The website shows the agent and routes enquiries to them.",
      "- **lhosa-feature-unattributed**: LHOSA's post carries no agent credit. The website says the home is marketed by an estate agency, routes enquiries to LHOSA and links the source agency listing where one was confirmed.", "",
      "## Per listing", "", "| Property | Status | Price | Provenance | Agent (basis) | Agency | Source listing |", "|---|---|---|---|---|---|---|"]
for p in sorted(props, key=lambda p: (p["provenance"], p["slug"])):
    a = agents.get(p["agent"]) if p["agent"] else None
    P.append(f"| {p['slug']} | {p['status']} | {rand(p['priceZAR'])} | {p['provenance']} | {(a['name'] + ' (' + p['agentBasis'] + ')') if a else 'none credited'} | {(a or {}).get('agency') or (ext.get(p['slug'], {}).get('agency') if isinstance(ext.get(p['slug']), dict) else '') or ''} | {p['sourceListingUrl'] or ''} |")
P += ["", "## Agency attribution rules", "",
      "- Agency is stated only when evidenced by an email domain, 'Proudly listed by' text, or an agency co-author handle (see agents.json `agencyBasis`).",
      "- Agents found only on external agency pages (e.g. the Seeff agents for The Coves) are **not** copied into the dataset. The source listing is linked instead, because LHOSA did not credit them and their consent to appear on this site is unknown.",
      "- No third-party listing is described as exclusive to LHOSA. 'Exclusive sole mandate' wording in two collaborator captions refers to the agent's mandate and is not repeated as a LHOSA claim."]
(ROOT / "reports/listing-provenance.md").write_text("\n".join(P) + "\n")

# ---------- media ----------
frames = sum(len(m["images"]) for m in media.values())
M = ["# Media reconciliation", "",
     f"- Frames downloaded from Instagram: {len(hashes)} (all 150 posts), 0 failures, 0 zero-byte, 0 corrupt (every file decoded by libvips).",
     f"- Frames used in property galleries: {frames} across {len(media)} properties; reel films cached for {sum(1 for m in media.values() if m['video'])} reel-only properties.",
     "- Source ceiling: Instagram serves originals at **1080 px wide** (most 1080×720/810). Fullscreen derivatives above 1080 px would be upscales, so the site caps display at native size: split hero, max-1080 lightbox.",
     "", "## Checks", "", "| Check | Method | Result |", "|---|---|---|",
     "| File existence / zero-byte | stat of every derivative (validate.mjs) | pass |",
     "| Corrupt images | sharp metadata + stats on every frame | 0 errors |",
     "| Duplicate hashes within a gallery | SHA-256 of 1080 derivative (validate.mjs) | 0 |",
     "| Cross-property reuse | 64-bit dHash, Hamming ≤ 4 across all property frames | 0 pairs (one near-match was within the same merged Sandown listing) |",
     "| Low-resolution frames | width < 700 | 12 reel covers (portrait 640 px) + 8 frames in one Eye of Africa carousel; kept, never used as a homepage hero |",
     "| Logos / promotional graphics in galleries | Visual audit of every gallery (contact sheets) | None in LHOSA carousels; burned-in text only on the reel cover of oakdene-three-bedroom-home (flagged posterOnly) |",
     "| Agent portraits as property images | Visual audit | Agent in frame on reel covers of bryanston-two-bedroom-apartment and seaton-estate-residence (flagged posterOnly; excluded from homepage selections) |",
     "| Wrong hero | Visual audit | fresnaye-view-residence re-led with frame 05 (infinity pool, Lion's Head, sea) instead of the street facade |", "",
     "## Derivatives", "", "| Output | Widths | Format | Notes |", "|---|---|---|---|",
     "| Every gallery frame | 720, 1080 (native cap) | WebP q74/q76 | srcset + sizes, explicit width/height, lazy + async decode |",
     "| Hero frame (01) | 480, 720, 1080 | WebP + JPEG q80 (mozjpeg) | JPEG is the `<img>` fallback and og:image |",
     "| Reel films | as published | MP4 | `preload=none`, poster frame, play on demand only |", "",
     "AVIF was measured (about 20% smaller than WebP) but was about 30× slower to encode across 1,759 frames. WebP was chosen and the finding recorded. Total image weight is about 210 MB; film is about 90 MB.", "",
     "## Per-property media flags", ""]
M += [f"- **{k}**: {v.get('note')}" + (" (posterOnly)" if v.get("posterOnly") else "") for k, v in cur["media"].items() if not k.startswith("_")]
(ROOT / "reports/media-reconciliation.md").write_text("\n".join(M) + "\n")
print("reports written")
