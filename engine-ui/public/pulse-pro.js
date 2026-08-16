/*
 * UXpact Pulse Pro — embed script.
 *
 * Paste this into your site's <head>, e.g.:
 *   <script src="https://uxpact.pages.dev/pulse-pro.js" data-uxpact-audit="YOUR_AUDIT_ID" async></script>
 *
 * On load, fetches the currently-deployed Blueprint variant (if any) for
 * this audit and swaps the matching sections into the live page. Never
 * throws, never blocks page load, and does nothing at all if anything
 * along the way fails — the host page's own behaviour always wins.
 *
 * When serve-variant flags driftCheckDue, also computes a cheap per-zone
 * fingerprint (word count + text length) from the live DOM and reports it
 * to check-drift — the drift monitor's client-side detection tier. This is
 * fire-and-forget and never blocks or affects variant application.
 *
 * Distinct from the Pulse browser extension: this runs in every visitor's
 * browser on your actual site, not just in your own browser.
 */
(function () {
  "use strict";

  var SERVE_VARIANT_URL = "https://oxminualycvnxofoevjs.supabase.co/functions/v1/serve-variant";
  var CHECK_DRIFT_URL = "https://oxminualycvnxofoevjs.supabase.co/functions/v1/check-drift";
  var FETCH_TIMEOUT_MS = 5000;

  var ZONE_KEYWORDS = {
    nav: ["nav", "navbar", "menu", "header-top", "site-header"],
    hero: ["hero", "banner", "jumbotron", "masthead", "intro"],
    pricing: ["pricing", "plans", "price-table", "price-grid"],
    social: ["testimonial", "logos", "trust", "social-proof", "customers", "reviews", "clients"],
    cta2: ["cta", "get-started", "signup-section", "bottom-cta", "final-cta"],
    footer: ["footer", "site-footer"],
    features: ["feature", "benefit", "services"]
  };

  // Classifies an element into a zone. Unlike the server-side version used
  // at deploy time (which must assign every block some zone), this never
  // defaults to "features" — on a real live page, guessing wrong means
  // silently replacing unrelated content, so an element only counts as a
  // match when a real signal (tag name, id/class keyword, or an h1 for
  // hero) points to it.
  function classifyZone(el) {
    var tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "nav" || tag === "header") return "nav";
    if (tag === "footer") return "footer";
    var haystack = (tag + " " + (el.id || "") + " " + (el.className || "")).toLowerCase();
    for (var zone in ZONE_KEYWORDS) {
      if (!ZONE_KEYWORDS.hasOwnProperty(zone)) continue;
      var keywords = ZONE_KEYWORDS[zone];
      for (var i = 0; i < keywords.length; i++) {
        if (haystack.indexOf(keywords[i]) !== -1) return zone;
      }
    }
    if (el.querySelector && el.querySelector("h1")) return "hero";
    return null;
  }

  function findZoneElement(zone) {
    var candidates = document.querySelectorAll("nav,header,footer,section,div[id],div[class]");
    for (var i = 0; i < candidates.length; i++) {
      if (classifyZone(candidates[i]) === zone) return candidates[i];
    }
    return null;
  }

  function applyVariant(sections) {
    for (var zone in sections) {
      if (!sections.hasOwnProperty(zone) || !sections[zone]) continue;
      try {
        var el = findZoneElement(zone);
        if (el) el.outerHTML = sections[zone];
      } catch (e) {
        // one zone failing must never stop the others
      }
    }
  }

  // Reuses classifyZone/findZoneElement to compute a coarse fingerprint
  // (word count + text length) per identified zone on the live page.
  // Deliberately cheap — not a real diff, just enough for check-drift to
  // decide whether a zone changed enough to be worth re-diagnosing.
  function computeFingerprints() {
    var fingerprints = {};
    for (var zone in ZONE_KEYWORDS) {
      if (!ZONE_KEYWORDS.hasOwnProperty(zone)) continue;
      try {
        var el = findZoneElement(zone);
        if (!el) continue;
        var text = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) continue;
        fingerprints[zone] = { wordCount: text.split(/\s+/).length, textLength: text.length };
      } catch (e) {
        // one zone failing must never stop the others
      }
    }
    return fingerprints;
  }

  function reportDrift(auditId) {
    try {
      var fingerprints = computeFingerprints();
      if (Object.keys(fingerprints).length === 0) return;

      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timeoutId = controller
        ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS)
        : null;

      fetch(CHECK_DRIFT_URL, {
        method: "POST",
        signal: controller ? controller.signal : undefined,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId: auditId, domain: document.location.hostname, fingerprints: fingerprints })
      })
        .then(function () { if (timeoutId) clearTimeout(timeoutId); })
        .catch(function () {
          // network error, timeout, abort — do nothing, this is fire-and-forget
        });
    } catch (e) {
      // never throw into the host page
    }
  }

  function run() {
    var script = document.currentScript;
    if (!script) return;
    var auditId = script.getAttribute("data-uxpact-audit");
    if (!auditId) return;

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = controller
      ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS)
      : null;

    fetch(SERVE_VARIANT_URL + "?auditId=" + encodeURIComponent(auditId), {
      signal: controller ? controller.signal : undefined
    })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (data) {
        if (timeoutId) clearTimeout(timeoutId);
        if (data && data.sections) applyVariant(data.sections);
        if (data && data.driftCheckDue) reportDrift(auditId);
      })
      .catch(function () {
        // network error, timeout, abort, bad JSON — do nothing
      });
  }

  try {
    run();
  } catch (e) {
    // never throw into the host page
  }
})();
