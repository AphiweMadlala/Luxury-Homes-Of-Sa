"""Normalise raw Apify Instagram output into data/instagram-posts.json.

Parses the Luxury Homes of SA caption template (✔️ features, ✅️ highlights,
Floor/Erf size, levies, rates, beds/baths/garages, 🇿🇦 ZAR price) and flags
free-form captions for manual review. Never invents values: anything not
explicitly stated stays null.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data/raw/posts-150.json"
OUT = ROOT / "data/instagram-posts.json"

NUM = r"(\d[\d, ]*(?:\.\d+)?)"


def money(s):
    if s is None:
        return None
    s = s.replace(",", "").replace(" ", "")
    try:
        v = float(s)
    except ValueError:
        return None
    return int(v) if v.is_integer() else v


def parse_price(c):
    m = re.search(r"🇿🇦\s*R ?([\d, ]+)", c)
    if m:
        return money(m.group(1)), "template"
    m = re.search(r"R\s?(\d+(?:[.,]\d+)?)\s?(?:million|mil|M)\b", c, re.I)
    if m:
        return int(round(float(m.group(1).replace(",", ".")) * 1_000_000)), "freeform-millions"
    m = re.search(r"R\s?(\d{1,3}(?:[ ,]\d{3}){2,})", c)
    if m:
        return money(m.group(1)), "freeform"
    return None, None


def first(pattern, c, cast=float):
    m = re.search(pattern, c, re.I)
    if not m:
        return None
    v = cast(m.group(1).replace(",", "").replace(" ", ""))
    return int(v) if isinstance(v, float) and v.is_integer() else v


RENTAL = re.compile(r"holiday rental|short[- ]term (?:hout bay )?rental|for rent\b|rental terms|\d per month|🇿🇦R[\d, ]+p/m|\brental in\b|sleeps \d|#airbnb|for bookings", re.I)
SOLD = re.compile(r"has since been sold|congratulations to the seller and buyer|\bsold\b.*no longer available", re.I)
TEASER = re.compile(r"something coming soon", re.I)


def classify(p, c):
    cats = []
    if RENTAL.search(c):
        cats.append("RENTAL-EXCLUDED")
    if SOLD.search(c):
        cats.append("SOLD")
    if TEASER.search(c):
        cats.append("OTHER")
    if re.search(r"KTE Construction", c):
        cats.append("BRAND-PARTNER")
    if re.search(r"reduced", c, re.I):
        cats.append("PRICE REDUCED")
    if re.search(r"brand[- ]new|newly built|no transfer duty", c, re.I):
        cats.append("NEW BUILD")
    if not cats or cats in (["PRICE REDUCED"], ["NEW BUILD"]):
        cats.insert(0, "FOR SALE")
    if p["type"] == "Video":
        cats.append("PROPERTY TOUR")
    return cats


def parse(p):
    c = p.get("caption") or ""
    lines = [l.strip() for l in c.splitlines()]
    price, price_src = parse_price(c)
    features = [re.sub(r"^✔️\s*", "", l) for l in lines if l.startswith("✔️")]
    highlights = [re.sub(r"^✅️?\s*", "", l) for l in lines if l.startswith("✅")]
    agent = None
    m = re.search(r"👤:?\s*([^@\n]+?)\s*((?:@[\w.]+\s*)*)\n", c)
    if m:
        agent = {
            "name": m.group(1).strip(),
            "instagram": re.findall(r"@([\w.]+)", m.group(2)),
            "phone": (re.search(r"📞:?\s*([+\d ]+)", c) or [None, None])[1],
            "email": (re.search(r"📩:?\s*(\S+@\S+)", c) or [None, None])[1],
        }
        if agent["phone"]:
            agent["phone"] = agent["phone"].strip()
    title = next((l for l in lines if l and not l.startswith(("✔", "✅", "🇿🇦", "#"))), "")
    template = "🇿🇦" in c and "Bedrooms🏡" in c
    children = p.get("childPosts") or []
    media = []
    if children:
        for ch in children:
            media.append({"type": ch.get("type"), "url": ch.get("displayUrl"), "w": ch.get("dimensionsWidth"), "h": ch.get("dimensionsHeight"), "videoUrl": ch.get("videoUrl"), "alt": ch.get("alt")})
    else:
        media.append({"type": p.get("type"), "url": p.get("displayUrl"), "w": p.get("dimensionsWidth"), "h": p.get("dimensionsHeight"), "videoUrl": p.get("videoUrl"), "alt": p.get("alt")})
    return {
        "id": p["id"],
        "shortcode": p["shortCode"],
        "url": p["url"],
        "date": p["timestamp"],
        "owner": p.get("ownerUsername"),
        "authoredByLHOSA": p.get("ownerUsername") == "luxuryhomesofsa",
        "coauthors": [x.get("username") for x in (p.get("coauthorProducers") or [])],
        "taggedUsers": [x.get("username") for x in (p.get("taggedUsers") or [])],
        "mediaType": p["type"],
        "caption": c,
        "hashtags": p.get("hashtags") or [],
        "mentions": p.get("mentions") or [],
        "location": p.get("locationName"),
        "isPinned": bool(p.get("isPinned")),
        "media": media,
        "categories": classify(p, c),
        "captionTemplate": template,
        "parsed": {
            "title": title,
            "priceZAR": price,
            "priceSource": price_src,
            "bedrooms": first(r"(\d+(?:\.\d)?)\s*Bedrooms?🏡", c) or first(r"(\d+)\s*(?:en-suite\s*)?bed(?:room)?s?\b", c),
            "bathrooms": first(r"(\d+(?:\.\d)?)\s*Bathrooms?🛀", c) or first(r"(\d+(?:\.\d)?)\s*bath(?:room)?s?\b", c),
            "garages": first(r"(\d+)\s*Garages?🚗", c),
            "parking": first(r"(\d+)\s*Parking🚗", c),
            "floorSizeM2": first(r"(?<!Erf )Size:\s*" + NUM + r"\s*m", c),
            "erfSizeM2": first(r"Erf Size:\s*" + NUM + r"\s*m", c),
            "leviesZAR": first(r"Lev(?:ies|y):\s*R\s?" + NUM, c),
            "ratesZAR": first(r"Rates(?: & Taxes)?:\s*R\s?" + NUM, c),
            "features": features,
            "highlights": highlights,
            "agent": agent,
        },
    }


def main():
    raw = json.loads(RAW.read_text())
    posts = sorted((parse(p) for p in raw), key=lambda x: x["date"], reverse=True)
    OUT.write_text(json.dumps(posts, indent=2, ensure_ascii=False))
    print(f"wrote {len(posts)} posts -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
