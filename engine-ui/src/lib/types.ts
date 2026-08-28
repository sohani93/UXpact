export type Archetype = "Hero" | "Sage" | "Outlaw" | "Caregiver" | "Creator" | "Ruler";
export type JourneyStage = "arrival" | "understanding" | "trust-building" | "decision" | "action";
export const JOURNEY_STAGE_ORDER: JourneyStage[] = ["arrival", "understanding", "trust-building", "decision", "action"];
export const JOURNEY_STAGE_LABEL: Record<JourneyStage, string> = {
  arrival: "Arrival",
  understanding: "Understanding",
  "trust-building": "Trust-building",
  decision: "Decision",
  action: "Action",
};

export type IntakeFormData = {
  name: string;
  email: string;
  url: string;
  industry: string;
  goal: string;
  challenge: string;
  focusAreas: string[];
};

// A journey break is a real place in the visitor's journey where the AI
// diagnosis found a break — never a rule-based finding, never scored.
export type JourneyBreak = {
  journeyStage: JourneyStage;
  element: string;
  whatsHappening: string;
  whatShouldHappen: string;
  reason: string;
  fix: string;
  aiPrompt: string;
};

export type PageContent = {
  h1Text: string;
  navLinks: string[];
  h2Texts: string[];
  ctaTexts: string[];
  paragraphTexts: string[];
  testimonialTexts: string[];
  trustLogoLabels: string[];
  pricingTiers: { name: string; price: string }[];
  imagesCount: number;
  hasForm: boolean;
  metaTitle: string;
};

export type Diagnosis = {
  auditId: string;
  url: string;
  domain: string;
  createdAt: string;
  domData: PageContent;
  currentArchetype: Archetype | null;
  targetArchetype: Archetype | null;
  narrativeVerdict: string | null;
  revenueLeakEstimate: string | null;
  journeyBreaks: JourneyBreak[] | null;
  diagnosisError: string | null;
  rawHtml?: string | null;
};
