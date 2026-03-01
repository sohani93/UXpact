CREATE TABLE audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry TEXT NOT NULL CHECK (industry IN ('saas', 'ecommerce', 'portfolio', 'healthcare', 'fintech', 'service')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'complete', 'report_ready', 'failed_unreachable', 'failed_spa', 'failed_error')),
  score_total NUMERIC(5,2),
  score_part_a NUMERIC(5,2),
  score_part_b NUMERIC(5,2),
  score_part_c NUMERIC(5,2),
  checks_passed INTEGER DEFAULT 0,
  checks_flagged INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  pagespeed_performance NUMERIC(5,2),
  pagespeed_seo NUMERIC(5,2),
  security_grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE audit_findings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  check_name TEXT NOT NULL,
  part TEXT NOT NULL CHECK (part IN ('A', 'B', 'C')),
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor')),
  pass BOOLEAN NOT NULL,
  score NUMERIC(4,2) NOT NULL,
  finding TEXT NOT NULL,
  fix TEXT NOT NULL,
  manual_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pulse_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pulse_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES pulse_checklists(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  finding TEXT NOT NULL,
  fix TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor')),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_domain ON audits(domain);
CREATE INDEX idx_findings_audit ON audit_findings(audit_id);
CREATE INDEX idx_pulse_items_checklist ON pulse_items(checklist_id);
