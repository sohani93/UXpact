import type { PageMetadata } from "../types.ts";
import type { CheckResult } from "./types.ts";

function manual(id: string, name: string, category: string): CheckResult {
  return {
    id,
    name,
    part: "C",
    category,
    severity: "major",
    pass: false,
    score: 0,
    manualReview: true,
    finding: "This check requires visual/semantic review and cannot be automated.",
    fix: "Consider a professional UX audit for this assessment.",
  };
}

export function runPartCChecks(metadata: PageMetadata): CheckResult[] {
  const ratio = Number.isFinite(metadata.youWeRatio) ? metadata.youWeRatio : metadata.youCount > 0 ? 99 : 0;
  let c41Score = 0;
  let c41Finding = `Copy is company-centric (talks more about 'we/our' than 'you/your'). Ratio: ${ratio.toFixed(2)}:1`;
  if (ratio >= 4) {
    c41Score = 10;
    c41Finding = `Excellent customer-centric copy. You/We ratio: ${ratio.toFixed(2)}:1`;
  } else if (ratio >= 2) {
    c41Score = 7;
    c41Finding = `Good use of 'you' language but could be more customer-centric. Ratio: ${ratio.toFixed(2)}:1`;
  } else if (ratio >= 1) {
    c41Score = 4;
    c41Finding = `Copy is balanced but leans company-centric. Ratio: ${ratio.toFixed(2)}:1`;
  }

  const text = metadata.bodyTextContent.toLowerCase();
  const featureMatches = text.match(/\b(includes?|features?|built with|powered by|supports?|allows?)\b/g) ?? [];
  const benefitMatches = text.match(/\b(you'll|save|grow|reduce|increase|without|never again|imagine|finally|stop|effortless)\b/g) ?? [];

  let c42Score = 0;
  let c42Assessment = "No benefit language detected.";
  if (benefitMatches.length > featureMatches.length) {
    c42Score = 10;
    c42Assessment = "Benefits-led messaging outweighs feature language.";
  } else if (benefitMatches.length > 0 && benefitMatches.length === featureMatches.length) {
    c42Score = 7;
    c42Assessment = "Features and benefits are roughly balanced.";
  } else if (benefitMatches.length > 0 && featureMatches.length > benefitMatches.length) {
    c42Score = 4;
    c42Assessment = "Feature-focused copy dominates benefit language.";
  }

  const ctaTexts = metadata.ctas.map((c) => c.text.toLowerCase());
  const benefitCTA = ctaTexts.some((text) => /free|my|today|audit|report|demo|trial|save|results/.test(text));
  let c52Score = 0;
  let c52Pass = false;
  if (metadata.ctaCount > 0 && metadata.paragraphs.length > 0) {
    c52Score = benefitCTA ? 10 : 7;
    c52Pass = true;
  } else if (metadata.ctaCount > 0) {
    c52Score = 4;
  }

  return [
    manual("C1.1", "Brand tone consistency", "Brand Foundation"),
    manual("C1.2", "Distinct value narrative", "Brand Foundation"),
    manual("C2.1", "Audience resonance", "Audience Fit"),
    manual("C2.2", "Offer-to-audience relevance", "Audience Fit"),
    manual("C3.1", "Positioning clarity", "Positioning"),
    manual("C3.2", "Differentiation strength", "Positioning"),
    {
      id: "C4.1",
      name: "You/We ratio",
      part: "C",
      category: "Emotional Resonance",
      severity: "major",
      pass: c41Score >= 7,
      score: c41Score,
      manualReview: false,
      finding: c41Finding,
      fix: "Rewrite copy to address the reader directly. Replace 'We offer...' with 'You get...'. Target 4:1 you/we ratio minimum.",
    },
    {
      id: "C4.2",
      name: "Benefits vs features focus",
      part: "C",
      category: "Emotional Resonance",
      severity: "major",
      pass: c42Score >= 7,
      score: c42Score,
      manualReview: false,
      finding: `Copy uses ${featureMatches.length} feature phrases vs ${benefitMatches.length} benefit phrases. ${c42Assessment}`,
      fix: "Lead with benefits (what the user gains), then support with features (how it works). 'Save 10 hours/week' > 'Automated workflow engine'.",
    },
    manual("C5.1", "Visual-message consistency", "Copy-Design Alignment"),
    {
      id: "C5.2",
      name: "Reading path leads to CTA",
      part: "C",
      category: "Copy-Design Alignment",
      severity: "major",
      pass: c52Pass,
      score: c52Score,
      manualReview: false,
      finding: c52Pass ? "CTAs are well-positioned after content sections." : "CTAs appear disconnected from the content flow.",
      fix: "Place CTAs immediately after persuasive content sections. The CTA should feel like the natural next step.",
    },
  ];
}
