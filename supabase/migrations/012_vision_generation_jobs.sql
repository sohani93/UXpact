-- Generation (generate-vision) and self-checking (self-check-vision) are
-- each a multi-step AI call chain that reliably exceeds Supabase Edge
-- Functions' hard ~150s per-invocation wall-clock limit — measured directly
-- against this project. Both functions now return a jobId immediately and
-- do their real work via EdgeRuntime.waitUntil, writing the result here.
-- The frontend polls this table (RLS allows anon SELECT) until a job's
-- status flips to 'done' or 'error'.
create table if not exists vision_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits(id),
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  stage text not null default 'generate' check (stage in ('generate', 'self_check')),
  html text,
  self_check jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table vision_generation_jobs enable row level security;

-- Frontend polls job status/result directly via the anon key; only the
-- service-role edge functions ever insert/update a row.
create policy "anon can read vision_generation_jobs" on vision_generation_jobs
  for select to anon, authenticated using (true);
