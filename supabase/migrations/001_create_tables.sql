-- ─── AUDITS ───────────────────────────────────────────────────────────────────
CREATE TABLE audits (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  url            TEXT        NOT NULL,
  domain         TEXT        NOT NULL,
  industry       TEXT        NOT NULL CHECK (industry IN ('saas','ecommerce','portfolio','healthcare','fintech','service')),
  status         TEXT        NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','complete','report_ready','failed_unreachable','failed_spa','failed_error')),
  score          NUMERIC(5,2),
  part_a_score   NUMERIC(5,2),
  part_b_score   NUMERIC(5,2),
  part_c_score   NUMERIC(5,2),
  score_label    TEXT,
  checks_passed  INTEGER     DEFAULT 0,
  checks_flagged INTEGER     DEFAULT 0,
  critical_issues INTEGER    DEFAULT 0,
  dom_data       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

-- ─── AUDIT FINDINGS ───────────────────────────────────────────────────────────
CREATE TABLE audit_findings (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id       UUID        REFERENCES audits(id) ON DELETE CASCADE,
  check_id       TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  severity       TEXT        NOT NULL CHECK (severity IN ('critical','major','minor')),
  pass           BOOLEAN     NOT NULL,
  score          NUMERIC(4,2) NOT NULL,
  finding        TEXT        NOT NULL,
  fix            TEXT        NOT NULL,
  dom_zone       TEXT        DEFAULT 'body-copy',
  glossary_terms JSONB       DEFAULT '[]',
  category       TEXT,
  part           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PULSE CHECKLISTS ─────────────────────────────────────────────────────────
CREATE TABLE pulse_checklists (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id   UUID        REFERENCES audits(id) ON DELETE CASCADE,
  domain     TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PULSE ITEMS ──────────────────────────────────────────────────────────────
CREATE TABLE pulse_items (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID        REFERENCES pulse_checklists(id) ON DELETE CASCADE,
  check_id     TEXT        NOT NULL,
  finding      TEXT        NOT NULL,
  fix          TEXT        NOT NULL,
  severity     TEXT        NOT NULL CHECK (severity IN ('critical','major','minor')),
  completed    BOOLEAN     DEFAULT false,
  completed_at TIMESTAMPTZ
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_audits_status    ON audits(status);
CREATE INDEX idx_audits_domain    ON audits(domain);
CREATE INDEX idx_findings_audit   ON audit_findings(audit_id);
CREATE INDEX idx_pulse_items_checklist ON pulse_items(checklist_id);
