import type { CheckResult, AuditScores } from "./checks/types.ts";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function averageScore(results: CheckResult[]): number {
  if (results.length === 0) {
    return 0;
  }

  const avg = results.reduce((sum, item) => sum + item.score, 0) / results.length;
  return round2(avg * 10);
}

export function calculateScores(results: CheckResult[]): AuditScores {
  const automated = results.filter((r) => !r.manualReview);
  const partAResults = automated.filter((r) => r.part === "A");
  const partBResults = automated.filter((r) => r.part === "B");
  const partCResults = automated.filter((r) => r.part === "C");

  const partA = averageScore(partAResults);
  const partB = averageScore(partBResults);
  const partC = averageScore(partCResults);
  const total = round2((partA * 0.5) + (partB * 0.3) + (partC * 0.2));
  const label = total >= 80 ? "Strong" : total >= 60 ? "Decent" : total >= 40 ? "Needs Work" : "Critical";

  const categories: AuditScores["categories"] = {};
  for (const check of automated) {
    if (!categories[check.category]) {
      categories[check.category] = { score: 0, maxScore: 0, checks: 0 };
    }

    const category = categories[check.category];
    category.score += check.score;
    category.maxScore += 10;
    category.checks += 1;
  }

  for (const category of Object.values(categories)) {
    category.score = category.checks > 0 ? round2((category.score / category.checks) * 10) : 0;
  }

  const checksPassed = automated.filter((r) => r.pass).length;
  const checksFlagged = results.filter((r) => r.manualReview).length;
  const criticalIssues = automated.filter((r) => r.severity === "critical" && !r.pass).length;

  return {
    total,
    partA,
    partB,
    partC,
    label,
    checksPassed,
    checksFlagged,
    criticalIssues,
    categories,
  };
}
