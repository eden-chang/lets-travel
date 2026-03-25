-- 여행 경비 정산 앱 - Supabase 테이블 스키마
-- Supabase Dashboard > SQL Editor에서 실행

-- 1) 지출 내역
create table if not exists expenses (
  id          text primary key,
  date        text not null,
  city        text not null default '',
  category    text not null,
  "desc"      text not null,
  currency    text not null,
  amount      numeric not null,
  krw         integer not null,
  payer       text not null,
  members     text[] not null,
  method      text not null default 'card',
  split_mode  boolean not null default false,
  shared_amount numeric,
  splits      jsonb,
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

-- 2) 송금 내역 (선입금 + 정산 + 현금거래)
create table if not exists transfers (
  id          text primary key,
  type        text not null check (type in ('deposit', 'settlement', 'cash_exchange')),
  from_member text not null,
  to_member   text not null,
  amount      numeric not null,
  currency    text,
  date        text not null,
  memo        text not null default '',
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

-- 3) 현금 보유
create table if not exists cash (
  id          text primary key,
  currency    text not null,
  amount      numeric not null,
  memo        text not null default '',
  date        text not null,
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

-- 인덱스
create index if not exists idx_expenses_updated on expenses (updated_at);
create index if not exists idx_transfers_updated on transfers (updated_at);
create index if not exists idx_cash_updated on cash (updated_at);

-- Realtime 활성화
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table transfers;
alter publication supabase_realtime add table cash;

-- RLS - anon key 전체 접근 허용
alter table expenses enable row level security;
alter table transfers enable row level security;
alter table cash enable row level security;

create policy "Allow all for expenses" on expenses for all using (true) with check (true);
create policy "Allow all for transfers" on transfers for all using (true) with check (true);
create policy "Allow all for cash" on cash for all using (true) with check (true);
