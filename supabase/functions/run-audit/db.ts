import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Industry } from "./types.ts";
import type { AuditScores, CheckResult } from "./checks/types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function saveAuditResults(
  url: string,
  domain: string,
  industry: Industry,
  scores: AuditScores,
  findings: CheckResult[],
  domData: Record<string, unknown>,
  pagespeedData?: { performance: number; seo: number; accessibility: number; bestPractices: number } | null,
  securityGrade?: string | null,
): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const { data: auditData, error: auditError } = await supabase
    .from("audits")
    .insert({
      url,
      domain,
      industry,
      status: "complete",
      score_total: scores.total,
      score_part_a: scores.partA,
      score_part_b: scores.partB,
      score_part_c: scores.partC,
      checks_passed: scores.checksPassed,
      checks_flagged: scores.checksFlagged,
      critical_issues: scores.criticalIssues,
      pagespeed_performance: pagespeedData?.performance ?? null,
      pagespeed_seo: pagespeedData?.seo ?? null,
      security_grade: securityGrade ?? null,
      dom_data: domData,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (auditError || !auditData?.id) {
    throw new Error(`Failed to create audit record: ${auditError?.message ?? "unknown error"}`);
  }

  const rows = findings.map((finding) => ({
    audit_id: auditData.id,
    check_id: finding.id,
    check_name: finding.name,
    part: finding.part,
    category: finding.category,
    severity: finding.severity,
    pass: finding.pass,
    score: finding.score,
    finding: finding.finding,
    fix: finding.fix,
    ai_prompt: finding.aiPrompt ?? "",
    manual_review: finding.manualReview,
  }));

  const { error: findingsError } = await supabase.from("audit_findings").insert(rows);
  if (findingsError) {
    throw new Error(`Failed to create finding records: ${findingsError.message}`);
  }

  return auditData.id;
}
