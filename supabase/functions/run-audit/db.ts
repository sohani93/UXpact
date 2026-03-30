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
  void domData;
  void pagespeedData;
  void securityGrade;

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
      score: scores.total,
      part_a_score: scores.partA,
      part_b_score: scores.partB,
      part_c_score: scores.partC,
      score_label: scores.label,
      checks_passed: scores.checksPassed,
      checks_flagged: scores.checksFlagged,
      critical_issues: scores.criticalIssues,
    })
    .select("id")
    .single();

  if (auditError || !auditData?.id) {
    throw new Error(`Failed to create audit record: ${auditError?.message ?? "unknown error"}`);
  }

  const rows = findings.map((finding) => ({
    audit_id: auditData.id,
    check_id: finding.id,
    name: finding.name,
    severity: finding.severity,
    pass: finding.pass,
    score: finding.score,
    finding: finding.finding,
    fix: finding.fix,
    dom_zone: finding.domZone ?? "body-copy",
    glossary_terms: [],
  }));

  const { error: findingsError } = await supabase.from("audit_findings").insert(rows);
  if (findingsError) {
    throw new Error(`Failed to create finding records: ${findingsError.message}`);
  }

  return auditData.id;
}
