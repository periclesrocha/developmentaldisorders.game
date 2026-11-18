-- Global leaderboard for the Developmental Disorders game.
--
-- Run this once in the same Supabase project as the artery games:
-- Dashboard > SQL Editor > New query > paste this file > Run. It is safe to run again.
-- It only creates new objects (disorders_scores, disorders_leaderboard) and doesn't
-- touch the artery games' tables.
--
-- Players have no accounts. The page reads and writes with the project's
-- publishable key, so everything below is about what that key may do:
--   * read every score (public leaderboard)
--   * add a score, within sane limits, at most once every 15 s per nickname
--   * never change or delete a score
--
-- Each run records its mode (practice or test). The scope column says which table was
-- played: the game always plays the whole table ('all'); the part values are kept in case
-- a shorter variation comes back. There's one board per mode and scope.
--
-- Score = time + 10 s per mistake + 20 s per hint. Lower is better.
-- To change the penalties later, change MISTAKE_PENALTY_MS / HINT_PENALTY_MS in
-- app.js and the score_ms formula below, then run these three lines and this
-- whole file again (existing scores are recomputed with the new formula):
--   drop view if exists public.disorders_leaderboard;
--   alter table public.disorders_scores drop column score_ms;
--   alter table public.disorders_scores add column score_ms integer generated always as (time_ms + mistakes * 10000 + hints * 20000) stored;

create table if not exists public.disorders_scores (
  id           bigint generated always as identity primary key,
  nickname     text        not null,
  nickname_key text        generated always as (lower(btrim(nickname))) stored,
  mode         text        not null,
  scope        text        not null default 'all',
  time_ms      integer     not null,
  mistakes     integer     not null default 0,
  hints        integer     not null default 0,
  score_ms     integer     generated always as (time_ms + mistakes * 10000 + hints * 20000) stored,
  created_at   timestamptz not null default now(),

  constraint disorders_nickname_len check (char_length(btrim(nickname)) between 1 and 24),
  constraint disorders_mode         check (mode in ('practice', 'test')),
  constraint disorders_scope        check (scope in ('all', 'part1', 'part2', 'part3')),
  -- 140 cells (or 36 in the smallest part): nobody fills them honestly in under 20 seconds
  constraint disorders_time_range   check (time_ms between 20000 and 86400000),
  constraint disorders_mistakes     check (mistakes between 0 and 10000),
  constraint disorders_hints        check (hints between 0 and 500)
);

create index if not exists disorders_board_idx    on public.disorders_scores (mode, scope, score_ms);
create index if not exists disorders_nickname_idx on public.disorders_scores (nickname_key, created_at desc);

-- Row level security: read anything, insert with a per-nickname cooldown, nothing else
alter table public.disorders_scores enable row level security;

drop policy if exists "Anyone can read disorders scores" on public.disorders_scores;
create policy "Anyone can read disorders scores"
  on public.disorders_scores for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can add a disorders score" on public.disorders_scores;
create policy "Anyone can add a disorders score"
  on public.disorders_scores for insert
  to anon, authenticated
  with check (
    not exists (
      select 1 from public.disorders_scores s
      where s.nickname_key = lower(btrim(disorders_scores.nickname))
        and s.created_at > now() - interval '15 seconds'
    )
  );

-- Best run per nickname, per mode and table, with the number of runs
create or replace view public.disorders_leaderboard
  with (security_invoker = true) as
select distinct on (mode, scope, nickname_key)
  nickname_key,
  nickname,
  mode,
  scope,
  score_ms,
  time_ms,
  mistakes,
  hints,
  created_at,
  count(*) over (partition by mode, scope, nickname_key) as runs
from public.disorders_scores
order by mode, scope, nickname_key, score_ms asc, created_at asc;

-- Explicit grants: Supabase no longer exposes new tables to the API automatically.
-- Only the columns a player sends can be written; id, created_at and the score are set here.
revoke all on table public.disorders_scores from anon, authenticated;
grant select on table public.disorders_scores to anon, authenticated;
grant insert (nickname, mode, scope, time_ms, mistakes, hints) on table public.disorders_scores to anon, authenticated;
grant select on table public.disorders_leaderboard to anon, authenticated;

-- Ask the API to pick up the new table and view right away
notify pgrst, 'reload schema';
