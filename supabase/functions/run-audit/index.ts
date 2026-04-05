import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ───
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ─── TYPES ───
type Industry = "saas" | "ecommerce" | "portfolio" | "healthcare" | "fintech" | "service";
type Severity = "critical" | "major" | "minor";

interface CheckResult {
  id: string;
  name: string;
  pass: boolean;
  score: number;
  severity: Severity;
  finding: string;
  fix: string;
  category: string;
  part: "A" | "B" | "C";
  manualReview: boolean;
  domZone?: string;
}

interface AuditScores {
  total: number;
  partA: number;
  partB: number;
  partC: number;
  label: string;
  checksPassed: number;
  checksFlagged: number;
  criticalIssues: number;
}

interface PageMetadata {
  url: string;
  domain: string;
  statusCode: number;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  h1s: { text: string; count: number }[];
  h1Count: number;
  headingHierarchy: { tag: string; text: string; level: number }[];
  hasSkippedHeadingLevels: boolean;
  navLinks: { text: string; href: string }[];
  navLinkCount: number;
  logoLinksHome: boolean;
  ctas: { text: string; tag: string; classes: string }[];
  ctaCount: number;
  images: { src: string; alt: string | null; hasAlt: boolean }[];
  imageCount: number;
  imagesWithoutAlt: number;
  ogTags: Record<string, string>;
  hasOgImage: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasFavicon: boolean;
  hasViewportMeta: boolean;
  bodyTextContent: string;
  bodyWordCount: number;
  paragraphs: string[];
  allLinks: { text: string; href: string; isExternal: boolean }[];
  formCount: number;
  buttonTexts: string[];
  inputFields: { type: string; name: string | null; placeholder: string | null }[];
  headers: Record<string, string>;
  hasHttps: boolean;
  youCount: number;
  weCount: number;
  youWeRatio: number;
  jsonLdBlocks: string[];
  scriptCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
}

// ─── SUPABASE ───
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// ─── HELPERS ───
function cleanText(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}
function textOrNull(input: string | null | undefined): string | null {
  const cleaned = cleanText(input);
  return cleaned.length > 0 ? cleaned : null;
}
function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => { result[key.toLowerCase()] = value; });
  return result;
}
function stripHtmlToText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function safeResolveUrl(href: string, base: URL): URL | null {
  try {
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
    return new URL(href, base);
  } catch { return null; }
}
function countWordOccurrences(text: string, words: string[]): number {
  return words.reduce((sum, word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    return sum + (text.match(regex)?.length ?? 0);
  }, 0);
}
function hasAny(text: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((p) => typeof p === "string" ? text.includes(p) : p.test(text));
}
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── FETCH HTML ───
async function fetchHtml(url: string): Promise<{ success: true; html: string; response: Response } | { success: false; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "UXpactAuditBot/0.1", Accept: "text/html,application/xhtml+xml" },
    });
    const html = await response.text();
    return { success: true, html, response };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { success: false, error: "Request timed out" };
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch URL" };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── EXTRACT METADATA ───
const CTA_TEXT_PATTERNS = ["get started", "start", "sign up", "try", "book", "contact", "buy", "subscribe", "learn more", "request", "demo", "free", "access", "download", "get my", "get your", "schedule", "claim"];

function extractPageMetadata(args: { doc: Document; html: string; url: URL; statusCode: number; headers: Record<string, string> }): PageMetadata {
  const { doc, url, statusCode, headers } = args;
  const title = textOrNull(doc.querySelector("title")?.textContent);
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;

  const headingHierarchy = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((heading) => {
    const tag = heading.tagName.toLowerCase();
    return { tag, text: cleanText(heading.textContent), level: Number.parseInt(tag.slice(1), 10) };
  });

  const h1Counts = new Map<string, number>();
  for (const heading of headingHierarchy.filter((e) => e.tag === "h1")) {
    const key = heading.text || "(empty h1)";
    h1Counts.set(key, (h1Counts.get(key) ?? 0) + 1);
  }
  const h1s = Array.from(h1Counts.entries()).map(([text, count]) => ({ text, count }));

  let hasSkippedHeadingLevels = false;
  for (let i = 1; i < headingHierarchy.length; i++) {
    if (headingHierarchy[i].level > headingHierarchy[i - 1].level + 1) { hasSkippedHeadingLevels = true; break; }
  }

  // ─── NAV: scoped to header nav first, falls back to first nav on page ───
  const headerEl = doc.querySelector("header");
  const navEl = headerEl?.querySelector("nav") ?? doc.querySelector("nav");
  const navLinks = navEl
    ? Array.from(navEl.querySelectorAll("a[href]")).map((a) => ({
        text: cleanText(a.textContent),
        href: a.getAttribute("href") ?? "",
      }))
    : [];

  const allLinks = Array.from(doc.querySelectorAll("a[href]")).map((a) => {
    const href = a.getAttribute("href") ?? "";
    const resolved = safeResolveUrl(href, url);
    return { text: cleanText(a.textContent), href, isExternal: resolved ? resolved.origin !== url.origin : false };
  });

  // ─── LOGO: checks class/id/child signals first, then first header anchor with img ───
  const logoLinksHome = (() => {
    const explicitLogo = Array.from(doc.querySelectorAll("a[href]")).some((a) => {
      const href = a.getAttribute("href") ?? "";
      const classes = [a.className, a.id].join(" ").toLowerCase();
      const hasLogoSignal = classes.includes("logo") || Boolean(a.querySelector('img[alt*="logo" i], svg[aria-label*="logo" i]'));
      if (!hasLogoSignal) return false;
      const resolved = safeResolveUrl(href, url);
      if (!resolved) return ["/", "./", "#"].includes(href.trim());
      return resolved.origin === url.origin && resolved.pathname === "/";
    });
    if (explicitLogo) return true;

    const headerAnchor = doc.querySelector("header a[href]");
    if (headerAnchor) {
      const href = headerAnchor.getAttribute("href") ?? "";
      const hasImg = Boolean(headerAnchor.querySelector("img, svg"));
      const resolved = safeResolveUrl(href, url);
      const linksHome = resolved
        ? resolved.origin === url.origin && (resolved.pathname === "/" || resolved.pathname === "" || resolved.pathname === url.pathname)
        : ["/", "./", "#"].includes(href.trim()) || href === url.origin || href === url.href;
      if (hasImg && linksHome) return true;
    }
    return false;
  })();

  const ctas = Array.from(doc.querySelectorAll("a, button, input[type='button'], input[type='submit'], [role='button']"))
    .map((el) => {
      const tag = el.tagName.toLowerCase();
      const text = cleanText(el.textContent || el.getAttribute("value") || "");
      const classes = (el.getAttribute("class") || "").trim();
      return { text, tag, classes };
    })
    .filter((entry) => {
      const normalized = entry.text.toLowerCase();
      const classText = entry.classes.toLowerCase();
      return normalized.length > 0 && (
        CTA_TEXT_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
        classText.includes("cta") ||
        classText.includes("btn") ||
        classText.includes("button")
      );
    });

  const images = Array.from(doc.querySelectorAll("img")).map((img) => {
    const alt = img.getAttribute("alt");
    return { src: img.getAttribute("src") ?? "", alt, hasAlt: typeof alt === "string" && alt.trim().length > 0 };
  });

  const ogTags: Record<string, string> = {};
  for (const meta of Array.from(doc.querySelectorAll('meta[property^="og:"]'))) {
    const property = meta.getAttribute("property");
    const content = meta.getAttribute("content");
    if (property && content) ogTags[property] = content;
  }

  const jsonLdBlocks = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map((s) => cleanText(s.textContent)).filter((c) => c.length > 0);
  const paragraphs = Array.from(doc.querySelectorAll("p")).map((p) => cleanText(p.textContent)).filter((p) => p.length > 0);
  const bodyTextContent = cleanText(doc.body?.textContent ?? "");
  const words = bodyTextContent.length > 0 ? bodyTextContent.split(/\s+/) : [];
  const inputFields = Array.from(doc.querySelectorAll("input")).map((input) => ({ type: input.getAttribute("type") ?? "text", name: input.getAttribute("name"), placeholder: input.getAttribute("placeholder") }));
  const buttonTexts = Array.from(doc.querySelectorAll("button")).map((b) => cleanText(b.textContent)).filter((t) => t.length > 0);
  const youCount = countWordOccurrences(bodyTextContent, ["you", "your", "yours"]);
  const weCount = countWordOccurrences(bodyTextContent, ["we", "our", "us"]);

  return {
    url: url.toString(), domain: url.hostname, statusCode, title, titleLength: title?.length ?? 0,
    metaDescription, metaDescriptionLength: metaDescription?.length ?? 0, canonical,
    h1s, h1Count: h1s.reduce((sum, h1) => sum + h1.count, 0), headingHierarchy, hasSkippedHeadingLevels,
    navLinks, navLinkCount: navLinks.length, logoLinksHome, ctas, ctaCount: ctas.length,
    images, imageCount: images.length, imagesWithoutAlt: images.filter((img) => !img.hasAlt).length,
    ogTags, hasOgImage: Boolean(ogTags["og:image"]), hasOgTitle: Boolean(ogTags["og:title"]), hasOgDescription: Boolean(ogTags["og:description"]),
    hasFavicon: Boolean(doc.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')),
    hasViewportMeta: Boolean(doc.querySelector('meta[name="viewport"]')),
    jsonLdBlocks, scriptCount: doc.querySelectorAll("script").length,
    bodyTextContent, bodyWordCount: words.length, paragraphs, allLinks,
    internalLinkCount: allLinks.filter((l) => !l.isExternal).length,
    externalLinkCount: allLinks.filter((l) => l.isExternal).length,
    formCount: doc.querySelectorAll("form").length, buttonTexts, inputFields, headers,
    hasHttps: url.protocol === "https:", youCount, weCount,
    youWeRatio: weCount === 0 ? (youCount > 0 ? 99 : 0) : youCount / weCount,
  };
}

// ─── MANUAL REVIEW HELPER ───
function manual(id: string, name: string, category: string, severity: Severity, part: "A" | "B" | "C"): CheckResult {
  return {
    id, name, category, severity, part,
    pass: false,
    score: 5,
    manualReview: true,
    finding: "Requires visual review — not auto-assessed.",
    fix: "Review manually or commission a UX audit.",
  };
}

// ─── PART A CHECKS ───
const GENERIC_CTA_TEXTS = new Set(["submit", "click here", "learn more", "go", "send", "ok", "click", "continue"]);
const PLACEHOLDER_PATTERNS = [/lorem ipsum/i, /placeholder/i, /\[your/i, /insert text/i, /coming soon/i, /\btbd\b/i, /\btodo\b/i];

function runPartAChecks(metadata: PageMetadata): CheckResult[] {
  const ctaTexts = metadata.ctas.map((c) => c.text.trim()).filter(Boolean);
  const firstCtaText = (ctaTexts[0] ?? "").toLowerCase();
  const checks: CheckResult[] = [];

  const h1Text = metadata.h1s[0]?.text?.trim() ?? "";
  const h1Words = h1Text ? h1Text.split(/\s+/).length : 0;
  if (metadata.h1Count < 1 || !h1Text) {
    checks.push({ id: "A1.1", name: "Hero headline missing", part: "A", category: "First Impression & Clarity", severity: "critical", pass: false, score: 0, manualReview: false, finding: "No hero headline (H1) found.", fix: "Add a clear H1 headline under 10 words." });
  } else if (h1Words > 10) {
    checks.push({ id: "A1.1", name: "Hero headline too long", part: "A", category: "First Impression & Clarity", severity: "critical", pass: false, score: 4, manualReview: false, finding: `H1 too long (${h1Words} words): "${h1Text.slice(0, 60)}"`, fix: "Shorten H1 to under 10 words." });
  } else {
    checks.push({ id: "A1.1", name: "Hero headline exists", part: "A", category: "First Impression & Clarity", severity: "critical", pass: true, score: 10, manualReview: false, finding: `Headline present: "${h1Text.slice(0, 60)}"`, fix: "Maintain a concise, benefit-led hero headline." });
  }

  const hasSupportingH2 = metadata.headingHierarchy.slice(metadata.headingHierarchy.findIndex((h) => h.tag === "h1") + 1).some((h) => h.tag === "h2");
  const hasSupportingParagraph = (metadata.paragraphs[0]?.length ?? 0) > 20;
  const a12pass = hasSupportingH2 || hasSupportingParagraph;
  checks.push({ id: "A1.2", name: a12pass ? "Supporting subheadline exists" : "Subheadline missing", part: "A", category: "First Impression & Clarity", severity: "major", pass: a12pass, score: a12pass ? 10 : 0, manualReview: false, finding: a12pass ? "Supporting text present below hero." : "No supporting text below headline.", fix: "Add a 1-2 sentence subheadline." });
  checks.push(manual("A1.3", "Hero section visual hierarchy", "First Impression & Clarity", "major", "A"));

  if (metadata.ctaCount < 1) {
    checks.push({ id: "A1.4", name: "Primary CTA missing", part: "A", category: "First Impression & Clarity", severity: "critical", pass: false, score: 0, manualReview: false, finding: "No call-to-action found.", fix: "Add a prominent CTA button in the hero section." });
  } else if (GENERIC_CTA_TEXTS.has(firstCtaText)) {
    checks.push({ id: "A1.4", name: "CTA copy too generic", part: "A", category: "First Impression & Clarity", severity: "critical", pass: false, score: 4, manualReview: false, finding: `CTA exists but uses weak text: '${ctaTexts[0]}'`, fix: "Rewrite CTA: verb + benefit format." });
  } else {
    checks.push({ id: "A1.4", name: "Primary CTA visible", part: "A", category: "First Impression & Clarity", severity: "critical", pass: true, score: 10, manualReview: false, finding: `CTA detected: "${ctaTexts[0]?.slice(0, 40)}"`, fix: "Keep CTA copy specific and action-oriented." });
  }

  const a15pass = metadata.ctaCount >= 2;
  checks.push({ id: "A1.5", name: a15pass ? "Secondary CTA exists" : "Secondary CTA missing", part: "A", category: "First Impression & Clarity", severity: "minor", pass: a15pass, score: a15pass ? 10 : 0, manualReview: false, finding: a15pass ? "Primary and secondary action paths available." : "Only one action path.", fix: "Add a secondary CTA like 'See how it works'." });
  checks.push(manual("A1.6", "Visual contrast and readability", "First Impression & Clarity", "major", "A"));
  checks.push(manual("A1.7", "Hero relevance to offer", "First Impression & Clarity", "major", "A"));

  const aboveFoldEstimate = metadata.navLinkCount + metadata.ctaCount + metadata.h1Count + Math.min(metadata.imageCount, 3);
  const a18pass = aboveFoldEstimate <= 9;
  checks.push({ id: "A1.8", name: a18pass ? "Above-fold is clean" : "Above-fold clutter detected", part: "A", category: "First Impression & Clarity", severity: "major", pass: a18pass, score: a18pass ? 10 : 0, manualReview: false, finding: a18pass ? "Above-fold density is clean." : `Above-fold cluttered with ${aboveFoldEstimate} elements.`, fix: "Reduce above-fold complexity." });

  if (metadata.navLinkCount < 1) {
    checks.push({ id: "A2.1", name: "Navigation missing", part: "A", category: "Navigation & Structure", severity: "critical", pass: false, score: 0, manualReview: false, finding: "No navigation found.", fix: "Add a nav bar with 5-7 items." });
  } else if (metadata.navLinkCount > 7) {
    checks.push({ id: "A2.1", name: "Navigation overloaded", part: "A", category: "Navigation & Structure", severity: "critical", pass: false, score: 5, manualReview: false, finding: `Nav has ${metadata.navLinkCount} links — too many.`, fix: "Trim nav to 5-7 items." });
  } else {
    checks.push({ id: "A2.1", name: "Navigation well-structured", part: "A", category: "Navigation & Structure", severity: "critical", pass: true, score: 10, manualReview: false, finding: `Nav has ${metadata.navLinkCount} links.`, fix: "Maintain clear, concise navigation." });
  }

  checks.push(manual("A2.2", "Mobile navigation quality", "Navigation & Structure", "major", "A"));

  const a23pass = metadata.logoLinksHome;
  checks.push({ id: "A2.3", name: a23pass ? "Logo links to homepage" : "Logo home link missing", part: "A", category: "Navigation & Structure", severity: "minor", pass: a23pass, score: a23pass ? 10 : 0, manualReview: false, finding: a23pass ? "Logo links to homepage." : "Logo may not link to homepage.", fix: "Wrap logo in an anchor tag pointing to '/'." });

  checks.push(manual("A2.4", "Footer completeness", "Navigation & Structure", "minor", "A"));
  checks.push(manual("A2.5", "Breadcrumbs for deep pages", "Navigation & Structure", "minor", "A"));
  checks.push(manual("A3.1", "Value proposition clarity", "Copy & Messaging", "critical", "A"));
  checks.push(manual("A3.2", "Scannable body copy", "Copy & Messaging", "major", "A"));
  checks.push(manual("A3.3", "Microcopy quality", "Copy & Messaging", "minor", "A"));
  checks.push(manual("A3.4", "Error message clarity", "Copy & Messaging", "minor", "A"));

  const placeholderMatch = PLACEHOLDER_PATTERNS.map((p) => metadata.bodyTextContent.match(p)).find((m) => m !== null);
  const a35pass = !placeholderMatch;
  checks.push({ id: "A3.5", name: a35pass ? "No placeholder text" : "Placeholder text detected", part: "A", category: "Copy & Messaging", severity: "critical", pass: a35pass, score: a35pass ? 10 : 0, manualReview: false, finding: placeholderMatch ? `Placeholder text found: '${placeholderMatch[0]}'` : "No placeholder text detected.", fix: "Replace all placeholder text." });
  checks.push(manual("A3.6", "Content proofreading quality", "Copy & Messaging", "minor", "A"));

  const lowerBody = metadata.bodyTextContent.toLowerCase();
  const hasSocialSignals = /testimonial|review|social-proof|trust|client|customer/.test(lowerBody) || /"[^"]{10,}"\s*[-–]\s*[a-z]/i.test(metadata.bodyTextContent);
  checks.push({ id: "A4.1", name: hasSocialSignals ? "Social proof exists" : "Social proof missing", part: "A", category: "Trust & Social Proof", severity: "critical", pass: hasSocialSignals, score: hasSocialSignals ? 10 : 0, manualReview: false, finding: hasSocialSignals ? "Social proof signals detected." : "No social proof found.", fix: "Add testimonials with full name, role, and specific result." });
  checks.push(manual("A4.2", "Credibility specificity", "Trust & Social Proof", "major", "A"));

  const hasLogoSignals = /logo|client|partner|brand/.test(lowerBody) || metadata.images.filter((img) => /logo|client|partner|brand/i.test(img.src) || /logo|client|partner|brand/i.test(img.alt ?? "")).length >= 3;
  checks.push({ id: "A4.3", name: hasLogoSignals ? "Client/partner logos present" : "Client logos missing", part: "A", category: "Trust & Social Proof", severity: "major", pass: hasLogoSignals, score: hasLogoSignals ? 10 : 0, manualReview: false, finding: hasLogoSignals ? "Client/partner logos detected." : "No client logos found.", fix: "Add 3-6 recognizable client/partner logos." });
  checks.push(manual("A4.4", "Case study depth", "Trust & Social Proof", "major", "A"));

  const hasSecuritySignals = /privacy|secure|ssl|encrypted/.test(lowerBody);
  const a45Pass = metadata.hasHttps && (metadata.formCount === 0 || hasSecuritySignals);
  checks.push({ id: "A4.5", name: a45Pass ? "Security signals present" : "Security signals missing", part: "A", category: "Trust & Social Proof", severity: "critical", pass: a45Pass, score: a45Pass ? 10 : 0, manualReview: false, finding: a45Pass ? "HTTPS and security signals present." : "No security signals near forms.", fix: "Add privacy policy link near forms." });
  checks.push(manual("A4.6", "Trust placement near CTAs", "Trust & Social Proof", "minor", "A"));

  const a51Pass = metadata.ctaCount >= 2;
  checks.push({ id: "A5.1", name: a51Pass ? "CTA repeated throughout page" : "CTA not repeated", part: "A", category: "CTA & Conversion Design", severity: "major", pass: a51Pass, score: a51Pass ? 10 : 0, manualReview: false, finding: a51Pass ? "CTAs distributed across page." : `Only ${metadata.ctaCount} CTA(s) found.`, fix: "Add CTAs at hero, mid-page, and footer." });
  checks.push(manual("A5.2", "CTA visual prominence", "CTA & Conversion Design", "major", "A"));

  const strongVerbs = /^(start|get|try|download|book|claim|join|create|request|schedule)/i;
  const benefitHints = /(free|my|today|now|report|demo|trial|audit|save|results)/i;
  let a53Score = 0, a53Finding = "No CTA found.", a53Name = "CTA copy too generic";
  if (ctaTexts.length > 0) {
    const hasVerbBenefit = ctaTexts.some((t) => strongVerbs.test(t) && benefitHints.test(t));
    const hasStrong = ctaTexts.some((t) => strongVerbs.test(t));
    const hasGeneric = ctaTexts.some((t) => GENERIC_CTA_TEXTS.has(t.toLowerCase()));
    if (hasVerbBenefit) { a53Score = 10; a53Finding = "CTA uses action verb + benefit phrasing."; a53Name = "CTA copy is action-oriented"; }
    else if (hasStrong) { a53Score = 7; a53Finding = "CTA uses action verbs but can be more benefit-led."; a53Name = "CTA copy is action-oriented"; }
    else if (hasGeneric) { a53Score = 4; a53Finding = `CTA '${ctaTexts[0]}' is generic.`; a53Name = "CTA copy too generic"; }
  }
  checks.push({ id: "A5.3", name: a53Name, part: "A", category: "CTA & Conversion Design", severity: "major", pass: a53Score >= 7, score: a53Score, manualReview: false, finding: a53Finding, fix: "Rewrite: [verb] + [benefit]." });

  const uniqueCtas = new Set(ctaTexts.map((t) => t.toLowerCase()));
  const a54pass = uniqueCtas.size <= 3;
  checks.push({ id: "A5.4", name: a54pass ? "CTAs are focused" : "Competing CTAs detected", part: "A", category: "CTA & Conversion Design", severity: "major", pass: a54pass, score: a54pass ? 10 : 4, manualReview: false, finding: a54pass ? "CTAs are focused." : `${uniqueCtas.size} different CTAs competing.`, fix: "Consolidate to 1 primary + 1 secondary CTA max." });

  checks.push(manual("A5.5", "CTA contrast and placement", "CTA & Conversion Design", "major", "A"));
  checks.push(manual("A6.1", "Visual hierarchy", "Layout & Visual Design", "major", "A"));
  checks.push(manual("A6.2", "Typography readability", "Layout & Visual Design", "minor", "A"));
  checks.push(manual("A6.3", "Whitespace balance", "Layout & Visual Design", "minor", "A"));
  checks.push(manual("A6.4", "Image quality consistency", "Layout & Visual Design", "minor", "A"));

  const hasTitle = Boolean(metadata.title);
  const hasDescription = Boolean(metadata.metaDescription);
  let titleScore = 0, descScore = 0;
  if (hasTitle) { if (metadata.titleLength < 30) titleScore = 4; else if (metadata.titleLength <= 60) titleScore = 10; else titleScore = 7; }
  if (hasDescription) { if (metadata.metaDescriptionLength < 70) descScore = 4; else if (metadata.metaDescriptionLength <= 160) descScore = 10; else descScore = 7; }
  checks.push({ id: "A7.1", name: hasTitle && hasDescription ? "Meta title & description present" : "Meta tags incomplete", part: "A", category: "Technical Readiness", severity: "major", pass: hasTitle && hasDescription, score: hasTitle && hasDescription ? Math.round((titleScore + descScore) / 2) : 0, manualReview: false, finding: hasTitle && hasDescription ? "Meta title and description present." : `Missing: ${!hasTitle ? "title" : ""}${!hasTitle && !hasDescription ? " and " : ""}${!hasDescription ? "description" : ""}`, fix: "Add meta title (50-60 chars) and description (120-160 chars)." });

  let a72Score = 10, a72Finding = "Heading hierarchy correct.", a72Name = "Heading hierarchy correct";
  if (metadata.h1Count === 0) { a72Score = 0; a72Finding = "No H1 found."; a72Name = "H1 missing"; }
  else if (metadata.h1Count > 1) { a72Score = 4; a72Finding = `Multiple H1s (${metadata.h1Count}).`; a72Name = "Multiple H1s detected"; }
  else if (metadata.hasSkippedHeadingLevels) { a72Score = 4; a72Finding = "Heading levels skipped."; a72Name = "Heading hierarchy broken"; }
  checks.push({ id: "A7.2", name: a72Name, part: "A", category: "Technical Readiness", severity: "major", pass: a72Score === 10, score: a72Score, manualReview: false, finding: a72Finding, fix: "Use exactly one H1, then H2, H3 in order." });

  const withAlt = metadata.imageCount - metadata.imagesWithoutAlt;
  let a73Score = 10;
  if (metadata.imageCount > 0) { if (withAlt === 0) a73Score = 0; else if (withAlt / metadata.imageCount < 0.5) a73Score = 4; else if (withAlt !== metadata.imageCount) a73Score = 7; }
  checks.push({ id: "A7.3", name: a73Score >= 7 ? "Images have alt text" : "Images missing alt text", part: "A", category: "Technical Readiness", severity: "major", pass: a73Score >= 7, score: a73Score, manualReview: false, finding: metadata.imageCount === 0 ? "No images." : `${metadata.imagesWithoutAlt}/${metadata.imageCount} images missing alt.`, fix: "Add descriptive alt text to all meaningful images." });

  const missing: string[] = [];
  if (!metadata.hasFavicon) missing.push("favicon");
  if (!metadata.hasOgTitle) missing.push("og:title");
  if (!metadata.hasOgImage) missing.push("og:image");
  if (!metadata.hasOgDescription) missing.push("og:description");
  let a74Score = 0;
  if (missing.length === 0) a74Score = 10; else if (missing.length === 1) a74Score = 7; else if (missing.length <= 3) a74Score = 5;
  checks.push({ id: "A7.4", name: missing.length === 0 ? "Favicon and OG tags complete" : "Favicon or OG tags missing", part: "A", category: "Technical Readiness", severity: "minor", pass: missing.length === 0, score: a74Score, manualReview: false, finding: missing.length === 0 ? "Favicon and OG tags complete." : `Missing: ${missing.join(", ")}`, fix: "Add favicon + og:title, og:image, og:description." });

  return checks;
}

// ─── PART B CHECKS ───
function runPartBChecks(metadata: PageMetadata, industry: Industry): CheckResult[] {
  const text = metadata.bodyTextContent.toLowerCase();
  const ctaText = metadata.ctas.map((c) => c.text.toLowerCase()).join(" ");

  if (industry === "saas") {
    const pricing = hasAny(text, ["pricing", "price", "plan", "free", "trial", "month", "year", "$", "£", "€", "/mo", "/yr"]);
    const howItWorks = hasAny(text, [
      "how it works",
      "how to",
      "step 1",
      "step 2",
      "getting started",
      "set up",
      "setup",
      "how do i",
      "takes a few minutes",
      "only takes",
      "easy as",
      "3 steps",
      "three steps",
      "in minutes",
    ]);
    const freeTrial = hasAny(`${text} ${ctaText}`, ["free trial", "try free", "start free", "no credit card", "demo", "book a demo"]);
    const integrations = hasAny(text, ["integrat", "connect", "works with", "compatible", "api"]);
    return [
      manual("B1.1", "Clear target user defined", "Industry-Specific (SaaS)", "major", "B"),
      { id: "B1.2", name: pricing ? "Pricing transparency present" : "Pricing transparency missing", part: "B", category: "Industry-Specific (SaaS)", severity: "major", pass: pricing, score: pricing ? 10 : 0, manualReview: false, finding: pricing ? "Pricing signals detected." : "No pricing info visible.", fix: "Show pricing or indicate free trial / contact for pricing." },
      { id: "B1.3", name: howItWorks ? '"How it works" section present' : '"How it works" section missing', part: "B", category: "Industry-Specific (SaaS)", severity: "major", pass: howItWorks, score: howItWorks ? 10 : 0, manualReview: false, finding: howItWorks ? "How-it-works section detected." : "No dedicated 'How it works' section found. Visitors need to understand your product before they'll convert — a clear 3-step section above the fold reduces drop-off and support queries.", fix: "Add a 3-step how-it-works section." },
      manual("B1.4", "Feature depth clarity", "Industry-Specific (SaaS)", "minor", "B"),
      { id: "B1.5", name: freeTrial ? "Free trial CTA present" : "Free trial CTA missing", part: "B", category: "Industry-Specific (SaaS)", severity: "major", pass: freeTrial, score: freeTrial ? 10 : 0, manualReview: false, finding: freeTrial ? "Free trial/demo signals found." : "No free trial or demo offer.", fix: "Add 'Start free trial' or 'Book a demo'." },
      manual("B1.6", "Onboarding friction", "Industry-Specific (SaaS)", "major", "B"),
      { id: "B1.7", name: integrations ? "Integrations shown" : "Integrations not shown", part: "B", category: "Industry-Specific (SaaS)", severity: "minor", pass: integrations, score: integrations ? 10 : 0, manualReview: false, finding: integrations ? "Integration signals detected." : "No integrations shown.", fix: "Show logos of tools your product works with." },
    ];
  }

  if (industry === "ecommerce") {
    const priceVisible = hasAny(text, [/[$£€]\s?\d+/, "price", "cost", "from"]);
    const shipping = hasAny(text, ["shipping", "delivery", "return", "refund", "free shipping", "money back"]);
    const trust = hasAny(text, ["secure", "ssl", "visa", "mastercard", "paypal", "stripe", "money back", "guarantee"]);
    return [
      manual("B2.1", "Product imagery quality", "Industry-Specific (Ecommerce)", "major", "B"),
      { id: "B2.2", name: priceVisible ? "Price is visible" : "Price not visible", part: "B", category: "Industry-Specific (Ecommerce)", severity: "critical", pass: priceVisible, score: priceVisible ? 10 : 0, manualReview: false, finding: priceVisible ? "Price signals visible." : "No visible pricing.", fix: "Make price visible without scrolling." },
      { id: "B2.5", name: shipping ? "Shipping/return info visible" : "Shipping/return info missing", part: "B", category: "Industry-Specific (Ecommerce)", severity: "major", pass: shipping, score: shipping ? 10 : 0, manualReview: false, finding: shipping ? "Shipping/return signals found." : "No shipping info visible.", fix: "Show shipping costs, timeline, and return policy." },
      { id: "B2.8", name: trust ? "Trust signals present" : "Trust signals missing", part: "B", category: "Industry-Specific (Ecommerce)", severity: "critical", pass: trust, score: trust ? 10 : 0, manualReview: false, finding: trust ? "Trust signals detected." : "No security signals near transactions.", fix: "Add payment icons, SSL badges, money-back guarantee." },
    ];
  }

  if (industry === "portfolio") {
    const about = hasAny(text, ["about", "i am", "i'm", "my name", "years of experience", "specializ"]);
    const contact = metadata.formCount > 0 || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(metadata.bodyTextContent) || hasAny(text, ["contact", "book", "schedule", "calendly"]);
    return [
      manual("B3.1", "Portfolio quality", "Industry-Specific (Portfolio)", "major", "B"),
      { id: "B3.2", name: about ? "About/bio is specific" : "About/bio missing", part: "B", category: "Industry-Specific (Portfolio)", severity: "major", pass: about, score: about ? 10 : 0, manualReview: false, finding: about ? "About/bio detected." : "No clear about section.", fix: "Add name, photo, expertise, and years of experience." },
      { id: "B3.3", name: contact ? "Contact method visible" : "Contact method missing", part: "B", category: "Industry-Specific (Portfolio)", severity: "critical", pass: contact, score: contact ? 10 : 0, manualReview: false, finding: contact ? "Contact path visible." : "No contact method found.", fix: "Add a contact form, email, or scheduling link." },
    ];
  }

  if (industry === "healthcare") {
    const disclaimer = hasAny(text, ["disclaimer", "not medical advice", "consult your", "fda", "medical professional"]);
    const privacy = hasAny(text, ["privacy", "hipaa", "gdpr", "data protection", "confidential"]);
    return [
      { id: "B4.1", name: disclaimer ? "Medical disclaimers present" : "Medical disclaimers missing", part: "B", category: "Industry-Specific (Healthcare)", severity: "critical", pass: disclaimer, score: disclaimer ? 10 : 0, manualReview: false, finding: disclaimer ? "Medical disclaimer found." : "No medical disclaimers.", fix: "Add visible medical disclaimers." },
      { id: "B4.3", name: privacy ? "Privacy handling visible" : "Privacy handling not visible", part: "B", category: "Industry-Specific (Healthcare)", severity: "critical", pass: privacy, score: privacy ? 10 : 0, manualReview: false, finding: privacy ? "Privacy signals found." : "No privacy signals.", fix: "Add explicit privacy/data handling statements." },
    ];
  }

  if (industry === "fintech") {
    const regulatory = hasAny(text, ["fca", "sec", "regulated", "licensed", "authorised", "authorized", "compliance"]);
    const fee = hasAny(text, ["fee", "charge", "cost", "no hidden", "transparent", "0%", "free transfer"]);
    return [
      { id: "B5.1", name: regulatory ? "Regulatory badges present" : "Regulatory badges missing", part: "B", category: "Industry-Specific (Fintech)", severity: "critical", pass: regulatory, score: regulatory ? 10 : 0, manualReview: false, finding: regulatory ? "Regulatory language detected." : "No regulatory badges.", fix: "Display FCA/SEC registration and compliance badges." },
      { id: "B5.3", name: fee ? "Fee transparency present" : "Fee transparency missing", part: "B", category: "Industry-Specific (Fintech)", severity: "major", pass: fee, score: fee ? 10 : 0, manualReview: false, finding: fee ? "Fee transparency detected." : "No fee information visible.", fix: "Show all fees clearly." },
    ];
  }

  if (industry === "service") {
    const services = hasAny(text, ["service", "what we do", "our offering", "we help", "solutions"]);
    const process = hasAny(text, ["process", "how we work", "our approach", "step 1", "methodology"]);
    const booking = hasAny(`${text} ${ctaText}`, ["book", "schedule", "calendly", "free consultation", "get in touch"]) || (metadata.formCount > 0 && metadata.inputFields.length < 6);
    return [
      { id: "B6.1", name: services ? "Services clearly listed" : "Services not clearly listed", part: "B", category: "Industry-Specific (Service)", severity: "critical", pass: services, score: services ? 10 : 0, manualReview: false, finding: services ? "Service language present." : "No clear service listing.", fix: "List specific services with 1-line descriptions." },
      { id: "B6.2", name: process ? "Process shown" : "Process not shown", part: "B", category: "Industry-Specific (Service)", severity: "major", pass: process, score: process ? 10 : 0, manualReview: false, finding: process ? "Process section found." : "No how-we-work section.", fix: "Add a process section: Discovery → Strategy → Execution → Results." },
      { id: "B6.5", name: booking ? "Booking is frictionless" : "Booking friction detected", part: "B", category: "Industry-Specific (Service)", severity: "major", pass: booking, score: booking ? 10 : 0, manualReview: false, finding: booking ? "Low-friction booking detected." : "No easy booking option.", fix: "Add Calendly or short contact form (name + email + message)." },
    ];
  }

  return [];
}

// ─── PART C CHECKS ───
function runPartCChecks(metadata: PageMetadata): CheckResult[] {
  const ratio = Number.isFinite(metadata.youWeRatio) ? metadata.youWeRatio : metadata.youCount > 0 ? 99 : 0;
  let c41Score = 0, c41Finding = `Company-centric copy. You/We ratio: ${ratio.toFixed(2)}:1`, c41Name = "Copy is company-centric";
  if (ratio >= 4) { c41Score = 10; c41Finding = `Excellent customer-centric copy. Ratio: ${ratio.toFixed(2)}:1`; c41Name = "Copy is customer-centric"; }
  else if (ratio >= 2) { c41Score = 7; c41Finding = `Good but could be more customer-centric. Ratio: ${ratio.toFixed(2)}:1`; c41Name = "Copy is customer-centric"; }
  else if (ratio >= 1) { c41Score = 4; c41Finding = `Balanced but leans company-centric. Ratio: ${ratio.toFixed(2)}:1`; c41Name = "Copy leans company-centric"; }

  const text = metadata.bodyTextContent.toLowerCase();
  const featureMatches = text.match(/\b(includes?|features?|built with|powered by|supports?|allows?)\b/g) ?? [];
  const benefitMatches = text.match(/\b(you'll|save|grow|reduce|increase|without|never again|imagine|finally|stop|effortless)\b/g) ?? [];
  let c42Score = 0, c42Assessment = "No benefit language detected.", c42Name = "Feature-focused copy";
  if (benefitMatches.length > featureMatches.length) { c42Score = 10; c42Assessment = "Benefits-led messaging."; c42Name = "Benefits-led copy"; }
  else if (benefitMatches.length > 0 && benefitMatches.length === featureMatches.length) { c42Score = 7; c42Assessment = "Features and benefits balanced."; c42Name = "Benefits-led copy"; }
  else if (benefitMatches.length > 0) { c42Score = 4; c42Assessment = "Feature-focused copy dominates."; c42Name = "Feature-focused copy"; }

  const ctaTexts = metadata.ctas.map((c) => c.text.toLowerCase());
  const benefitCTA = ctaTexts.some((t) => /free|my|today|audit|report|demo|trial|save|results/.test(t));
  let c52Score = 0, c52Pass = false, c52Name = "CTAs disconnected from content";
  if (metadata.ctaCount > 0 && metadata.paragraphs.length > 0) { c52Score = benefitCTA ? 10 : 7; c52Pass = true; c52Name = "Reading path leads to CTA"; }
  else if (metadata.ctaCount > 0) { c52Score = 4; c52Name = "CTAs present but disconnected"; }

  return [
    manual("C1.1", "Brand tone consistency", "Brand Foundation", "major", "C"),
    manual("C1.2", "Distinct value narrative", "Brand Foundation", "major", "C"),
    manual("C2.1", "Audience resonance", "Audience Fit", "major", "C"),
    manual("C2.2", "Offer-to-audience relevance", "Audience Fit", "major", "C"),
    manual("C3.1", "Positioning clarity", "Positioning", "major", "C"),
    manual("C3.2", "Differentiation strength", "Positioning", "major", "C"),
    { id: "C4.1", name: c41Name, part: "C", category: "Emotional Resonance", severity: "major", pass: c41Score >= 7, score: c41Score, manualReview: false, finding: c41Finding, fix: "Replace 'We offer...' with 'You get...'. Target 4:1 you/we ratio." },
    { id: "C4.2", name: c42Name, part: "C", category: "Emotional Resonance", severity: "major", pass: c42Score >= 7, score: c42Score, manualReview: false, finding: `${featureMatches.length} feature phrases vs ${benefitMatches.length} benefit phrases. ${c42Assessment}`, fix: "Lead with benefits, support with features." },
    manual("C5.1", "Visual-message consistency", "Copy-Design Alignment", "major", "C"),
    { id: "C5.2", name: c52Name, part: "C", category: "Copy-Design Alignment", severity: "major", pass: c52Pass, score: c52Score, manualReview: false, finding: c52Pass ? "CTAs well-positioned after content." : "CTAs disconnected from content flow.", fix: "Place CTAs immediately after persuasive content sections." },
  ];
}

// ─── SCORING ───
function calculateScores(results: CheckResult[]): AuditScores {
  // All checks included in scoring. Manual checks score 5/10 (unverified risk).
  // Automated checks score 0 or 10 based on pass/fail.
  const averageScore = (arr: CheckResult[]): number => {
    if (arr.length === 0) return 0;
    const avg = arr.reduce((s, r) => s + r.score, 0) / arr.length;
    return Math.round(avg * 10);
  };
  const partA = averageScore(results.filter((r) => r.part === "A"));
  const partB = averageScore(results.filter((r) => r.part === "B"));
  const partC = averageScore(results.filter((r) => r.part === "C"));
  const total = Math.round(partA * 0.5 + partB * 0.3 + partC * 0.2);
  const label = total >= 80 ? "Strong" : total >= 60 ? "Decent" : total >= 40 ? "Needs Work" : "Critical";
  const automatedOnly = results.filter((r) => !r.manualReview);
  return {
    total, partA, partB, partC, label,
    checksPassed: automatedOnly.filter((r) => r.pass).length,
    checksFlagged: results.filter((r) => r.manualReview).length,
    criticalIssues: automatedOnly.filter((r) => r.severity === "critical" && !r.pass).length,
  };
}

// ─── TOP FINDINGS ───
function getTopFindings(findings: CheckResult[], limit: number): CheckResult[] {
  const weight: Record<Severity, number> = { critical: 3, major: 2, minor: 1 };
  return findings
    .filter((f) => !f.pass && !f.manualReview)
    .sort((a, b) => (weight[b.severity] * 100 + (10 - b.score)) - (weight[a.severity] * 100 + (10 - a.score)))
    .slice(0, limit);
}

const AI_PROMPT_TEMPLATES: Record<string, string> = {
  "A1.1": `Rewrite the hero H1 for {{domain}}.

Audit finding: {{finding}}

Requirements:
- Under 10 words
- Lead with the user outcome, not the product or company name
- Use "you" language
- No jargon or buzzwords
- Tone: direct and confident

Write 3 headline options, each under 10 words.`,
  "A1.2": `Write a supporting subheadline for {{domain}}.

Audit finding: {{finding}}

Requirements:
- 1–2 sentences, max 25 words
- Expands on the H1 — adds specificity or context
- Names the user, their problem, or the outcome
- Does not repeat the H1

Write 3 subheadline options.`,
  "A1.3": `Improve the visual hierarchy of the hero section on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Define a clear reading order: H1 → subheadline → CTA → supporting content
- Reduce visual noise
- Recommend font size ratios, spacing, and element prioritisation

Write a visual hierarchy brief for the hero section.`,
  "A1.4": `Rewrite the primary CTA button copy for {{domain}}.

Audit finding: {{finding}}

Requirements:
- Format: [strong action verb] + [specific benefit or outcome]
- Under 5 words
- Avoid: Submit, Click, Go, Continue, Learn More
- Reduce commitment anxiety where possible

Write 3 CTA button copy options.`,
  "A1.5": `Add a secondary CTA to the hero section of {{domain}}.

Audit finding: {{finding}}

Requirements:
- Lower commitment than the primary CTA
- Examples: "See a 2-min demo", "Watch how it works", "Explore features"
- Visually subordinate — outline or ghost button style

Write 3 secondary CTA options with a brief description of the button treatment.`,
  "A1.6": `Improve visual contrast and readability on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Identify text/background combinations failing WCAG AA (4.5:1 for body, 3:1 for large text)
- Recommend specific hex colour replacements
- Flag text placed over images without sufficient overlay
- Include CSS changes needed

Write a contrast audit with specific colour recommendations.`,
  "A1.7": `Improve the relevance of the hero section to the core offer on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Hero copy, image, and CTA must all reference the same product or outcome
- Identify misalignment between visual and copy
- Rewrite hero copy to be tightly aligned to the primary offer

Write revised hero copy and an image direction brief.`,
  "A1.8": `Reduce above-fold complexity on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Keep: H1, subheadline, one primary CTA, optional hero image
- Remove or defer: secondary nav items, banners, multiple badges, social proof rows
- Explain the rationale for each removal

Write a prioritised list of elements to cut and why.`,
  "A2.1": `Restructure the navigation for {{domain}}.

Audit finding: {{finding}}

Requirements:
- Max 5–7 nav items
- Most important conversion path on the right as a button
- Group related items if needed

Suggest a revised nav structure with item labels and groupings.`,
  "A2.2": `Improve the mobile navigation on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Most critical conversion action accessible within 1 tap
- Nav items min 48px touch targets
- Recommend menu open/close behaviour

Write a mobile navigation UX brief with structure and interaction notes.`,
  "A2.3": `Fix the logo link on {{domain}}.

Audit finding: {{finding}}

Write the HTML anchor tag wrapping the logo so it links to the homepage root (/). Include aria-label="Go to homepage" for accessibility.`,
  "A2.4": `Improve the footer on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Include: company name, key nav links, legal links (Privacy, Terms), social icons, copyright
- Clean layout — 2–4 columns max

Write a footer content structure with recommended sections and copy.`,
  "A2.5": `Add breadcrumbs to the deep pages on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Show current location in the site hierarchy
- Clickable parent links
- Use schema.org BreadcrumbList structured data

Write the HTML + JSON-LD schema for a breadcrumb component.`,
  "A3.1": `Clarify the value proposition on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Answer in one sentence: what it is, who it's for, and what outcome it delivers
- Format: "[Product] helps [audience] [achieve outcome] by [mechanism]"
- Should be visible above the fold

Write the value proposition statement and a revised hero copy block using it.`,
  "A3.2": `Rewrite the body copy on {{domain}} for scannability.

Audit finding: {{finding}}

Requirements:
- Short paragraphs — max 3 lines each
- Add subheadings every 2–3 paragraphs
- Use bullet points for lists of 3 or more items
- Bold the most important phrase in each paragraph

Rewrite the longest body section using these principles.`,
  "A3.3": `Improve the microcopy on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Form field labels: short and specific
- Placeholder text: example-based (e.g. "jane@example.com" not "Enter your email")
- Button labels: action + outcome
- Error messages: human, specific, tell the user what to do

Rewrite the form labels, placeholders, button copy, and one error message.`,
  "A3.4": `Rewrite the error messages on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Human and specific — tell the user exactly what went wrong
- Tell the user how to fix it
- No generic "Something went wrong" messages
- Positive framing where possible

Write 5 example error messages for common form validation scenarios.`,
  "A3.5": `Remove placeholder text from {{domain}}.

Audit finding: {{finding}}

Replace all identified placeholder text with production-ready copy or realistic stand-ins formatted as examples, not instructional text.`,
  "A3.6": `Proofread and improve the copy on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Fix spelling and grammar errors
- Ensure consistent capitalisation and punctuation
- Remove filler words and redundant phrases
- Flag passive voice and suggest active alternatives

List all corrections with before/after examples.`,
  "A4.1": `Add social proof to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Write 3 short customer testimonial quotes (1 sentence each, max 15 words)
- Each quote must name a specific measurable outcome
- Include placeholder name, role, and company
- Sound authentic — specific and direct, not marketing-speak

Write 3 testimonial quotes and the HTML structure to display them.`,
  "A4.2": `Add specific credibility signals to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Replace vague claims ("thousands of customers") with specific numbers ("2,400+ customers")
- Add named outcomes ("reduced onboarding time by 60%")
- Include industry or company names where possible

Write 3 specific credibility claims and the HTML for a metrics row.`,
  "A4.3": `Add client or partner logos to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Display 4–8 recognisable logos in a horizontal row
- Add a headline: "Trusted by teams at..." or "Used by..."
- Monochrome or low-saturation treatment for visual consistency

Write the section headline, logo grid structure, and optional subheadline.`,
  "A4.4": `Add case study content to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Structure: Customer name + role → Problem → Solution → Specific measurable outcome
- 100–150 words per case study
- Pull quote with the most impressive number or outcome

Write one full case study in the required structure with placeholder details.`,
  "A4.5": `Add security and trust signals to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Place a privacy reassurance line near every form CTA
- Include SSL/HTTPS badge if relevant
- Link to privacy policy inline

Write the trust copy for near-CTA placement and the HTML for a security badge row.`,
  "A4.6": `Add trust signals near the CTAs on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Every primary CTA should have a 1-line trust reinforcement beneath it
- Examples: "No credit card required", "Cancel anytime", "GDPR compliant"
- Match the trust signal to the likely objection at each CTA position

Write trust micro-copy for each CTA on the page with the matching objection it addresses.`,
  "A5.1": `Add CTAs at missing positions on {{domain}}.

Audit finding: {{finding}}

Requirements:
- CTA at hero, mid-page after the strongest value section, and bottom of page
- Each CTA copy should reflect the content that precedes it
- Don't use identical copy at every position

Write copy for 3 positioned CTAs with their placement rationale.`,
  "A5.2": `Improve the visual prominence of CTAs on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Primary CTA: filled button, brand colour, high contrast
- Secondary CTA: outline or ghost style
- Min button size: 44px height, 120px width
- Include hover state

Write the CSS for primary and secondary button styles with hover states.`,
  "A5.3": `Rewrite the CTA copy on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Format: [action verb] + [specific benefit or outcome]
- Avoid generic verbs: Submit, Click, Go, Send, Continue
- Under 5 words for buttons, up to 10 words for link CTAs

Write 3 improved CTA options for the primary conversion action.`,
  "A5.4": `Consolidate the CTAs on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Identify the single primary conversion action for this page
- Maximum: 1 primary CTA + 1 secondary CTA per section
- Explain which CTAs to cut and why

Write the revised CTA hierarchy with copy and button treatment for each.`,
  "A5.5": `Fix CTA contrast and placement on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Button text must meet WCAG AA contrast ratio (4.5:1) against button background
- Primary CTA must be visible above the fold on all screen sizes

Write specific CSS fixes for contrast and placement with before/after values.`,
  "A6.1": `Improve the visual hierarchy on {{domain}}.

Audit finding: {{finding}}

Requirements:
- One dominant visual focus per section
- Size, weight, and colour should signal importance
- Reduce the number of elements competing for attention

Write a section-by-section visual hierarchy brief with specific recommendations.`,
  "A6.2": `Improve typography readability on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Body font size: min 16px
- Line height: 1.5–1.75 for body text
- Line length: 60–75 characters per line
- Sufficient contrast between heading and body weights

Write a typography system recommendation with specific CSS values.`,
  "A6.3": `Improve whitespace balance on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Increase padding between sections (min 80px vertical)
- Add breathing room around CTAs and key headlines
- Recommend consistent spacing tokens (8px base grid)

Write a spacing audit with specific CSS padding/margin recommendations per section.`,
  "A6.4": `Improve image quality and consistency on {{domain}}.

Audit finding: {{finding}}

Requirements:
- All images should share a consistent style
- No low-resolution or stretched images
- Compress images for web (WebP preferred, under 200KB for hero)
- Alt text on all meaningful images

Write an image audit brief with specific replacement or treatment recommendations.`,
  "A7.1": `Write optimised meta tags for {{domain}}.

Audit finding: {{finding}}

Requirements:
- Meta title: 50–60 characters, include primary keyword + brand name
- Meta description: 120–160 characters, include primary keyword and a CTA

Write the meta title and description as ready-to-use HTML meta tags.`,
  "A7.2": `Fix the heading structure on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Exactly one H1 per page
- H2 for main sections, H3 for subsections
- No skipped heading levels

Write the corrected heading outline for the page with recommended copy for each level.`,
  "A7.3": `Write alt text for the images on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Descriptive alt text for all meaningful images
- Empty alt="" for purely decorative images
- Max 125 characters per alt text
- Include keywords naturally — don't keyword-stuff

Write alt text for 5 common image types on this site (hero, feature icons, team photos, product screenshots, logos).`,
  "A7.4": `Add missing meta and social sharing tags to {{domain}}.

Audit finding: {{finding}}

Write the complete HTML <head> block including og:title, og:description, og:image (1200×630px), og:url, favicon link, and twitter:card. Include recommended dimensions and character counts as comments.`,
  "B1.1": `Define and communicate the target user more clearly on {{domain}}.

Audit finding: {{finding}}

Requirements:
- The hero section should name the target user within the first 10 words
- Avoid generic "teams" or "businesses" — be specific
- The entire page copy should speak to one primary persona

Rewrite the hero headline and subheadline to name the target user explicitly.`,
  "B1.2": `Add pricing transparency to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Show plan names, monthly price, and 3 key features per tier
- Add a value anchor sentence above the pricing grid to justify cost
- If no public pricing: add a clear "Contact us for pricing" CTA

Write the value anchor copy and pricing section structure.`,
  "B1.3": `Write a "How it works" section for {{domain}}.

Audit finding: {{finding}}

Requirements:
- 3 steps maximum
- Each step: short title (3–5 words) + 1-sentence description
- Start from the user's perspective ("Connect your store", "Review your dashboard")

Write the 3-step section with titles, descriptions, and icon suggestions.`,
  "B1.4": `Improve feature clarity on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Each feature card: title + 1-sentence benefit-led description
- Lead with what the user gets, not what the feature does
- Add a "Why it matters" line if the feature is technical

Rewrite 3 feature descriptions using the benefit-led format.`,
  "B1.5": `Add a free trial or demo offer to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Reduce commitment with "no credit card required" or "cancel anytime"
- CTA should appear in the hero and at least one mid-page position
- Write the CTA button copy and a 1-line value reinforcement beneath it

Write 3 low-commitment CTA options with supporting trust micro-copy.`,
  "B1.6": `Reduce onboarding friction on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Signup form: max 2–3 fields
- Add a "takes 2 minutes" or "no setup required" reassurance near the form
- Show what happens after signup
- Remove any fields that aren't essential for first login

Write the revised signup form structure with field labels, copy, and trust micro-copy.`,
  "B1.7": `Add integration signals to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Display logos of 6–12 tools the product integrates with
- Add a headline: "Works with the tools you already use"
- Link to a full integrations page if available

Write the section headline, logo grid structure, and optional subheadline.`,
  "B2.1": `Improve product imagery on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Multiple angles per product (min 3 images)
- Clean background for primary image
- Lifestyle image showing the product in use
- Consistent image dimensions across all products

Write a product photography brief with shot list and technical specifications.`,
  "B2.2": `Make pricing more visible on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Price must be visible without scrolling on all devices
- Show original price crossed out alongside sale price
- Use sufficient font size (min 20px for price)

Write the price display HTML with typography recommendations.`,
  "B2.5": `Add shipping and returns information to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Show estimated delivery time near the purchase CTA
- State return window clearly
- Include free shipping threshold if applicable

Write the shipping/returns micro-copy block for near-CTA placement.`,
  "B2.8": `Add trust and security signals near the purchase CTA on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Payment icons: Visa, Mastercard, PayPal, Stripe (whichever apply)
- SSL/secure badge and money-back guarantee
- Customer review count and star rating
- Place all within 100px of the buy button

Write the trust signal block HTML with placeholder badge images and copy.`,
  "B3.1": `Improve portfolio presentation on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Each project: title, brief description, your role, outcome or result
- Show process or before/after, not just final outputs
- Consistent image treatment across all portfolio items

Write a portfolio item template with all required fields and placeholder copy.`,
  "B3.2": `Improve the about section on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Name + professional photo
- 2–3 sentences: who you are, what you specialise in, years of experience
- Name 2–3 notable clients, brands, or outcomes
- Tone: confident but approachable — first person

Write a bio in 2 versions: short (50 words) and long (120 words).`,
  "B3.3": `Add a clear contact method to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Contact form: name, email, message — max 3 fields
- Add a 1-line invitation: "Let's work together" or "Open to new projects"
- Place in the hero, after work samples, and in the footer

Write the contact section copy and the HTML form structure.`,
  "B4.1": `Add medical disclaimers to {{domain}}.

Audit finding: {{finding}}

Requirements:
- "This content is for informational purposes only and does not constitute medical advice"
- "Consult a qualified healthcare professional before making any medical decisions"
- Place in the footer and near any health claims

Write the disclaimer copy and recommend placement positions.`,
  "B4.3": `Add privacy and data handling signals to {{domain}}.

Audit finding: {{finding}}

Requirements:
- State clearly how patient or user data is handled
- Reference HIPAA, GDPR, or relevant regulation
- Add a reassurance line near any form or data collection point

Write the privacy statement copy and recommend placement positions.`,
  "B5.1": `Add regulatory and compliance signals to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Display relevant regulatory body (FCA, SEC, etc.) with registration number
- Add "Authorised and regulated by [body]" in the footer
- Link to the regulatory record

Write the regulatory disclosure copy and footer HTML.`,
  "B5.3": `Add fee transparency to {{domain}}.

Audit finding: {{finding}}

Requirements:
- Show all fees clearly — transaction fees, monthly fees, FX markups
- "No hidden fees" statement if applicable
- Link to a full fee schedule

Write the fee transparency section copy and a comparison table structure.`,
  "B6.1": `Clearly list services on {{domain}}.

Audit finding: {{finding}}

Requirements:
- List each service with: name, 1-sentence description, who it's for
- Group related services if more than 5
- Add a "Most popular" badge to one service

Write a services section with 3 example service cards.`,
  "B6.2": `Add a process section to {{domain}}.

Audit finding: {{finding}}

Requirements:
- 3–4 steps maximum
- Each step: number + title + 1-sentence description
- Start with discovery/consultation, end with results/delivery

Write the process section with step titles and descriptions.`,
  "B6.5": `Reduce booking friction on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Add a Calendly link or short contact form (name + email + message — max 3 fields)
- CTA copy: "Book a free call", "Schedule a consultation", "Get in touch"
- Add a 1-line reassurance: "Usually responds within 24 hours"

Write the booking CTA copy and the short form HTML.`,
  "C1.1": `Improve brand tone consistency across {{domain}}.

Audit finding: {{finding}}

Requirements:
- Define a tone-of-voice in 3 adjectives
- Identify sections where the tone shifts or feels inconsistent
- Rewrite 2 inconsistent sections to match the defined tone

Write the tone-of-voice definition and rewrite 2 sections to match it.`,
  "C1.2": `Sharpen the value narrative on {{domain}}.

Audit finding: {{finding}}

Requirements:
- The narrative should answer: why this product, why now, why for this person
- Every section should reinforce one central idea
- Identify where the narrative loses focus or contradicts itself

Write a one-paragraph narrative brief and rewrite the hero + first body section to align with it.`,
  "C2.1": `Improve audience resonance on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Use language your target audience uses — not internal jargon
- Name their specific problem in the first 2 sections
- Reference the emotional state of the problem (frustration, wasted time, missed revenue)

Rewrite the hero and first body section to deeply resonate with the target audience.`,
  "C2.2": `Improve the relevance of the offer to the audience on {{domain}}.

Audit finding: {{finding}}

Requirements:
- The offer must directly address the audience's most pressing problem
- Lead with the benefit the audience cares about most
- Add specificity: name the audience, their industry, or their use case

Rewrite the offer description to tightly match the audience's primary pain point.`,
  "C3.1": `Sharpen the positioning on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Complete this sentence: "[Product] is the only [category] that [differentiator] for [audience]"
- The positioning should be visible in the H1 or subheadline
- Must differentiate from the top 2–3 competitors

Write the positioning statement and integrate it into the hero copy.`,
  "C3.2": `Strengthen the differentiation on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Identify the 1–2 things this product does that competitors don't
- Express the differentiator in concrete, specific terms (not "best", "fastest", "easiest")
- Back the differentiator with a proof point (stat, customer quote, or feature)

Write a differentiator section with headline, description, and proof point.`,
  "C4.1": `Rewrite the company-centric copy on {{domain}} to be customer-centric.

Audit finding: {{finding}}

Requirements:
- Replace "We offer...", "Our platform...", "We built..." with "You get...", "Your team...", "You can..."
- Target a 4:1 you/we ratio across the page
- Keep the same meaning — only change the subject and perspective

Rewrite the hero headline, subheadline, and first body paragraph using customer-centric language.`,
  "C4.2": `Rewrite the feature-focused copy on {{domain}} to be benefit-led.

Audit finding: {{finding}}

Requirements:
- Lead every section with the user outcome, support it with the feature
- Pattern: "[Outcome you get] — [because/using feature]"
- Keep technical accuracy — don't sacrifice specificity for vagueness

Rewrite 3 feature descriptions using the benefit-led pattern.`,
  "C5.1": `Improve visual-message consistency on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Every image or illustration should reinforce the copy next to it
- No generic stock photos unrelated to the product
- Hero image should show the product or the outcome it delivers

Write an image direction brief for each major section.`,
  "C5.2": `Improve the reading path to CTA on {{domain}}.

Audit finding: {{finding}}

Requirements:
- Each CTA should appear immediately after the strongest persuasive content block
- The sentence before each CTA should create desire or resolve an objection
- Build momentum: problem → solution → proof → CTA

Write transition copy leading into the primary CTA and one mid-page CTA.`,
};

const FALLBACK_PROMPT = `Fix the following issue on {{domain}}.

Finding: {{finding}}
Recommended fix: {{fix}}

Implement this fix, maintaining the existing design language and tone of the site.`;

function generatePrompt(checkId: string, finding: string, fix: string, domain: string): string {
  const template = AI_PROMPT_TEMPLATES[checkId] ?? FALLBACK_PROMPT;
  return template
    .replace(/{{finding}}/g, finding)
    .replace(/{{fix}}/g, fix)
    .replace(/{{domain}}/g, domain);
}

const DOM_ZONE_MAP: Record<string, string> = {
  // Hero / first impression
  "A1.1": "hero",
  "A1.2": "hero",
  "A1.3": "hero",
  "A1.4": "hero",
  "A1.5": "hero",
  "A1.6": "hero",
  "A1.7": "hero",
  "A1.8": "hero",
  // Navigation
  "A2.1": "nav",
  "A2.2": "nav",
  "A2.3": "nav",
  "A2.4": "nav",
  "A2.5": "nav",
  // Copy & messaging
  "A3.1": "features",
  "A3.2": "features",
  "A3.3": "features",
  "A3.4": "features",
  "A3.5": "features",
  "A3.6": "features",
  // Trust & social proof
  "A4.1": "social",
  "A4.2": "social",
  "A4.3": "social",
  "A4.4": "social",
  "A4.5": "social",
  "A4.6": "social",
  // CTA & conversion
  "A5.1": "cta2",
  "A5.2": "cta2",
  "A5.3": "cta2",
  "A5.4": "cta2",
  "A5.5": "cta2",
  // Layout & visual
  "A6.1": "features",
  "A6.2": "features",
  "A6.3": "features",
  "A6.4": "features",
  // Technical
  "A7.1": "nav",
  "A7.2": "nav",
  "A7.3": "features",
  "A7.4": "nav",
  // Part B — all map to features
  "B1.1": "features", "B1.2": "pricing", "B1.3": "features",
  "B1.4": "features", "B1.5": "cta2",   "B1.6": "features", "B1.7": "features",
  "B2.1": "features", "B2.2": "pricing", "B2.5": "features", "B2.8": "social",
  "B3.1": "features", "B3.2": "features", "B3.3": "cta2",
  "B4.1": "features", "B4.3": "features",
  "B5.1": "social",   "B5.3": "pricing",
  "B6.1": "features", "B6.2": "features", "B6.5": "cta2",
  // Part C — copy/messaging
  "C1.1": "hero",    "C1.2": "hero",
  "C2.1": "features", "C2.2": "features",
  "C3.1": "hero",    "C3.2": "hero",
  "C4.1": "features", "C4.2": "features",
  "C5.1": "features", "C5.2": "cta2",
};

// ─── SAVE TO SUPABASE ───
async function saveAuditResults(url: string, domain: string, industry: Industry, scores: AuditScores, findings: CheckResult[], domData: Record<string, unknown>): Promise<string | null> {
  if (!supabase) return null;
  const { data: auditData, error: auditError } = await supabase.from("audits").insert({
    url, domain, industry, status: "complete",
    score: scores.total, part_a_score: scores.partA, part_b_score: scores.partB, part_c_score: scores.partC,
    score_label: scores.label, checks_passed: scores.checksPassed, checks_flagged: scores.checksFlagged, critical_issues: scores.criticalIssues, dom_data: domData,
  }).select("id").single();
  if (auditError || !auditData?.id) throw new Error(`Failed to create audit: ${auditError?.message}`);
  const rows = findings.map((f) => ({
    audit_id: auditData.id, check_id: f.id, name: f.name, severity: f.severity,
    pass: f.pass, score: f.score, finding: f.finding, fix: f.fix,
    category: f.category ?? null,
    part: f.part ?? null,
    dom_zone: DOM_ZONE_MAP[f.id] ?? "body-copy", glossary_terms: [],
    ai_prompt: generatePrompt(f.id, f.finding, f.fix, domain),
  }));
  const { error: findingsError } = await supabase.from("audit_findings").insert(rows);
  if (findingsError) throw new Error(`Failed to save findings: ${findingsError.message}`);
  return auditData.id;
}

// ─── MAIN HANDLER ───
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const payload = await req.json();
    if (!payload?.url) return jsonResponse({ error: "url required" }, 400);

    let targetUrl: URL;
    try { targetUrl = new URL(payload.url); } catch { return jsonResponse({ error: "Invalid URL" }, 400); }

    const industry: Industry = ["saas", "ecommerce", "portfolio", "healthcare", "fintech", "service"].includes(payload.industry)
      ? payload.industry
      : "saas";

    const fetchResult = await fetchHtml(targetUrl.toString());
    if (!fetchResult.success) return jsonResponse({ error: "URL_UNREACHABLE", message: fetchResult.error }, 502);

    const { html, response } = fetchResult;
    const strippedText = stripHtmlToText(html);
    const scriptCount = (html.match(/<script\b/gi) || []).length;
    if (strippedText.length < 200 && scriptCount > 5) {
      return jsonResponse({ error: "SPA_DETECTED", message: "Page appears JavaScript-rendered." }, 422);
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return jsonResponse({ error: "Failed to parse HTML" }, 500);

    const metadata = extractPageMetadata({ doc, html, url: targetUrl, statusCode: response.status, headers: headersToObject(response.headers) });
    const findings = [...runPartAChecks(metadata), ...runPartBChecks(metadata, industry), ...runPartCChecks(metadata)];
    const scores = calculateScores(findings);
    const topFindings = getTopFindings(findings, 5);

    const domData = {
      navLinks: metadata.navLinks.map((l) => l.text).filter(Boolean).slice(0, 10),
      h1Text: metadata.h1s[0]?.text ?? metadata.title ?? metadata.domain,
      h2Texts: metadata.headingHierarchy.filter((e) => e.tag === "h2").map((e) => e.text).slice(0, 10),
      h3Texts: metadata.headingHierarchy.filter((e) => e.tag === "h3").map((e) => e.text).slice(0, 10),
      ctaTexts: metadata.ctas.map((c) => c.text).filter(Boolean).slice(0, 10),
      paragraphTexts: metadata.paragraphs.slice(0, 5),
      imagesCount: metadata.imageCount,
      hasForm: metadata.formCount > 0,
      metaTitle: metadata.title ?? "",
    };

    const auditId = await saveAuditResults(targetUrl.toString(), metadata.domain, industry, scores, findings, domData);

    return jsonResponse({ auditId, scores, findings, topFindings, domData }, 200);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
