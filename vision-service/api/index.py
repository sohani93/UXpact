"""
UXpact Vision sandbox — DOM fidelity microservice.

Takes the raw HTML fetched during a UXpact audit plus a user-chosen section
order, and returns cleaned, reordered HTML ready for Claude to rewrite copy
within. This handles real DOM structure (actual tags, classes, nesting) —
the facsimile in the rest of the app is a text-extract approximation and
can't be reordered or handed to an HTML-preserving rewrite step.

Called by the `generate-vision` Supabase Edge Function, never directly by
the frontend.
"""
import re
from flask import Flask, request, jsonify
from bs4 import BeautifulSoup, Comment

app = Flask(__name__)

MAX_INPUT_BYTES = 3_000_000  # 3MB — guards against pathological pages
STRIP_TAGS = ["script", "noscript", "iframe", "object", "embed", "applet"]
TRACKER_SRC_PATTERNS = [
    "google-analytics.com", "googletagmanager.com", "doubleclick.net",
    "facebook.com/tr", "connect.facebook.net", "hotjar.com", "segment.io",
    "segment.com", "mixpanel.com", "amplitude.com", "clarity.ms",
    "intercom.io", "hs-analytics.net", "hubspot.com/analytics",
]

ZONE_KEYWORDS = {
    "nav": ["nav", "navbar", "menu", "header-top", "site-header"],
    "hero": ["hero", "banner", "jumbotron", "masthead", "intro"],
    "pricing": ["pricing", "plans", "price-table", "price-grid"],
    "social": ["testimonial", "logos", "trust", "social-proof", "customers", "reviews", "clients"],
    "cta2": ["cta", "get-started", "signup-section", "bottom-cta", "final-cta"],
    "footer": ["footer", "site-footer"],
    "features": ["feature", "benefit", "services"],
}
ZONE_ORDER_FALLBACK = ["nav", "hero", "features", "social", "pricing", "cta2", "footer"]


def is_tracker_img(tag) -> bool:
    if tag.name != "img":
        return False
    src = (tag.get("src") or "").lower()
    if any(p in src for p in TRACKER_SRC_PATTERNS):
        return True
    w, h = tag.get("width"), tag.get("height")
    if w in ("0", "1") and h in ("0", "1"):
        return True
    return False


def sanitize(soup: BeautifulSoup) -> None:
    for tag_name in STRIP_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()
    for img in soup.find_all("img"):
        if is_tracker_img(img):
            img.decompose()
    for comment in soup.find_all(string=lambda s: isinstance(s, Comment)):
        comment.extract()
    for tag in soup.find_all(True):
        for attr in list(tag.attrs):
            if attr.lower().startswith("on"):  # inline event handlers (onclick, onload, ...)
                del tag[attr]


def classify_zone(tag) -> str:
    if tag.name in ("nav",):
        return "nav"
    if tag.name in ("header",):
        return "nav"
    if tag.name in ("footer",):
        return "footer"

    haystack = " ".join(filter(None, [
        tag.name,
        tag.get("id", ""),
        " ".join(tag.get("class", [])) if tag.get("class") else "",
    ])).lower()

    for zone, keywords in ZONE_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            return zone

    if tag.find("h1"):
        return "hero"

    return "features"


def get_top_level_blocks(soup: BeautifulSoup):
    root = soup.find("main") or soup.body
    if root is None:
        return None, []
    blocks = [child for child in root.find_all(recursive=False) if getattr(child, "name", None)]
    return root, blocks


def tag_zones(blocks) -> None:
    # Exposes the same classification reorder_sections computes, as a
    # data-uxpact-zone attribute on each top-level block, so a consumer
    # (generate-vision) can split the returned document into per-section
    # fragments without reimplementing this heuristic itself.
    for b in blocks:
        b["data-uxpact-zone"] = classify_zone(b)


def reorder_sections(soup: BeautifulSoup, section_order):
    root, blocks = get_top_level_blocks(soup)
    if root is None or len(blocks) < 2:
        if root is not None:
            tag_zones(blocks)
        return  # nothing meaningful to reorder — leave document as-is

    order = section_order if section_order else ZONE_ORDER_FALLBACK
    classified = [(classify_zone(b), b) for b in blocks]
    tag_zones(blocks)

    used = set()
    ordered = []
    for zone in order:
        for i, (z, b) in enumerate(classified):
            if z == zone and i not in used:
                ordered.append(b)
                used.add(i)

    # Anything not claimed by the requested order keeps its original relative position at the end.
    for i, (_, b) in enumerate(classified):
        if i not in used:
            ordered.append(b)

    for b in blocks:
        b.extract()
    for b in ordered:
        root.append(b)


@app.post("/")
@app.post("/api")
@app.post("/api/index")
def process():
    payload = request.get_json(silent=True) or {}
    raw_html = payload.get("rawHtml")
    section_order = payload.get("sectionOrder") or []

    if not raw_html or not isinstance(raw_html, str):
        return jsonify({"error": "rawHtml is required"}), 400
    if len(raw_html.encode("utf-8", errors="ignore")) > MAX_INPUT_BYTES:
        return jsonify({"error": "rawHtml exceeds size limit"}), 413

    try:
        soup = BeautifulSoup(raw_html, "lxml")
        sanitize(soup)
        reorder_sections(soup, section_order)
        cleaned = str(soup)
    except Exception as exc:  # malformed input HTML shouldn't 500 the service
        return jsonify({"error": f"Failed to process HTML: {exc}"}), 422

    return jsonify({"html": cleaned}), 200


@app.get("/")
@app.get("/api")
def health():
    return jsonify({"status": "ok", "service": "uxpact-vision-service"}), 200
