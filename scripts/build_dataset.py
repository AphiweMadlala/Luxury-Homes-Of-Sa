"""Build data/properties.json from parsed posts + hand curation.

Rules (see PROJECT_CONTEXT.md):
- A fact comes from a caption (or an explicit, sourced override). Never inferred.
- When posts disagree, the most recent non-null value wins and the conflict is logged.
- Status: sold only with explicit evidence; for-sale needs a post on/after the
  recent cutoff (or external verification); otherwise unknown.
- Feature flags are derived from caption text, never from photographs.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
posts = {p["shortcode"]: p for p in json.loads((ROOT / "data/instagram-posts.json").read_text())}
cur = json.loads((ROOT / "data/curation.json").read_text())
agents = json.loads((ROOT / "data/agents.json").read_text())
ext_path = ROOT / "data/external-verification.json"
external = json.loads(ext_path.read_text()) if ext_path.exists() else {}

HANDLE_TO_AGENT = {h.lower(): a["id"] for a in agents for h in a["instagram"]}
NAME_TO_AGENT = {a["name"].lower(): a["id"] for a in agents}
SKIP_HANDLES = {"luxuryhomesofsa", "outdoors_women", "homes_in_market", "onlyrealtyselect", "meridianrealtysa",
                "zamoshproperty", "jhb_live_real_estate", "live_real_estate", "stoic_realty"}
FACT_FIELDS = ["priceZAR", "bedrooms", "bathrooms", "garages", "parking", "floorSizeM2", "erfSizeM2", "leviesZAR", "ratesZAR"]

EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️‍\U0001F1E6-\U0001F1FF•]+")
BOLD = str.maketrans({chr(0x1D5D4 + i): chr(65 + i) for i in range(26)} | {chr(0x1D5EE + i): chr(97 + i) for i in range(26)}
                     | {chr(0x1D400 + i): chr(65 + i) for i in range(26)} | {chr(0x1D41A + i): chr(97 + i) for i in range(26)}
                     | {chr(0x1D7CE + i): str(i) for i in range(10)} | {chr(0x1D7EC + i): str(i) for i in range(10)})

FEATURE_RULES = {
    "pool": r"pool",
    "seaView": r"sea view|ocean view|ocean outlook|views? (?:across|of) the (?:atlantic|indian) ocean|atlantic ocean|indian ocean|ocean,? harbour|ocean & scenic|sea-view|seaview|uninterrupted atlantic",
    "mountainView": r"mountain view|views? of table mountain|twelve apostle|mountain outlook",
    "golfEstate": r"golf|fairway",
    "backupPower": r"solar|inverter|generator|batter(?:y|ies)|backup power|back-up power",
    "borehole": r"borehole",
    "waterStorage": r"water (?:storage|tank)|backup water|back-up water|jojo|litre|liter|water backup",
    "securityEstate": r"24h security|24-hour|24 hour|secure estate|security estate|guarded",
    "staffQuarters": r"staff quarters|staff accommodation|domestic quarters|domestic accommodation",
    "flatlet": r"flatlet|cottage|guest house|guest suite|granny|loft-style apartment",
    "homeOffice": r"study|office",
    "cinema": r"cinema|media room",
    "gym": r"\bgym\b",
    "wineCellar": r"wine cellar|wine storage|wine display",
    "elevator": r"elevator|\blift\b",
    "fireplace": r"fireplace",
    "airConditioning": r"air-?condition",
    "smartHome": r"home automation|control ?4|crestron|smart home|app-controlled",
    "petFriendly": r"pet friendly|pet-friendly",
    "furnished": r"\bfurnished\b|furniture included",
    "noTransferDuty": r"no transfer duty",
    "newBuild": r"brand[- ]new|newly built|new build",
    "bankSale": r"repossessed|quicksell",
}


def clean(s):
    return re.sub(r"\s+", " ", EMOJI.sub("", (s or "").translate(BOLD))).strip(" *~|-")


def description(p):
    """Intro prose only: lines before the first bullet/spec line, cleaned."""
    out = []
    for raw in p["caption"].splitlines():
        line = raw.strip()
        if not line:
            if out:
                out.append("")
            continue
        if line.startswith(("✔", "✅", "#", "🇿🇦", "👤", "📞", "📩", "📍", "💰", "✨", "•", "🏡", "🛁", "🛏", "🚗", "📐", "~", "*", "-")) or re.match(r"^(Floor|Erf|Levies|Rates|\d+ (Bed|Bath|Gar))", line):
            if out:
                break
            continue
        c = clean(line)
        if c and not re.match(r"^R ?[\d,. ]+(million|M)?$", c, re.I):
            out.append(c)
    text = "\n".join(out).strip()
    return re.sub(r"\n{2,}", "\n\n", text)


def features_list(p):
    items = p["parsed"]["features"] + p["parsed"]["highlights"]
    return [clean(i) for i in items if clean(i)]


def fx_line(ordered, price):
    """Currency conversions exactly as published beside the ZAR price (historical, dated)."""
    for p in ordered:
        c = p["caption"]
        if p["parsed"]["priceZAR"] != price:
            continue
        out = {}
        for code, flag, sym in (("USD", "🇺🇸", r"\$"), ("GBP", "🇬🇧", "£"), ("EUR", "🇩🇪", "€")):
            m = re.search(flag + r"\s*" + sym + r"\s?([\d,]+)(?!\s*p/m)", c)
            if m:
                out[code] = int(m.group(1).replace(",", ""))
        if out:
            return {"asPublished": out, "date": p["date"][:10], "post": p["shortcode"]}
    return None


def resolve_agent(ordered):
    for p in ordered:
        a = p["parsed"]["agent"]
        if a and a.get("name") and a["name"].lower() in NAME_TO_AGENT:
            return NAME_TO_AGENT[a["name"].lower()], p["shortcode"], "caption contact block"
    for p in ordered:
        if not p["authoredByLHOSA"] and p["owner"].lower() in HANDLE_TO_AGENT:
            return HANDLE_TO_AGENT[p["owner"].lower()], p["shortcode"], "post author (Instagram co-author collaboration)"
    for p in ordered:
        for h in p["coauthors"]:
            if h.lower() not in SKIP_HANDLES and h.lower() in HANDLE_TO_AGENT:
                return HANDLE_TO_AGENT[h.lower()], p["shortcode"], "post co-author"
    return None, None, None


def media_post(ordered):
    carousels = [p for p in ordered if p["mediaType"] == "Sidecar"]
    pool = carousels or ordered
    # Prefer the fullest carousel; ties go to the most recent.
    return max(pool, key=lambda p: (len(p["media"]), p["date"]))


def build():
    props, conflicts = [], []
    cutoff = cur["recentCutoff"]
    for spec in cur["properties"]:
        ordered = sorted((posts[s] for s in spec["posts"]), key=lambda p: p["date"], reverse=True)
        loc = cur["locations"][spec["loc"]]
        ov = {k: v for k, v in cur["overrides"].get(spec["slug"], {}).items() if not k.startswith("_")}
        facts = {}
        for f in FACT_FIELDS:
            vals = [(p["parsed"][f], p["shortcode"], p["date"][:10]) for p in ordered if p["parsed"][f] is not None]
            facts[f] = vals[0][0] if vals else None
            if len({v for v, _, _ in vals}) > 1 and f != "priceZAR":
                conflicts.append({"slug": spec["slug"], "field": f, "values": vals, "chosen": ov.get(f, facts[f])})
        facts.update(ov)
        # A parsed price below R100k on a sale listing is a regex artefact, never a price.
        if facts["priceZAR"] is not None and facts["priceZAR"] < 100000:
            facts["priceZAR"] = None
        history = []
        for p in sorted(ordered, key=lambda p: p["date"]):
            v = p["parsed"]["priceZAR"]
            if v and v >= 100000 and (not history or history[-1]["priceZAR"] != v):
                history.append({"date": p["date"][:10], "priceZAR": v, "post": p["shortcode"]})
        if len(history) > 1:
            conflicts.append({"slug": spec["slug"], "field": "priceZAR", "values": [(h["priceZAR"], h["post"], h["date"]) for h in history], "chosen": facts["priceZAR"]})

        text = "\n".join(p["caption"] for p in ordered).lower()
        flags = {k: bool(re.search(rx, text)) for k, rx in FEATURE_RULES.items()}
        flags["golfEstate"] = flags["golfEstate"] or bool(loc["estate"] and "golf" in loc["estate"].lower())
        feats, seen = [], set()
        for p in ordered:
            for f in features_list(p):
                if f.lower() not in seen:
                    seen.add(f.lower())
                    feats.append(f)

        agent_id, agent_post, agent_basis = resolve_agent(ordered)
        latest = ordered[0]["date"][:10]
        ext = external.get(spec["slug"])
        if latest >= cutoff:
            status, basis = "for-sale", f"Instagram listing post within 60 days of verification ({latest})"
        elif ext and ext.get("finding") == "listed":
            status, basis = "for-sale", f"External listing found ({ext['checkedAt']}): {ext['url']}"
        else:
            status, basis = "unknown", f"Most recent Instagram evidence {latest}; no current external listing confirmed"
        if ext and ext.get("finding") in ("sold", "under-offer"):
            status, basis = ext["finding"], f"External source ({ext['checkedAt']}): {ext['url']}"

        mp = media_post(ordered)
        desc = next((d for d in (description(p) for p in [mp] + ordered) if len(d) > 60), description(mp))
        desc = cur.get("descriptions", {}).get(spec["slug"], desc)
        intro = next((clean(p["parsed"]["title"]) for p in ordered if p["captionTemplate"]), None)
        props.append({
            "id": f"lhosa-{spec['slug']}",
            "slug": spec["slug"],
            "reference": ordered[-1]["shortcode"],
            "status": status,
            "statusBasis": basis,
            "title": spec["title"],
            "shortTitle": spec["title"],
            "headline": intro,
            "propertyType": spec["type"],
            "priceZAR": facts["priceZAR"],
            "priceOnApplication": facts["priceZAR"] is None,
            "priceNote": cur["overrides"].get(spec["slug"], {}).get("_note"),
            "priceHistory": history,
            "fx": fx_line(ordered, facts["priceZAR"]) if facts["priceZAR"] else None,
            **{k: loc[k] for k in ("province", "city", "area", "suburb", "estate")},
            "development": None,
            "addressPublic": None,
            **{k: facts[k] for k in FACT_FIELDS if k != "priceZAR"},
            "description": desc,
            "highlights": [clean(h) for h in mp["parsed"]["highlights"]],
            "features": feats,
            "featureFlags": flags,
            "images": [],
            "mediaSourcePost": mp["shortcode"],
            "video": next(({"post": p["shortcode"], "url": p["url"]} for p in ordered if p["mediaType"] == "Video"), None),
            "agent": agent_id,
            "agentSourcePost": agent_post,
            "agentBasis": agent_basis,
            "provenance": "agent-collaboration" if agent_id else "lhosa-feature-unattributed",
            "sourceAgency": next((a["agency"] for a in agents if a["id"] == agent_id), None),
            "sourceListingUrl": ext["url"] if ext and ext.get("finding") == "listed" else None,
            "instagramPosts": [{"shortcode": p["shortcode"], "url": p["url"], "date": p["date"][:10], "author": p["owner"], "categories": p["categories"]} for p in ordered],
            "sourceUrls": [p["url"] for p in ordered] + ([ext["url"]] if ext else []),
            "firstSeenAt": ordered[-1]["date"][:10],
            "lastSeenAt": latest,
            "lastVerifiedAt": cur["verifiedAt"],
            "confidence": "high" if ordered[0]["captionTemplate"] or agent_id else "medium",
        })

    sold = []
    for spec in cur["sold"]:
        ordered = sorted((posts[s] for s in spec["posts"]), key=lambda p: p["date"], reverse=True)
        sold.append({"slug": spec["slug"], "status": "sold", "evidence": spec["evidence"], **cur["locations"][spec["loc"]],
                     "instagramPosts": [p["url"] for p in ordered], "agent": resolve_agent(ordered)[0], "mediaSourcePost": media_post(ordered)["shortcode"]})

    used = {s for spec in cur["properties"] + cur["sold"] for s in spec["posts"]}
    excluded = [{"shortcode": s, "date": p["date"][:10], "author": p["owner"], "categories": p["categories"], "reason": None, "caption": clean(p["caption"])[:140]}
                for s, p in posts.items() if s not in used]
    (ROOT / "data/properties.json").write_text(json.dumps(props, indent=2, ensure_ascii=False))
    (ROOT / "data/sold.json").write_text(json.dumps(sold, indent=2, ensure_ascii=False))
    (ROOT / "data/raw/conflicts.json").write_text(json.dumps(conflicts, indent=2, ensure_ascii=False))
    (ROOT / "data/raw/unmapped-posts.json").write_text(json.dumps(excluded, indent=2, ensure_ascii=False))
    from collections import Counter
    print(len(props), "properties", Counter(p["status"] for p in props), "| sold", len(sold), "| unmapped posts", len(excluded), "| conflicts", len(conflicts))


if __name__ == "__main__":
    build()
