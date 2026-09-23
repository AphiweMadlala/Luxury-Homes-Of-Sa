"""Cache every Instagram media frame locally (CDN URLs expire).

Writes data/raw/media/<shortcode>/NN.jpg in carousel order. Skips files that
already exist so re-runs never re-download.
"""
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "data/instagram-posts.json"
MEDIA = ROOT / "data/raw/media"


def fetch(job):
    out, url = job
    if out.exists() and out.stat().st_size > 0:
        return "cached"
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            out.write_bytes(r.read())
        return "ok"
    except Exception as e:  # noqa: BLE001 - report and continue
        return f"fail {out}: {e}"


def main():
    jobs = []
    for p in json.loads(POSTS.read_text()):
        for i, m in enumerate(p["media"], 1):
            if m.get("url"):
                jobs.append((MEDIA / p["shortcode"] / f"{i:02d}.jpg", m["url"]))
    with ThreadPoolExecutor(16) as ex:
        results = list(ex.map(fetch, jobs))
    fails = [r for r in results if r.startswith("fail")]
    print(f"{len(jobs)} frames, {len(fails)} failures")
    for f in fails:
        print(f)


if __name__ == "__main__":
    main()
