import type { Industry, PageMetadata } from "../types.ts";
import type { CheckResult, Severity } from "./types.ts";

function buildResult(data: CheckResult): CheckResult {
  return data;
}

function manual(id: string, name: string, category: string, severity: Severity): CheckResult {
  return buildResult({
    id,
    name,
    category,
    severity,
    part: "B",
    pass: false,
    score: 0,
    manualReview: true,
    finding: "This check requires visual/semantic review and cannot be automated.",
    fix: "Consider a professional UX audit for this assessment.",
  });
}

const hasAny = (text: string, patterns: (string | RegExp)[]): boolean =>
  patterns.some((p) => typeof p === "string" ? text.includes(p) : p.test(text));

export function runPartBChecks(metadata: PageMetadata, industry: Industry): CheckResult[] {
  const text = metadata.bodyTextContent.toLowerCase();
  const ctaText = metadata.ctas.map((c) => c.text.toLowerCase()).join(" ");

  if (industry === "saas") {
    const pricing = hasAny(text, ["pricing", "price", "plan", "free", "trial", "month", "year", "$", "£", "€", "/mo", "/yr", "per month", "per year", "starting at"]);
    const howItWorks = hasAny(text, ["how it works", "how to", "step 1", "step 2", "step 3", "getting started", "simple steps", "easy as"]);
    const freeTrial = hasAny(`${text} ${ctaText}`, ["free trial", "try free", "start free", "no credit card", "get started free", "free plan", "demo", "book a demo"]);
    const integrations = hasAny(text, ["integrat", "connect", "works with", "compatible", "plugin", "extension", "api"]);
    return [
      manual("B1.1", "Clear target user", "Industry-Specific (SaaS)", "major"),
      buildResult({ id: "B1.2", name: pricing ? "Pricing transparency" : "Pricing transparency issue", part: "B", category: "Industry-Specific (SaaS)", severity: "major", pass: pricing, score: pricing ? 10 : 0, manualReview: false, finding: pricing ? "Pricing signals detected." : "No pricing information visible. Hidden pricing kills trust for SaaS products.", fix: "Show pricing clearly — or at minimum indicate 'Free trial', 'Free plan', or 'Contact for pricing'." }),
      buildResult({ id: "B1.3", name: howItWorks ? '"How it works" section' : '"How it works" section missing', part: "B", category: "Industry-Specific (SaaS)", severity: "major", pass: howItWorks, score: howItWorks ? 10 : 0, manualReview: false, finding: howItWorks ? "Process/how-it-works section detected." : "No 'How it works' section found. Users need to understand the process.", fix: "Add a 3-step 'How it works' section with clear visuals explaining your product flow." }),
      manual("B1.4", "Feature depth clarity", "Industry-Specific (SaaS)", "minor"),
      buildResult({ id: "B1.5", name: freeTrial ? "Free trial CTA" : "Free trial CTA missing", part: "B", category: "Industry-Specific (SaaS)", severity: "major", pass: freeTrial, score: freeTrial ? 10 : 0, manualReview: false, finding: freeTrial ? "Free trial or demo signals found." : "No free trial or demo offer found. SaaS users expect to try before they buy.", fix: "Add a 'Start free trial' or 'Book a demo' CTA. Include 'No credit card required' if applicable." }),
      manual("B1.6", "Onboarding friction", "Industry-Specific (SaaS)", "major"),
      buildResult({ id: "B1.7", name: integrations ? "Integrations shown" : "Integrations not shown", part: "B", category: "Industry-Specific (SaaS)", severity: "minor", pass: integrations, score: integrations ? 10 : 0, manualReview: false, finding: integrations ? "Integration signals detected." : "No integrations or compatibility info shown.", fix: "Add an integrations section showing logos of tools your product works with." }),
      manual("B1.8", "SaaS visuals quality", "Industry-Specific (SaaS)", "minor"),
    ];
  }

  if (industry === "ecommerce") {
    const priceVisible = hasAny(text, [/[$£€]\s?\d+/, "price", "cost", "from", "starting at"]);
    const shipping = hasAny(text, ["shipping", "delivery", "return", "refund", "exchange", "free shipping", "money back", "guarantee"]);
    const trust = hasAny(text, ["secure", "ssl", "encrypted", "visa", "mastercard", "paypal", "stripe", "money back", "guarantee", "trusted"]);
    const fieldCount = metadata.inputFields.length;
    const flowScore = fieldCount > 15 ? 4 : fieldCount >= 8 ? 7 : 10;
    return [
      manual("B2.1", "Product imagery quality", "Industry-Specific (Ecommerce)", "major"),
      buildResult({ id: "B2.2", name: priceVisible ? "Price is visible" : "Price visibility issue", part: "B", category: "Industry-Specific (Ecommerce)", severity: "critical", pass: priceVisible, score: priceVisible ? 10 : 0, manualReview: false, finding: priceVisible ? "Price signals are visible." : "No visible pricing. 47% of users abandon due to unexpected costs (Baymard).", fix: "Make the price immediately visible without scrolling." }),
      manual("B2.3", "Product comparison clarity", "Industry-Specific (Ecommerce)", "major"),
      manual("B2.4", "Cart UX quality", "Industry-Specific (Ecommerce)", "major"),
      buildResult({ id: "B2.5", name: shipping ? "Shipping/return info visible" : "Shipping/return info missing", part: "B", category: "Industry-Specific (Ecommerce)", severity: "major", pass: shipping, score: shipping ? 10 : 0, manualReview: false, finding: shipping ? "Shipping/return policy signals found." : "No shipping or return policy information visible. 24% abandon due to delivery uncertainty (Baymard).", fix: "Show shipping costs, delivery timeline, and return policy before checkout." }),
      buildResult({ id: "B2.6", name: flowScore >= 7 ? "Checkout flow signals" : "Checkout flow friction detected", part: "B", category: "Industry-Specific (Ecommerce)", severity: "major", pass: flowScore >= 7, score: flowScore, manualReview: false, finding: flowScore >= 7 ? `Checkout form complexity appears reasonable (${fieldCount} fields).` : `Form has ${fieldCount} input fields. Baymard recommends 12-14 max for checkout.`, fix: "Reduce form fields. Enable guest checkout. Remove optional fields or move them post-purchase." }),
      manual("B2.7", "Checkout friction details", "Industry-Specific (Ecommerce)", "major"),
      buildResult({ id: "B2.8", name: trust ? "Trust signals on transactional pages" : "Trust signals missing on transactional pages", part: "B", category: "Industry-Specific (Ecommerce)", severity: "critical", pass: trust, score: trust ? 10 : 0, manualReview: false, finding: trust ? "Transactional trust/security signals detected." : "No security or trust signals near transaction areas.", fix: "Add payment method icons, SSL badges, and money-back guarantee near checkout." }),
    ];
  }

  if (industry === "portfolio") {
    const about = hasAny(text, ["about", "i am", "i'm", "my name", "years of experience", "specializ"]);
    const contact = metadata.formCount > 0 || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(metadata.bodyTextContent) || hasAny(text, ["contact", "book", "schedule", "calendly", "cal.com"]);
    return [
      manual("B3.1", "Portfolio quality", "Industry-Specific (Portfolio)", "major"),
      buildResult({ id: "B3.2", name: about ? "About/bio is specific" : "About/bio lacks specificity", part: "B", category: "Industry-Specific (Portfolio)", severity: "major", pass: about, score: about ? 10 : 0, manualReview: false, finding: about ? "About/bio signals detected." : "No clear about/bio section with personal details.", fix: "Add an about section with your name, photo, specific expertise, and years of experience." }),
      buildResult({ id: "B3.3", name: contact ? "Contact method is obvious" : "Contact method unclear", part: "B", category: "Industry-Specific (Portfolio)", severity: "critical", pass: contact, score: contact ? 10 : 0, manualReview: false, finding: contact ? "A contact path is visible." : "No clear way to contact you found.", fix: "Add a visible contact form, email link, or scheduling link (Calendly etc.) accessible from any page." }),
      manual("B3.4", "Portfolio credibility", "Industry-Specific (Portfolio)", "major"),
      manual("B3.5", "Brand consistency", "Industry-Specific (Portfolio)", "minor"),
    ];
  }

  if (industry === "healthcare") {
    const disclaimer = hasAny(text, ["disclaimer", "not medical advice", "consult your", "consult a", "professional advice", "fda", "medical professional"]);
    const privacy = hasAny(text, ["privacy", "hipaa", "gdpr", "data protection", "confidential", "your data", "we don't share"]);
    return [
      buildResult({ id: "B4.1", name: disclaimer ? "Medical disclaimers" : "Medical disclaimers missing", part: "B", category: "Industry-Specific (Healthcare)", severity: "critical", pass: disclaimer, score: disclaimer ? 10 : 0, manualReview: false, finding: disclaimer ? "Medical disclaimer language found." : "No medical disclaimers found. Required for any site making health claims.", fix: "Add visible medical disclaimers. Don't bury them in the footer only." }),
      manual("B4.2", "Clinical evidence quality", "Industry-Specific (Healthcare)", "major"),
      buildResult({ id: "B4.3", name: privacy ? "Privacy and data handling" : "Privacy/data handling signals missing", part: "B", category: "Industry-Specific (Healthcare)", severity: "critical", pass: privacy, score: privacy ? 10 : 0, manualReview: false, finding: privacy ? "Privacy/data handling signals found." : "No privacy or data handling signals. Users sharing health data need reassurance.", fix: "Add explicit privacy/data handling statements. Link to your privacy policy prominently." }),
      manual("B4.4", "Medical accuracy", "Industry-Specific (Healthcare)", "critical"),
      manual("B4.5", "Emergency escalation clarity", "Industry-Specific (Healthcare)", "major"),
    ];
  }

  if (industry === "fintech") {
    const regulatory = hasAny(text, ["fca", "sec", "regulated", "licensed", "authorised", "authorized", "registration number", "compliance"]);
    const fee = hasAny(text, ["fee", "charge", "cost", "no hidden", "transparent", "commission", "0%", "free transfer"]);
    return [
      buildResult({ id: "B5.1", name: regulatory ? "Regulatory badges" : "Regulatory badges missing", part: "B", category: "Industry-Specific (Fintech)", severity: "critical", pass: regulatory, score: regulatory ? 10 : 0, manualReview: false, finding: regulatory ? "Regulatory/compliance language detected." : "No regulatory or compliance badges found. Critical for financial trust.", fix: "Display FCA/SEC registration, licensing numbers, or regulatory compliance badges." }),
      manual("B5.2", "Risk disclosure clarity", "Industry-Specific (Fintech)", "critical"),
      buildResult({ id: "B5.3", name: fee ? "Fee transparency" : "Fee transparency issue", part: "B", category: "Industry-Specific (Fintech)", severity: "major", pass: fee, score: fee ? 10 : 0, manualReview: false, finding: fee ? "Fee transparency signals detected." : "No fee information visible. Hidden fees instantly destroy trust in finance.", fix: "Show all fees clearly. Add 'No hidden fees' badge if applicable." }),
      manual("B5.4", "Claims substantiation", "Industry-Specific (Fintech)", "major"),
      manual("B5.5", "Financial onboarding clarity", "Industry-Specific (Fintech)", "major"),
    ];
  }

  if (industry === "service") {
    const services = hasAny(text, ["service", "what we do", "our offering", "we help", "solutions"]);
    const process = hasAny(text, ["process", "how we work", "our approach", "step 1", "methodology", "framework"]);
    const bookingKeywords = hasAny(`${text} ${ctaText}`, ["book", "schedule", "calendly", "cal.com", "free consultation", "let's talk", "get in touch"]);
    const shortForm = metadata.formCount > 0 && metadata.inputFields.length < 6;
    const bookingPass = bookingKeywords || shortForm;
    return [
      buildResult({ id: "B6.1", name: services ? "Services are clearly listed" : "Services are not clearly listed", part: "B", category: "Industry-Specific (Service/Agency)", severity: "critical", pass: services, score: services ? 10 : 0, manualReview: false, finding: services ? "Service/offering language is present." : "No clear service listing. 'We help businesses grow' is not a service description.", fix: "List your specific services with 1-line descriptions each. Be concrete." }),
      buildResult({ id: "B6.2", name: process ? "Process shown" : "Process not shown", part: "B", category: "Industry-Specific (Service/Agency)", severity: "major", pass: process, score: process ? 10 : 0, manualReview: false, finding: process ? "Process/methodology section found." : "No 'how we work' section. Users need to know what happens after they contact you.", fix: "Add a process section: Discovery → Strategy → Execution → Results (or your version)." }),
      manual("B6.3", "Proof of outcomes", "Industry-Specific (Service/Agency)", "major"),
      manual("B6.4", "Offer packaging clarity", "Industry-Specific (Service/Agency)", "major"),
      buildResult({ id: "B6.5", name: bookingPass ? "Booking is frictionless" : "Booking friction detected", part: "B", category: "Industry-Specific (Service/Agency)", severity: "major", pass: bookingPass, score: bookingPass ? 10 : 0, manualReview: false, finding: bookingPass ? "Low-friction booking/contact method detected." : `No easy booking option or the inquiry form is too long (${metadata.inputFields.length} fields).`, fix: "Add a Calendly/Cal.com embed or short contact form (name + email + message max)." }),
    ];
  }

  return [];
}
