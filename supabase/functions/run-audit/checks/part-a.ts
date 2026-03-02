import type { PageMetadata } from "../types.ts";
import type { CheckResult, Severity } from "./types.ts";

const GENERIC_CTA_TEXTS = new Set(["submit", "click here", "learn more", "go", "send", "ok", "click", "continue"]);
const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /placeholder/i,
  /\[your/i,
  /insert text/i,
  /coming soon/i,
  /\btbd\b/i,
  /\btodo\b/i,
];

function result(base: Omit<CheckResult, "pass" | "score" | "finding" | "fix" | "manualReview"> & {
  pass: boolean;
  score: number;
  finding: string;
  fix: string;
  manualReview?: boolean;
}): CheckResult {
  return { ...base, manualReview: base.manualReview ?? false };
}

function manual(id: string, name: string, category: string, severity: Severity): CheckResult {
  return result({
    id,
    name,
    category,
    severity,
    part: "A",
    pass: false,
    score: 0,
    manualReview: true,
    finding: "This check requires visual/semantic review and cannot be automated.",
    fix: "Consider a professional UX audit for this assessment.",
  });
}

export function runPartAChecks(metadata: PageMetadata): CheckResult[] {
  const ctaTexts = metadata.ctas.map((cta) => cta.text.trim()).filter(Boolean);
  const firstCtaText = (ctaTexts[0] ?? "").toLowerCase();
  const genericButton = metadata.buttonTexts.find((text) => GENERIC_CTA_TEXTS.has(text.toLowerCase()));

  const checks: CheckResult[] = [];

  const h1Text = metadata.h1s[0]?.text?.trim() ?? "";
  const h1Words = h1Text ? h1Text.split(/\s+/).length : 0;
  if (metadata.h1Count < 1 || !h1Text) {
    checks.push(result({ id: "A1.1", name: "Hero headline exists", part: "A", category: "First Impression & Clarity", severity: "critical", pass: false, score: 0, finding: "No hero headline (H1) found. Visitors can't tell what this site is about.", fix: "Add a clear H1 headline that communicates your value proposition in under 10 words." }));
  } else if (h1Words > 10) {
    checks.push(result({ id: "A1.1", name: "Hero headline exists", part: "A", category: "First Impression & Clarity", severity: "critical", pass: false, score: 4, finding: `H1 exists but is too long (${h1Words} words). Keep it under 10.`, fix: "Shorten your H1 to a concise value proposition with fewer than 10 words." }));
  } else {
    checks.push(result({ id: "A1.1", name: "Hero headline exists", part: "A", category: "First Impression & Clarity", severity: "critical", pass: true, score: 10, finding: "Hero headline is present and concise.", fix: "Maintain a concise, benefit-led hero headline." }));
  }

  const firstH1Index = metadata.headingHierarchy.findIndex((h) => h.tag === "h1");
  const hasSupportingH2 = firstH1Index >= 0 && metadata.headingHierarchy.slice(firstH1Index + 1).some((h) => h.tag === "h2");
  const hasSupportingParagraph = (metadata.paragraphs[0]?.length ?? 0) > 20;
  checks.push(result({
    id: "A1.2",
    name: "Supporting subheadline exists",
    part: "A",
    category: "First Impression & Clarity",
    severity: "major",
    pass: hasSupportingH2 || hasSupportingParagraph,
    score: hasSupportingH2 || hasSupportingParagraph ? 10 : 0,
    finding: hasSupportingH2 || hasSupportingParagraph
      ? "Supporting text is present below the hero headline."
      : "No supporting text below the headline. Users need context.",
    fix: "Add a 1-2 sentence subheadline explaining what your product/service does and who it's for.",
  }));

  checks.push(manual("A1.3", "Hero section visual hierarchy", "First Impression & Clarity", "major"));

  if (metadata.ctaCount < 1) {
    checks.push(result({ id: "A1.4", name: "Primary CTA visible", part: "A", category: "First Impression & Clarity", severity: "critical", pass: false, score: 0, finding: "No call-to-action button found. Users have nowhere to go.", fix: "Add a prominent CTA button in the hero section with an action verb (e.g., 'Start free trial', 'Get your audit')." }));
  } else if (GENERIC_CTA_TEXTS.has(firstCtaText)) {
    checks.push(result({ id: "A1.4", name: "Primary CTA visible", part: "A", category: "First Impression & Clarity", severity: "critical", pass: false, score: 4, finding: `CTA exists but uses weak text: '${ctaTexts[0]}'`, fix: "Rewrite CTA to use verb + benefit format. E.g., 'Get my free report' instead of 'Submit'." }));
  } else {
    checks.push(result({ id: "A1.4", name: "Primary CTA visible", part: "A", category: "First Impression & Clarity", severity: "critical", pass: true, score: 10, finding: "At least one clear CTA is visible.", fix: "Keep primary CTA copy specific and action-oriented." }));
  }

  checks.push(result({
    id: "A1.5", name: "Secondary CTA exists", part: "A", category: "First Impression & Clarity", severity: "minor",
    pass: metadata.ctaCount >= 2, score: metadata.ctaCount >= 2 ? 10 : 0,
    finding: metadata.ctaCount >= 2 ? "Primary and secondary action paths are available." : "Only one action path available. Not everyone is ready to convert immediately.",
    fix: "Add a secondary CTA like 'See how it works' or 'Watch demo' for users not ready for the primary action.",
  }));

  checks.push(manual("A1.6", "Visual contrast and readability", "First Impression & Clarity", "major"));
  checks.push(manual("A1.7", "Hero relevance to offer", "First Impression & Clarity", "major"));

  const aboveFoldElementEstimate = metadata.navLinkCount + metadata.ctaCount + metadata.h1Count + Math.min(metadata.imageCount, 3);
  checks.push(result({
    id: "A1.8", name: "Above-fold content is not cluttered", part: "A", category: "First Impression & Clarity", severity: "major",
    pass: aboveFoldElementEstimate <= 9, score: aboveFoldElementEstimate <= 9 ? 10 : 0,
    finding: aboveFoldElementEstimate <= 9
      ? "Above-fold content is clean with appropriate element density."
      : `Above-fold area is cluttered with ${aboveFoldElementEstimate} competing elements. Miller's Law recommends ~7 max.`,
    fix: "Reduce above-fold complexity. Remove or move secondary elements below the fold.",
  }));

  if (metadata.navLinkCount < 1) {
    checks.push(result({ id: "A2.1", name: "Primary navigation exists", part: "A", category: "Navigation & Structure", severity: "critical", pass: false, score: 0, finding: "No navigation menu found.", fix: "Add a navigation bar with 5-7 clearly labeled menu items." }));
  } else if (metadata.navLinkCount > 7) {
    checks.push(result({ id: "A2.1", name: "Primary navigation exists", part: "A", category: "Navigation & Structure", severity: "critical", pass: false, score: 4, finding: `Navigation has ${metadata.navLinkCount} items. Hick's Law recommends 5-7 max.`, fix: "Reduce primary navigation to the most important 5-7 items." }));
  } else {
    checks.push(result({ id: "A2.1", name: "Primary navigation exists", part: "A", category: "Navigation & Structure", severity: "critical", pass: true, score: 10, finding: "Primary navigation is present with a manageable number of links.", fix: "Keep navigation concise and user-focused." }));
  }

  checks.push(manual("A2.2", "Navigation consistency", "Navigation & Structure", "major"));
  checks.push(result({
    id: "A2.3", name: "Logo links to homepage", part: "A", category: "Navigation & Structure", severity: "minor",
    pass: metadata.logoLinksHome, score: metadata.logoLinksHome ? 10 : 0,
    finding: metadata.logoLinksHome ? "Logo follows the homepage-link convention." : "Logo doesn't link to the homepage — a basic web convention users expect.",
    fix: "Wrap your logo in a link to your homepage (/).",
  }));
  checks.push(manual("A2.4", "Breadcrumbs/wayfinding", "Navigation & Structure", "minor"));
  checks.push(result({
    id: "A2.5", name: "Mobile nav is accessible", part: "A", category: "Navigation & Structure", severity: "critical",
    pass: metadata.hasViewportMeta, score: metadata.hasViewportMeta ? 10 : 0,
    finding: metadata.hasViewportMeta ? "Viewport meta tag is present, indicating basic mobile readiness." : "No viewport meta tag found. Site likely isn't mobile-optimized.",
    fix: "Add <meta name='viewport' content='width=device-width, initial-scale=1'> to your <head>.",
  }));
  checks.push(manual("A2.6", "Navigation accessibility labels", "Navigation & Structure", "major"));

  const longParagraphs = metadata.paragraphs.filter((p) => p.length > 150).length;
  const longParagraphShare = metadata.paragraphs.length > 0 ? longParagraphs / metadata.paragraphs.length : 0;
  checks.push(manual("A3.1", "Message clarity", "Copy & Messaging", "major"));
  checks.push(result({
    id: "A3.2", name: "Body copy is scannable", part: "A", category: "Copy & Messaging", severity: "major",
    pass: longParagraphShare <= 0.5, score: longParagraphShare <= 0.5 ? 10 : 0,
    finding: longParagraphShare <= 0.5
      ? "Copy is well-structured and scannable."
      : `${Math.round(longParagraphShare * 100)}% of paragraphs are wall-of-text blocks (>3 lines). Users scan, they don't read.`,
    fix: "Break long paragraphs into 2-3 lines max. Use subheadings every 2-3 paragraphs. Put the most important info first and last.",
  }));
  checks.push(manual("A3.3", "Tone alignment", "Copy & Messaging", "minor"));
  checks.push(result({
    id: "A3.4", name: "Microcopy on forms/buttons is clear", part: "A", category: "Copy & Messaging", severity: "major",
    pass: !genericButton, score: genericButton ? 4 : 10,
    finding: genericButton
      ? `Found generic button text: '${genericButton}'. Users should know what happens when they click.`
      : "Button labels are descriptive and action-oriented.",
    fix: "Replace generic labels with specific actions: 'Submit' → 'Get my report', 'Send' → 'Send message'.",
  }));

  const placeholderMatch = PLACEHOLDER_PATTERNS.map((pattern) => metadata.bodyTextContent.match(pattern)).find(Boolean);
  checks.push(result({
    id: "A3.5", name: "No orphaned or placeholder text", part: "A", category: "Copy & Messaging", severity: "critical",
    pass: !placeholderMatch, score: placeholderMatch ? 0 : 10,
    finding: placeholderMatch
      ? `Found placeholder or orphaned text: '${placeholderMatch[0]}'. This looks unprofessional.`
      : "No placeholder text patterns were detected.",
    fix: "Replace all placeholder text with real content before going live.",
  }));
  checks.push(manual("A3.6", "Content proofreading quality", "Copy & Messaging", "minor"));

  const lowerBody = metadata.bodyTextContent.toLowerCase();
  const hasSocialSignals = /testimonial|review|social-proof|trust|client|customer/.test(lowerBody) || /"[^"]{10,}"\s*[-–]\s*[a-z]/i.test(metadata.bodyTextContent);
  checks.push(result({ id: "A4.1", name: "Social proof exists", part: "A", category: "Trust & Social Proof", severity: "critical", pass: hasSocialSignals, score: hasSocialSignals ? 10 : 0, finding: hasSocialSignals ? "Social proof signals were detected." : "No social proof found (testimonials, reviews, client logos, or trust badges).", fix: "Add at least 2-3 testimonials with full name + role + specific result. Or add a client logo bar." }));
  checks.push(manual("A4.2", "Credibility specificity", "Trust & Social Proof", "major"));
  const hasLogoSignals = /logo|client|partner|brand/.test(lowerBody) || metadata.images.filter((img) => /logo|client|partner|brand/i.test(img.src) || /logo|client|partner|brand/i.test(img.alt ?? "")).length >= 3;
  checks.push(result({ id: "A4.3", name: "Client/partner logos present", part: "A", category: "Trust & Social Proof", severity: "major", pass: hasLogoSignals, score: hasLogoSignals ? 10 : 0, finding: hasLogoSignals ? "Client/partner logo signals detected." : "No client or partner logos found.", fix: "Add a row of 3-6 recognizable client/partner logos near the hero or below it." }));
  checks.push(manual("A4.4", "Case study depth", "Trust & Social Proof", "major"));
  const hasSecuritySignals = /privacy|secure|ssl|encrypted/.test(lowerBody);
  const a45Pass = metadata.hasHttps && (metadata.formCount === 0 || hasSecuritySignals);
  checks.push(result({ id: "A4.5", name: "Security signals for transactional sites", part: "A", category: "Trust & Social Proof", severity: "critical", pass: a45Pass, score: a45Pass ? 10 : 0, finding: a45Pass ? "HTTPS and relevant security/privacy signals are present." : "Site collects data via forms but shows no security or privacy signals.", fix: "Add a privacy policy link near forms. Display SSL/security badges if processing payments." }));
  checks.push(manual("A4.6", "Trust placement near CTAs", "Trust & Social Proof", "minor"));

  const a51Pass = metadata.ctaCount >= 2 && !(metadata.bodyWordCount > 500 && metadata.ctaCount < 2);
  checks.push(result({ id: "A5.1", name: "CTA repeated throughout page", part: "A", category: "CTA & Conversion Design", severity: "major", pass: a51Pass, score: a51Pass ? 10 : 0, finding: a51Pass ? "CTAs are distributed across the page." : `Only ${metadata.ctaCount} CTA(s) found on a ${metadata.bodyWordCount}-word page. Long pages need CTAs at hero, mid-page, and footer.`, fix: "Add CTA buttons at the top (hero), middle, and bottom of the page." }));
  checks.push(manual("A5.2", "CTA visual prominence", "CTA & Conversion Design", "major"));
  const strongVerbs = /^(start|get|try|download|book|claim|join|create|request|schedule)/i;
  const benefitHints = /(free|my|today|now|report|demo|trial|audit|save|results)/i;
  let a53Score = 0;
  let a53Finding = "No CTA found.";
  if (ctaTexts.length > 0) {
    const hasStrong = ctaTexts.some((t) => strongVerbs.test(t));
    const hasVerbBenefit = ctaTexts.some((t) => strongVerbs.test(t) && benefitHints.test(t));
    const hasGeneric = ctaTexts.some((t) => GENERIC_CTA_TEXTS.has(t.toLowerCase()));
    if (hasVerbBenefit) {
      a53Score = 10;
      a53Finding = "CTA copy uses action-oriented verb + benefit phrasing.";
    } else if (hasStrong) {
      a53Score = 7;
      a53Finding = "CTA copy uses action verbs but can be more benefit-led.";
    } else if (hasGeneric) {
      a53Score = 4;
      a53Finding = `CTA text '${ctaTexts[0]}' is generic. Strong CTAs use verb + benefit format.`;
    }
  }
  checks.push(result({ id: "A5.3", name: "CTA copy is action-oriented", part: "A", category: "CTA & Conversion Design", severity: "major", pass: a53Score >= 7, score: a53Score, finding: a53Finding, fix: "Rewrite to: [verb] + [benefit]. Example: 'Get my free audit' instead of 'Submit'." }));
  const uniqueCtas = new Set(ctaTexts.map((text) => text.toLowerCase()));
  checks.push(result({ id: "A5.4", name: "No competing CTAs", part: "A", category: "CTA & Conversion Design", severity: "major", pass: uniqueCtas.size <= 3, score: uniqueCtas.size <= 3 ? 10 : 4, finding: uniqueCtas.size <= 3 ? "CTAs are focused with clear primary action." : `Found ${uniqueCtas.size} different CTA labels competing for attention. Hick's Law: too many choices = no choice.`, fix: "Consolidate to 1 primary CTA (repeated) + 1 secondary action max per section." }));
  checks.push(manual("A5.5", "CTA contrast and placement", "CTA & Conversion Design", "major"));

  checks.push(manual("A6.1", "Visual hierarchy", "Layout & Visual Design", "major"));
  checks.push(result({ id: "A6.2", name: "Typography is readable", part: "A", category: "Layout & Visual Design", severity: "critical", pass: false, score: 0, manualReview: true, finding: "Typography readability requires visual inspection. Ensure body text is ≥16px with ≥1.5 line height.", fix: "Review rendered text size and spacing on desktop and mobile." }));
  checks.push(manual("A6.3", "Whitespace balance", "Layout & Visual Design", "minor"));
  checks.push(manual("A6.4", "Image-quality consistency", "Layout & Visual Design", "minor"));

  // A6.5 intentionally skipped to avoid duplicate scoring with A2.5.

  const hasTitle = Boolean(metadata.title);
  const hasDescription = Boolean(metadata.metaDescription);
  let titleScore = 0;
  let descriptionScore = 0;
  if (hasTitle) {
    if (metadata.titleLength < 30) titleScore = 4;
    else if (metadata.titleLength <= 60) titleScore = 10;
    else titleScore = 7;
  }
  if (hasDescription) {
    if (metadata.metaDescriptionLength < 70) descriptionScore = 4;
    else if (metadata.metaDescriptionLength <= 160) descriptionScore = 10;
    else descriptionScore = 7;
  }
  const a71Score = hasTitle && hasDescription ? Math.round((titleScore + descriptionScore) / 2) : 0;
  checks.push(result({ id: "A7.1", name: "Meta title & description", part: "A", category: "Technical Readiness — ShipCheck", severity: "major", pass: hasTitle && hasDescription, score: a71Score, finding: hasTitle && hasDescription ? "Meta title and description are present." : `Missing meta ${!hasTitle && !hasDescription ? "title and description" : !hasTitle ? "title" : "description"}. Search engines and social shares will look broken.`, fix: "Add a meta title (50-60 chars) and meta description (120-160 chars) that describe your page clearly." }));

  let a72Score = 10;
  let a72Finding = "Heading hierarchy is consistent with one H1 and no skipped levels.";
  if (metadata.h1Count === 0) {
    a72Score = 0;
    a72Finding = "No H1 tag found.";
  } else if (metadata.h1Count > 1) {
    a72Score = 4;
    a72Finding = `Multiple H1 tags found (${metadata.h1Count}). Use exactly one.`;
  } else if (metadata.hasSkippedHeadingLevels) {
    a72Score = 4;
    a72Finding = "Heading levels are skipped (e.g., H1 → H3). Use sequential order.";
  }
  checks.push(result({ id: "A7.2", name: "Heading hierarchy is correct", part: "A", category: "Technical Readiness — ShipCheck", severity: "major", pass: a72Score === 10, score: a72Score, finding: a72Finding, fix: "Use exactly one H1, then H2 for sections, H3 for subsections. Don't skip levels." }));

  const withAlt = metadata.imageCount - metadata.imagesWithoutAlt;
  let a73Score = 10;
  if (metadata.imageCount === 0) a73Score = 10;
  else if (withAlt === 0) a73Score = 0;
  else if (withAlt / metadata.imageCount < 0.5) a73Score = 4;
  else if (withAlt !== metadata.imageCount) a73Score = 7;
  checks.push(result({ id: "A7.3", name: "Images have alt text", part: "A", category: "Technical Readiness — ShipCheck", severity: "major", pass: a73Score >= 7, score: a73Score, finding: metadata.imageCount === 0 ? "No images detected; alt text requirement not applicable." : `${metadata.imagesWithoutAlt} of ${metadata.imageCount} images are missing alt text. Bad for accessibility and SEO.`, fix: "Add descriptive alt text to every meaningful image. Decorative images should have alt=''." }));

  const missing: string[] = [];
  if (!metadata.hasFavicon) missing.push("favicon");
  if (!metadata.hasOgTitle) missing.push("og:title");
  if (!metadata.hasOgImage) missing.push("og:image");
  if (!metadata.hasOgDescription) missing.push("og:description");
  let a74Score = 0;
  if (missing.length === 0) a74Score = 10;
  else if (missing.length === 1) a74Score = 7;
  else if (missing.length <= 3) a74Score = 5;
  checks.push(result({ id: "A7.4", name: "Favicon and OG tags", part: "A", category: "Technical Readiness — ShipCheck", severity: "minor", pass: missing.length === 0, score: a74Score, finding: missing.length === 0 ? "Favicon and Open Graph tags are complete." : `Missing: ${missing.join(", ")}. Social shares and browser tabs will look incomplete.`, fix: "Add a favicon, plus og:title, og:image, and og:description meta tags for proper social sharing." }));

  return checks;
}
