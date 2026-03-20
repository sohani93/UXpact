import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { saveAuditResults } from "./db.ts";
import { runPartAChecks } from "./checks/part-a.ts";
import { runPartBChecks } from "./checks/part-b.ts";
import { runPartCChecks } from "./checks/part-c.ts";
import { calculateScores } from "./scoring.ts";
import type { AuditRequest, Industry, PageMetadata } from "./types.ts";
import type { CheckResult } from "./checks/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const allowedIndustries: Industry[] = ["saas", "ecommerce", "portfolio", "healthcare", "fintech", "service"];

const CTA_TEXT_PATTERNS = ["get started", "start", "sign up", "try", "book", "contact", "buy", "subscribe", "learn more", "request", "demo"];

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload: AuditRequest = await req.json();
    const validationError = validatePayload(payload);
    if (validationError) {
      return jsonResponse({ success: false, error: validationError }, 400);
    }

    const targetUrl = new URL(payload.url);
    const fetchResult = await fetchHtml(targetUrl.toString());
    if (!fetchResult.success) {
      return jsonResponse({ error: "URL_UNREACHABLE", message: fetchResult.error }, 502);
    }

    const { html, response } = fetchResult;
    const scriptCount = countMatches(html, /<script\b/gi);
    const strippedText = stripHtmlToText(html);
    if (strippedText.length < 200 && scriptCount > 5) {
      return jsonResponse({
        error: "SPA_DETECTED",
        partial: true,
        message: "Page appears to be JavaScript-rendered with limited server HTML.",
      }, 422);
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
      return jsonResponse({ success: false, status: "failed_error", error: "Failed to parse HTML" }, 500);
    }

    const metadata = extractPageMetadata({
      doc,
      html,
      url: targetUrl,
      statusCode: response.status,
      headers: headersToObject(response.headers),
    });

    const [pageSpeedData, securityGrade] = await Promise.all([
      getPageSpeedScores(targetUrl.toString()),
      getSecurityGrade(targetUrl.hostname),
    ]);

    const findings = [
      ...runPartAChecks(metadata),
      ...runPartBChecks(metadata, payload.industry),
      ...runPartCChecks(metadata),
    ];

    const scores = calculateScores(findings);
    const topFindings = getTopFindings(findings, 5);
    const domData = {
      navLinks: metadata.navLinks.map((link) => link.text).filter(Boolean).slice(0, 10),
      h1Text: metadata.h1s[0]?.text ?? metadata.title ?? metadata.domain,
      h2Texts: metadata.headingHierarchy.filter((entry) => entry.tag === "h2").map((entry) => entry.text).filter(Boolean).slice(0, 10),
      h3Texts: metadata.headingHierarchy.filter((entry) => entry.tag === "h3").map((entry) => entry.text).filter(Boolean).slice(0, 10),
      ctaTexts: metadata.ctas.map((cta) => cta.text).filter(Boolean).slice(0, 10),
      paragraphTexts: metadata.paragraphs.slice(0, 20),
      imagesCount: metadata.imageCount,
      hasForm: metadata.formCount > 0,
    };
    const auditId = await saveAuditResults(
      metadata.url,
      metadata.domain,
      payload.industry,
      scores,
      findings,
      domData,
      pageSpeedData,
      securityGrade,
    );

    return jsonResponse({
      success: true,
      auditId,
      scores,
      findings,
      topFindings,
      domData,
      pagespeed: pageSpeedData,
      securityGrade,
      metadata,
    }, 200);
  } catch (error) {
    return jsonResponse({
      error: "PROCESSING_ERROR",
      message: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});

function getTopFindings(findings: CheckResult[], limit: number): CheckResult[] {
  const severityWeight: Record<CheckResult["severity"], number> = {
    critical: 3,
    major: 2,
    minor: 1,
  };

  return findings
    .filter((finding) => !finding.manualReview && !finding.pass)
    .sort((a, b) => (severityWeight[b.severity] * 100 + (10 - b.score)) - (severityWeight[a.severity] * 100 + (10 - a.score)))
    .slice(0, limit);
}

function validatePayload(payload: AuditRequest): string | null {
  if (!payload || typeof payload !== "object") return "Request body is required";
  if (typeof payload.url !== "string") return "url must be a string";
  if (typeof payload.industry !== "string") return "industry must be a string";
  if (!allowedIndustries.includes(payload.industry as Industry)) {
    return "industry must be one of: saas, ecommerce, portfolio, healthcare, fintech, service";
  }

  try {
    const parsedUrl = new URL(payload.url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return "url must start with http:// or https://";
  } catch {
    return "url must be a valid URL";
  }

  return null;
}

async function fetchHtml(url: string): Promise<{ success: true; html: string; response: Response } | { success: false; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "UXpactAuditBot/0.1 (+https://uxpact.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const html = await response.text();
    return { success: true, html, response };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, error: "Request timed out after 10 seconds" };
    }

    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch URL" };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getPageSpeedScores(
  url: string,
): Promise<{ performance: number; seo: number; accessibility: number; bestPractices: number } | null> {
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices`;
    const response = await fetch(apiUrl);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      performance: Math.round((data.lighthouseResult.categories.performance?.score || 0) * 100),
      seo: Math.round((data.lighthouseResult.categories.seo?.score || 0) * 100),
      accessibility: Math.round((data.lighthouseResult.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((data.lighthouseResult.categories["best-practices"]?.score || 0) * 100),
    };
  } catch {
    return null;
  }
}

async function getSecurityGrade(domain: string): Promise<string | null> {
  try {
    await fetch(`https://http-observatory.security.mozilla.org/api/v1/analyze?host=${domain}`, { method: "POST" });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const response = await fetch(`https://http-observatory.security.mozilla.org/api/v1/analyze?host=${domain}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.grade || null;
  } catch {
    return null;
  }
}

function extractPageMetadata(args: { doc: Document; html: string; url: URL; statusCode: number; headers: Record<string, string> }): PageMetadata {
  const { doc, url, statusCode, headers } = args;
  const title = textOrNull(doc.querySelector("title")?.textContent);
  const metaDescription = getMetaContent(doc, "description");
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;

  const headingHierarchy = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((heading) => {
    const tag = heading.tagName.toLowerCase();
    return { tag, text: cleanText(heading.textContent), level: Number.parseInt(tag.slice(1), 10) };
  });

  const h1Counts = new Map<string, number>();
  for (const heading of headingHierarchy.filter((entry) => entry.tag === "h1")) {
    const key = heading.text || "(empty h1)";
    h1Counts.set(key, (h1Counts.get(key) ?? 0) + 1);
  }
  const h1s = Array.from(h1Counts.entries()).map(([text, count]) => ({ text, count }));

  let hasSkippedHeadingLevels = false;
  for (let i = 1; i < headingHierarchy.length; i += 1) {
    if (headingHierarchy[i].level > headingHierarchy[i - 1].level + 1) {
      hasSkippedHeadingLevels = true;
      break;
    }
  }

  const navLinks = Array.from(doc.querySelectorAll("nav a[href]")).map((anchor) => ({ text: cleanText(anchor.textContent), href: anchor.getAttribute("href") ?? "" }));
  const allLinks = Array.from(doc.querySelectorAll("a[href]")).map((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    const resolved = safeResolveUrl(href, url);
    return { text: cleanText(anchor.textContent), href, isExternal: resolved ? resolved.origin !== url.origin : false };
  });

  const logoLinksHome = Array.from(doc.querySelectorAll("a[href]")).some((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    const classes = [anchor.className, anchor.id].join(" ").toLowerCase();
    const hasLogoSignal = classes.includes("logo") || Boolean(anchor.querySelector('img[alt*="logo" i], svg[aria-label*="logo" i]'));
    if (!hasLogoSignal) return false;

    const resolved = safeResolveUrl(href, url);
    if (!resolved) return ["/", "./", "#"].includes(href.trim());
    return resolved.origin === url.origin && resolved.pathname === "/";
  });

  const ctas = Array.from(doc.querySelectorAll("a, button, input[type='button'], input[type='submit'], [role='button']"))
    .map((element) => {
      const tag = element.tagName.toLowerCase();
      const text = cleanText(element.textContent || element.getAttribute("value") || "");
      const classes = (element.getAttribute("class") || "").trim();
      return { text, tag, classes };
    })
    .filter((entry) => {
      const normalized = entry.text.toLowerCase();
      const classText = entry.classes.toLowerCase();
      return normalized.length > 0 && (CTA_TEXT_PATTERNS.some((pattern) => normalized.includes(pattern)) || classText.includes("cta") || classText.includes("btn") || classText.includes("button"));
    });

  const images = Array.from(doc.querySelectorAll("img")).map((image) => {
    const alt = image.getAttribute("alt");
    return { src: image.getAttribute("src") ?? "", alt, hasAlt: typeof alt === "string" && alt.trim().length > 0 };
  });

  const ogTags: Record<string, string> = {};
  for (const meta of Array.from(doc.querySelectorAll('meta[property^="og:"]'))) {
    const property = meta.getAttribute("property");
    const content = meta.getAttribute("content");
    if (property && content) ogTags[property] = content;
  }

  const twitterCard = doc.querySelector('meta[name="twitter:card"]')?.getAttribute("content") ?? null;
  const jsonLdBlocks = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map((script) => cleanText(script.textContent)).filter((content) => content.length > 0);
  const paragraphs = Array.from(doc.querySelectorAll("p")).map((p) => cleanText(p.textContent)).filter((p) => p.length > 0);

  const bodyTextContent = cleanText(doc.body?.textContent ?? "");
  const words = bodyTextContent.length > 0 ? bodyTextContent.split(/\s+/) : [];

  const inputFields = Array.from(doc.querySelectorAll("input")).map((input) => ({
    type: input.getAttribute("type") ?? "text",
    name: input.getAttribute("name"),
    placeholder: input.getAttribute("placeholder"),
  }));

  const buttonTexts = Array.from(doc.querySelectorAll("button")).map((button) => cleanText(button.textContent)).filter((text) => text.length > 0);
  const youCount = countWordOccurrences(bodyTextContent, ["you", "your", "yours"]);
  const weCount = countWordOccurrences(bodyTextContent, ["we", "our", "us"]);

  return {
    url: url.toString(),
    domain: url.hostname,
    statusCode,
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    canonical,
    h1s,
    h1Count: h1s.reduce((sum, h1) => sum + h1.count, 0),
    headingHierarchy,
    hasSkippedHeadingLevels,
    navLinks,
    navLinkCount: navLinks.length,
    logoLinksHome,
    ctas,
    ctaCount: ctas.length,
    images,
    imageCount: images.length,
    imagesWithoutAlt: images.filter((image) => !image.hasAlt).length,
    ogTags,
    hasOgImage: Boolean(ogTags["og:image"]),
    hasOgTitle: Boolean(ogTags["og:title"]),
    hasOgDescription: Boolean(ogTags["og:description"]),
    twitterCard,
    hasFavicon: Boolean(doc.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')),
    hasViewportMeta: Boolean(doc.querySelector('meta[name="viewport"]')),
    charset: doc.querySelector("meta[charset]")?.getAttribute("charset") ?? extractCharsetFromContentType(doc.querySelector('meta[http-equiv="Content-Type" i]')?.getAttribute("content")),
    jsonLdBlocks,
    scriptCount: doc.querySelectorAll("script").length,
    stylesheetCount: doc.querySelectorAll('link[rel="stylesheet"]').length,
    bodyTextContent,
    bodyWordCount: words.length,
    paragraphs,
    allLinks,
    internalLinkCount: allLinks.filter((link) => !link.isExternal).length,
    externalLinkCount: allLinks.filter((link) => link.isExternal).length,
    formCount: doc.querySelectorAll("form").length,
    buttonTexts,
    inputFields,
    headers,
    hasHttps: url.protocol === "https:",
    youCount,
    weCount,
    youWeRatio: weCount === 0 ? Number.POSITIVE_INFINITY : youCount / weCount,
  };
}

function getMetaContent(doc: Document, name: string): string | null {
  return doc.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? null;
}

function cleanText(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

function textOrNull(input: string | null | undefined): string | null {
  const cleaned = cleanText(input);
  return cleaned.length > 0 ? cleaned : null;
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

function stripHtmlToText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function countMatches(input: string, pattern: RegExp): number {
  const matches = input.match(pattern);
  return matches ? matches.length : 0;
}

function safeResolveUrl(href: string, base: URL): URL | null {
  try {
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
    return new URL(href, base);
  } catch {
    return null;
  }
}

function countWordOccurrences(text: string, words: string[]): number {
  return words.reduce((sum, word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    return sum + (text.match(regex)?.length ?? 0);
  }, 0);
}

function extractCharsetFromContentType(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  const match = contentType.match(/charset=([^;\s]+)/i);
  return match ? match[1].trim() : null;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
