import type { PageMetadata } from "../types.ts";

export type Severity = "critical" | "major" | "minor";
export type CheckPart = "A" | "B" | "C";

export interface CheckResult {
  id: string;
  name: string;
  pass: boolean;
  score: number;
  severity: Severity;
  finding: string;
  fix: string;
  aiPrompt?: string;
  domZone?: "hero" | "nav" | "cta" | "social-proof" | "body-copy" | "footer";
  glossaryTerms?: string[];
  category: string;
  part: CheckPart;
  manualReview: boolean;
}

export interface AuditScores {
  total: number;
  partA: number;
  partB: number;
  partC: number;
  checksPassed: number;
  checksFlagged: number;
  criticalIssues: number;
  categories: Record<string, { score: number; maxScore: number; checks: number }>;
}

export type CheckFunction = (metadata: PageMetadata) => CheckResult;
