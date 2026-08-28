-- Enables pg_net (so Postgres can call the project's own Edge Functions,
-- used both for the check-drift scheduled sweep below and for testing) and
-- pg_cron (for the sweep's schedule).
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Reasoning-based regression tracking: check-drift's assessRegression() call
-- reasons across an audit's full drift history (not just the last snapshot)
-- and writes its one_off/repeated judgment + reasoning here.
alter table drift_events
  add column if not exists regression_type text check (regression_type in ('one_off', 'repeated')),
  add column if not exists reasoning text;

comment on column drift_events.regression_type is 'Claude''s judgment, reasoning across this audit''s full archetype_consistency_scores history, on whether this severity rise is a one-off dip or a repeated/escalating regression.';
comment on column drift_events.reasoning is 'The reasoning behind regression_type, grounded in the historical sequence of severities for this journey stage.';

-- Scheduled (non-reactive) drift checks: fires check-drift for every
-- UX-Pulse-tracked audit (one with a site_snapshots row) every 6 hours,
-- independent of visitor traffic, via pg_net. check-drift itself still
-- throttles to once per 6h per audit, so this is a no-op most of the time
-- for a site that also gets reactive traffic-triggered checks.
create or replace function public.trigger_scheduled_drift_sweep() returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  rec record;
begin
  for rec in select audit_id, domain from site_snapshots where domain is not null loop
    perform net.http_post(
      url := 'https://oxminualycvnxofoevjs.supabase.co/functions/v1/check-drift',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('auditId', rec.audit_id, 'domain', rec.domain),
      timeout_milliseconds := 120000
    );
  end loop;
end;
$$;

comment on function public.trigger_scheduled_drift_sweep() is 'Fires a proactive (non-fingerprint) check-drift call for every UX-Pulse-tracked audit, independent of visitor traffic. Scheduled every 6h by the check-drift-scheduled-sweep pg_cron job.';

select cron.schedule(
  'check-drift-scheduled-sweep',
  '0 */6 * * *',
  $$select public.trigger_scheduled_drift_sweep();$$
);
