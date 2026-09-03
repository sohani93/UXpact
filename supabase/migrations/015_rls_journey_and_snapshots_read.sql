-- archetype_consistency_scores and site_snapshots had RLS enabled (migration
-- 009) but were missed from migration 010's anon SELECT grants — every real
-- row in both tables was silently invisible to the frontend's anon-key
-- client (RLS blocks with an empty result, not an error), even though the
-- data itself was real. This is what made Blueprint show "no journey breaks
-- pinned" and Diagnosis's journey breakdown render empty despite the AI
-- diagnosis genuinely having produced real breaks, and would do the same to
-- Pulse's "Watching Live" status once wired to site_snapshots.

create policy "Public can view journey breaks"
  on archetype_consistency_scores for select
  to anon, authenticated
  using (true);

create policy "Public can view site snapshots"
  on site_snapshots for select
  to anon, authenticated
  using (true);
