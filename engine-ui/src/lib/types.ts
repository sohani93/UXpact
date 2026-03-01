export type Industry =
  | "saas"
  | "ecommerce"
  | "portfolio"
  | "healthcare"
  | "fintech"
  | "service";

export interface AuditRequest {
  url: string;
  industry: Industry;
}

export interface PageMetadata {
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
  twitterCard: string | null;
  hasFavicon: boolean;
  hasViewportMeta: boolean;
  charset: string | null;
  jsonLdBlocks: string[];
  scriptCount: number;
  stylesheetCount: number;
  bodyTextContent: string;
  bodyWordCount: number;
  paragraphs: string[];
  allLinks: { text: string; href: string; isExternal: boolean }[];
  internalLinkCount: number;
  externalLinkCount: number;
  formCount: number;
  buttonTexts: string[];
  inputFields: { type: string; name: string | null; placeholder: string | null }[];
  headers: Record<string, string>;
  hasHttps: boolean;
  youCount: number;
  weCount: number;
  youWeRatio: number;
}

export interface CheckResult {
  id: string;
  name: string;
  pass: boolean;
  score: number;
  severity: "critical" | "major" | "minor";
  finding: string;
  fix: string;
  category: string;
  part: "A" | "B" | "C";
  manualReview: boolean;
}
