export type Severity = "critical" | "major" | "minor";

export type Finding = {
  id: string;
  name: string;
  severity: Severity;
  finding: string;
  fix?: string;
  aiPrompt?: string;
  pass: boolean;
  category?: string;
  domZone?: "hero" | "nav" | "cta" | "social-proof" | "body-copy" | "footer";
  glossaryTerms?: string[];
};

export type RevenueLeak = {
  mobileDropoff: number;
  copyFriction: string;
  riskBand: string;
};

export type AuditRequestFormData = {
  name: string;
  email: string;
  url: string;
  industry: string;
  goal: string;
  challenge: string;
  focusAreas: string[];
};

export type AuditData = {
  auditId: string;
  url: string;
  domain: string;
  score: number;
  createdAt: string;
  findings: Finding[];
  domData: {
    navLinks: string[];
    h1Text: string;
    h2Texts: string[];
    h3Texts: string[];
    ctaTexts: string[];
    paragraphTexts: string[];
    imagesCount: number;
    hasForm: boolean;
  };
};
