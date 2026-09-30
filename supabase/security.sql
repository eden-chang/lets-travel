-- 접근 제어: 초대 코드로 합류한 멤버만 데이터에 접근할 수 있도록 제한
-- schema.sql 실행 후, 또는 기존 프로젝트에 그대로 실행 (여러 번 실행해도 안전)
-- 사전 조건: Dashboard > Authentication > Sign In / Providers 에서 "Allow anonymous sign-ins" 활성화

create extension if not exists pgcrypto with schema extensions;

-- 1) 초대 코드 (bcrypt 해시만 저장, 클라이언트 접근 불가)
create table if not exists public.trip_config (
  id               boolean primary key default true check (id),
  invite_code_hash text not null
);

-- 2) 합류한 멤버 (Supabase Auth 사용자)
create table if not exists public.trip_members (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now()
);

-- 3) 초대 코드 실패 기록 (무차별 대입 방지)
create table if not exists public.trip_join_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_trip_join_attempts_user
  on public.trip_join_attempts (user_id, attempted_at);

-- 내부 테이블은 RLS만 켜고 정책을 두지 않음 → 클라이언트에서 직접 접근 불가
alter table public.trip_config enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_join_attempts enable row level security;
revoke all on public.trip_config, public.trip_members, public.trip_join_attempts
  from anon, authenticated;

create or replace function public.is_trip_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members where user_id = auth.uid()
  );
$$;

create or replace function public.join_trip(invite_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid             uuid := auth.uid();
  stored_hash     text;
  recent_failures integer;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  -- 동시 요청으로 시도 제한을 우회하지 못하도록 합류 시도를 직렬화
  perform pg_advisory_xact_lock(hashtext('public.join_trip'));

  if exists (select 1 from public.trip_members where user_id = uid) then
    return 'joined';
  end if;

  select count(*) into recent_failures
  from public.trip_join_attempts
  where user_id = uid
    and attempted_at > now() - interval '15 minutes';

  if recent_failures >= 5 then
    return 'rate_limited';
  end if;

  -- 익명 사용자를 새로 만들어 제한을 우회하는 경우를 막는 전역 상한
  select count(*) into recent_failures
  from public.trip_join_attempts
  where attempted_at > now() - interval '15 minutes';

  if recent_failures >= 30 then
    return 'rate_limited';
  end if;

  delete from public.trip_join_attempts
  where attempted_at < now() - interval '1 day';

  select invite_code_hash into stored_hash from public.trip_config where id;

  if stored_hash is null
     or extensions.crypt(coalesce(invite_code, ''), stored_hash) <> stored_hash then
    insert into public.trip_join_attempts (user_id) values (uid);
    return 'invalid';
  end if;

  insert into public.trip_members (user_id) values (uid)
  on conflict (user_id) do nothing;
  return 'joined';
end;
$$;

revoke all on function public.is_trip_member() from public, anon;
revoke all on function public.join_trip(text) from public, anon;
grant execute on function public.is_trip_member() to authenticated;
grant execute on function public.join_trip(text) to authenticated;

-- 4) 데이터 테이블: 기존 전체 허용 정책 제거 후 멤버 전용 정책으로 교체
-- 대시보드 등에서 추가된 정책까지 모두 제거 (허용 정책은 OR로 합쳐지므로 하나라도 남으면 우회 가능)
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('expenses', 'transfers', 'cash')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$$;

alter table public.expenses enable row level security;
alter table public.transfers enable row level security;
alter table public.cash enable row level security;

revoke all on public.expenses, public.transfers, public.cash from anon;

create policy "Trip members can access expenses" on public.expenses
  for all to authenticated
  using ((select public.is_trip_member()))
  with check ((select public.is_trip_member()));

create policy "Trip members can access transfers" on public.transfers
  for all to authenticated
  using ((select public.is_trip_member()))
  with check ((select public.is_trip_member()));

create policy "Trip members can access cash" on public.cash
  for all to authenticated
  using ((select public.is_trip_member()))
  with check ((select public.is_trip_member()));

-- 5) 초대 코드 설정/변경 — 저장소에 코드를 남기지 말고 SQL Editor에서 직접 실행
--    16자 이상 무작위 문자열 사용 (bcrypt는 앞 72바이트만 사용)
-- insert into public.trip_config (invite_code_hash)
-- values (extensions.crypt('<충분히 긴 무작위 코드>', extensions.gen_salt('bf', 10)))
-- on conflict (id) do update set invite_code_hash = excluded.invite_code_hash;

-- 6) 적용 확인: 아래 결과에 "Trip members can access ..." 정책 3개만 있어야 함
-- select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public';
