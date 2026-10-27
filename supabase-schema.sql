-- ================================================================
--  紅符 커뮤니티 — Supabase 데이터베이스 설정 (처음 한 번 전체 실행)
--  Supabase 대시보드 → SQL Editor → New query 에 전부 붙여넣고 Run
--  실행 후 맨 아래 "첫 관리자 지정" 한 줄을 본인 아이디로 바꿔서 한 번 더 실행하세요.
-- ================================================================

-- ── 사이트 설정 (한 줄짜리 표) ──────────────────────────────────
create table if not exists public.site_settings (
  id            int primary key default 1 check (id = 1),
  bgm_url       text default '',
  bgm_title     text default '',
  bgm_on        boolean default false,
  signup_open   boolean default true,
  public_view   boolean default false,   -- 비회원 둘러보기
  create_mode   text default 'open'   check (create_mode in ('open', 'closed', 'scheduled')),
  create_start  text default '',
  create_end    text default '',
  edit_mode     text default 'closed' check (edit_mode in ('open', 'closed', 'scheduled')),
  edit_start    text default '',
  edit_end      text default ''
);
insert into public.site_settings (id) values (1) on conflict do nothing;
-- 메인 왼쪽 아래 배너 (관리자 페이지 '메인 배너'). 이미 표를 만들었다면 이 한 줄만 실행해도 돼요.
alter table public.site_settings add column if not exists lobby_banners jsonb not null default '[]';

-- ── 멤버 명부 ────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  title       text default '',
  role        text default '',                 -- 직분 (道士 등, 꾸밈용)
  seal        text default '',
  bio         text default '' check (char_length(bio) <= 300),
  grade       text not null default 'member' check (grade in ('member', 'admin')),  -- 권한 등급
  approval    text not null default 'pending' check (approval in ('pending', 'approved', 'rejected')),  -- 가입 승인
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- 아이디·이메일 (비공개: 본인과 관리자만)
create table if not exists public.accounts (
  id        uuid primary key references auth.users(id) on delete cascade,
  username  text not null unique check (username ~ '^[a-z0-9_]{4,8}$'),
  contact   text default ''          -- 가입할 때 적은 이메일 (아무거나 가능)
);
alter table public.accounts enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and grade = 'admin' and approval = 'approved');
$$;
-- 승인된 회원인지 (사이트 내용을 볼 수 있는지)
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and approval = 'approved');
$$;
-- 비회원 둘러보기가 켜져 있거나 승인된 회원이면 볼 수 있음
create or replace function public.can_view() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_member() or coalesce((select public_view from site_settings where id = 1), false);
$$;
-- 아이디 중복 확인 (회원 목록은 노출하지 않고 있다/없다만)
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from accounts where username = lower(p_username));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

drop policy if exists "accounts read" on public.accounts;
create policy "accounts read" on public.accounts for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "profiles read"   on public.profiles for select using (public.can_view() or id = auth.uid());
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- 일반 회원은 자기 등급(grade)을 못 바꿈
create or replace function public.profiles_guard() returns trigger language plpgsql as $$
begin
  -- (auth.uid() 가 없으면 SQL Editor 에서 직접 실행한 것이므로 허용)
  if (new.grade is distinct from old.grade or new.approval is distinct from old.approval)
     and auth.uid() is not null and not public.is_admin() then
    raise exception '등급과 가입 승인은 관리자만 바꿀 수 있어요.';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

alter table public.site_settings enable row level security;
create policy "settings read"   on public.site_settings for select using (true);
drop policy if exists "settings update" on public.site_settings;
create policy "settings update" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 회원가입: 가입하면 명부에 자동 등록, 가입이 닫혀 있으면 거절
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select signup_open from site_settings where id = 1), true) then
    raise exception 'signup_closed';
  end if;
  -- 가입 신청: 승인 대기 상태로 명부와 아이디 표에 등록
  insert into public.profiles (id, nickname, approval)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)), 'pending')
  on conflict (id) do nothing;
  insert into public.accounts (id, username, contact)
  values (new.id, lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
          left(coalesce(new.raw_user_meta_data->>'contact', ''), 120))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ── 예외 허용 (기간이 아니어도 특정 회원만 열어 주기) ────────────
create table if not exists public.edit_grants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('create', 'edit')),
  until       timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table public.edit_grants enable row level security;
create policy "grants read"   on public.edit_grants for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "grants insert" on public.edit_grants;
create policy "grants insert" on public.edit_grants for insert to authenticated with check (public.is_admin());
drop policy if exists "grants delete" on public.edit_grants;
create policy "grants delete" on public.edit_grants for delete to authenticated using (public.is_admin());

-- 지금 등록/수정이 가능한지 (기간 또는 예외)
create or replace function public.can_write(p_kind text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare s site_settings; m text; a timestamptz; b timestamptz;
begin
  if public.is_admin() then return true; end if;
  select * into s from site_settings where id = 1;
  if p_kind = 'create' then m := s.create_mode; a := nullif(s.create_start, '')::timestamptz; b := nullif(s.create_end, '')::timestamptz;
  else m := s.edit_mode; a := nullif(s.edit_start, '')::timestamptz; b := nullif(s.edit_end, '')::timestamptz; end if;
  if m = 'open' then return true; end if;
  if m = 'scheduled' and now() between a and b then return true; end if;
  return exists (select 1 from edit_grants where user_id = auth.uid() and kind = p_kind and until > now());
end $$;

-- ── 캐릭터 ──────────────────────────────────────────────────────
create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author      text not null,
  data          jsonb not null default '{}'::jsonb,   -- 게시본 (모두에게 보임)
  draft         jsonb,                                 -- 작성본 (본인·관리자만)
  status        text not null default 'draft' check (status in ('draft', 'submitted', 'returned', 'published')),
  submitted_at  timestamptz,
  published_at  timestamptz,                           -- 값이 있으면 공개된 캐릭터
  review_note   text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.characters enable row level security;
-- 보기: 게시된 캐릭터는 누구나, 게시 전은 본인과 관리자만
--   (주의: 게시된 캐릭터의 작성본(draft) 칸도 함께 읽히므로, 작성본은 "공개 전 미리보기" 정도로만 생각해 주세요)
-- 캐릭터 한 명 데이터 크기 제한 (글 · 링크만 담아요 — 그림 파일을 통째로 넣어 DB 가 무거워지는 걸 막아요) · 기존 기록은 검사하지 않아요
alter table public.characters drop constraint if exists characters_size;
alter table public.characters add constraint characters_size check (octet_length(data::text) <= 262144 and octet_length(coalesce(draft::text, '')) <= 262144) not valid;
-- 읽기: 테이블은 본인 · 관리자만 (작성본 draft 가 남에게 새지 않게) · 다른 사람은 아래 characters_view 로 게시본만 봐요
drop policy if exists "characters read" on public.characters;
create policy "characters read"   on public.characters for select using (owner_id = auth.uid() or public.is_admin());-- 새 작성본 만들기: 언제나 (본인 명의, 게시 전 상태로만)
drop policy if exists "characters insert" on public.characters;
create policy "characters insert" on public.characters for insert to authenticated
  with check ((owner_id = auth.uid() and public.is_member()) or public.is_admin());
-- 고치기: 본인 것 또는 관리자 (무엇을 바꿀 수 있는지는 아래 characters_guard 가 검사)
drop policy if exists "characters update" on public.characters;
create policy "characters update" on public.characters for update to authenticated
  using ((owner_id = auth.uid() and public.is_member()) or public.is_admin()) with check ((owner_id = auth.uid() and public.is_member()) or public.is_admin());
-- 삭제: 관리자만
drop policy if exists "characters delete" on public.characters;
create policy "characters delete" on public.characters for delete to authenticated using (public.is_admin());

-- 모두가 보는 캐릭터 목록: 게시된 캐릭터 + 내 것 (남의 작성본 · 반려 메모는 비워서 보여요)
create or replace view public.characters_view as
select id, owner_id, author, data,
  case when owner_id = auth.uid() or public.is_admin() then draft end as draft,
  status, submitted_at, published_at,
  case when owner_id = auth.uid() or public.is_admin() then review_note else '' end as review_note,
  created_at, updated_at
from public.characters
where (published_at is not null and public.can_view()) or owner_id = auth.uid() or public.is_admin();
grant select on public.characters_view to anon, authenticated;
-- 일반 회원이 할 수 있는 것: 작성본 저장(언제나), 제출(기간 안), 제출 취소
-- 게시본(data)·게시·반려는 관리자만
create or replace function public.characters_guard() returns trigger language plpgsql as $$
begin
  if public.is_admin() or auth.uid() is null then
    if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then new.submitted_at := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.published_at is not null or new.data <> '{}'::jsonb then
      raise exception '새 캐릭터는 작성본으로만 만들 수 있어요.';
    end if;
    return new;
  end if;
  if new.data is distinct from old.data or new.published_at is distinct from old.published_at
     or new.owner_id is distinct from old.owner_id or new.review_note is distinct from old.review_note or new.author is distinct from old.author
     or new.status in ('published', 'returned') and new.status is distinct from old.status then
    raise exception '게시와 반려는 관리자만 할 수 있어요.';
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' then
    if not public.can_write(case when old.published_at is null then 'create' else 'edit' end) then
      raise exception '지금은 제출 기간이 아니에요.';
    end if;
    new.submitted_at := now();
  end if;
  return new;
end $$;
drop trigger if exists characters_guard on public.characters;
create trigger characters_guard before insert or update on public.characters for each row execute function public.characters_guard();

-- ── 수정 기록: 쓰지 않아요 (예전에 만든 표 · 자동 기록을 지워요) ─────────
drop trigger if exists characters_log on public.characters;
drop function if exists public.log_character();
drop table if exists public.edit_log;

-- ── 사건 보드 쪽지 ──────────────────────────────────────────────
create table if not exists public.notes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author        text not null,
  title         text default '' check (char_length(title) <= 40),
  body          text default '' check (char_length(body) <= 400),
  color         text default 'fu',
  character_id  uuid references public.characters(id) on delete set null,
  photo         text default '' check (photo = '' or photo ~* '^https?://'),   -- 모브 사진 (외부 이미지 링크)
  x             integer not null default 1100,
  y             integer not null default 700,
  rot           real not null default 0,
  created_at    timestamptz not null default now()
);
-- 이미 만든 사이트에 다시 실행해도 사진 칸이 추가되도록
alter table public.notes add column if not exists photo text default '';
alter table public.notes add column if not exists font text default 'jaram';   -- 쪽지 글씨체 (jaram 자람체 / dahyeon 박다현체)
-- 쪽지 사진 칸은 링크만 (그림 파일을 통째로 넣지 못하게)
alter table public.notes drop constraint if exists notes_photo_len;
alter table public.notes add constraint notes_photo_len check (char_length(coalesce(photo, '')) <= 2048) not valid;
alter table public.notes enable row level security;
create policy "notes read"   on public.notes for select using (public.can_view());
drop policy if exists "notes insert" on public.notes;
create policy "notes insert" on public.notes for insert to authenticated with check (owner_id = auth.uid() and public.is_member());
drop policy if exists "notes update" on public.notes;
create policy "notes update" on public.notes for update to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists "notes delete" on public.notes;
create policy "notes delete" on public.notes for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- 다른 사람의 쪽지는 위치(x, y)만 옮길 수 있음
create or replace function public.notes_guard() returns trigger language plpgsql as $$
begin
  if old.owner_id <> auth.uid() and not public.is_admin() and (
       new.title is distinct from old.title or new.body is distinct from old.body or
       new.color is distinct from old.color or new.character_id is distinct from old.character_id or new.photo is distinct from old.photo or new.font is distinct from old.font or
       new.owner_id is distinct from old.owner_id or new.author is distinct from old.author) then
    raise exception '다른 사람의 쪽지 내용은 고칠 수 없어요.';
  end if;
  return new;
end $$;
drop trigger if exists notes_guard on public.notes;
create trigger notes_guard before update on public.notes for each row execute function public.notes_guard();

-- ── 쪽지를 잇는 붉은 실 ─────────────────────────────────────────
create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author      text not null,
  from_id     uuid not null references public.notes(id) on delete cascade,
  to_id       uuid not null references public.notes(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.links enable row level security;
create policy "links read"   on public.links for select using (public.can_view());
drop policy if exists "links insert" on public.links;
create policy "links insert" on public.links for insert to authenticated with check (owner_id = auth.uid() and public.is_member());
drop policy if exists "links delete" on public.links;
create policy "links delete" on public.links for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- ── NPC 명부 (회원 누구나 추가, 수정·삭제는 쓴 사람과 관리자) ───
create table if not exists public.npcs (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author        text not null,
  name          text not null check (char_length(name) between 1 and 20),
  title         text default '',
  role          text default '',
  seal          text default '',
  faction       text default '',
  bio           text default '' check (char_length(bio) <= 600),
  related_char  uuid references public.characters(id) on delete set null,
  created_at    timestamptz not null default now()
);
alter table public.npcs enable row level security;
create policy "npcs read"   on public.npcs for select using (public.can_view());
drop policy if exists "npcs insert" on public.npcs;
create policy "npcs insert" on public.npcs for insert to authenticated with check (owner_id = auth.uid() and public.is_member());
drop policy if exists "npcs update" on public.npcs;
create policy "npcs update" on public.npcs for update to authenticated
  using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
drop policy if exists "npcs delete" on public.npcs;
create policy "npcs delete" on public.npcs for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- ── 심박 텔레파시 (익명, 모든 멤버에게, 한 사람당 하루 1번 무료 · 더 보내려면 상점의 심박권) ─────
create table if not exists public.telepathy (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  author      text not null,
  to_user     uuid not null references auth.users(id) on delete cascade,
  from_char   uuid references public.characters(id) on delete set null,
  to_char     uuid references public.characters(id) on delete set null,
  body        text not null check (char_length(body) between 1 and 200),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.telepathy enable row level security;  -- 정책 없음 = 직접 접근 불가 (아래 뷰/함수로만)
revoke all on public.telepathy from anon, authenticated;

create or replace view public.tele_box as
select id,
  case when owner_id <> auth.uid() then null else owner_id end as owner_id,
  case when owner_id <> auth.uid() then null else author end as author,
  to_user,
  case when owner_id <> auth.uid() then null else from_char end as from_char,
  to_char, body, read, created_at
from public.telepathy
where owner_id = auth.uid() or to_user = auth.uid();
revoke all on public.tele_box from anon;
grant select on public.tele_box to authenticated;

create or replace function public.send_tele(p_from_char uuid, p_to_char uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); nick text; target uuid; cnt int; new_id uuid;
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  if uid is null or not public.is_member() then raise exception '승인된 회원만 보낼 수 있어요.'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception '전할 마음을 적어 주세요.'; end if;
  if not exists (select 1 from characters where id = p_from_char and owner_id = uid) then raise exception '내 캐릭터만 텔레파시를 보낼 수 있어요.'; end if;
  select owner_id into target from characters where id = p_to_char and published_at is not null;   -- 게시된 캐릭터에게만
  if target is null then raise exception '받을 캐릭터를 골라 주세요.'; end if;
  if target = uid then raise exception '다른 멤버의 캐릭터에게만 보낼 수 있어요.'; end if;
  -- 캐릭터가 여러 명이어도 한 사람당 하루 1번 무료 (다음 날로 쌓이지 않아요) · 그다음부터는 심박권(k_beat) 1장씩
  select count(*) into cnt from telepathy where owner_id = uid and created_at >= day_start;
  if cnt >= 1 then
    update wallets set tickets = tickets || jsonb_build_object('k_beat', (tickets->>'k_beat')::int - 1), updated_at = now()
      where user_id = uid and coalesce((tickets->>'k_beat')::int, 0) > 0;
    if not found then raise exception '오늘 무료 심박을 이미 보냈어요. 상점에서 심박권을 사면 더 보낼 수 있어요.'; end if;
  end if;
  select nickname into nick from profiles where id = uid;
  insert into telepathy (owner_id, author, to_user, from_char, to_char, body)
  values (uid, coalesce(nick, '?'), target, p_from_char, p_to_char, left(p_body, 200))
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.mark_tele_read(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update telepathy set read = true where id = p_id and to_user = auth.uid();
$$;
revoke all on function public.send_tele(uuid, uuid, text) from anon, public;
revoke all on function public.mark_tele_read(uuid) from anon, public;
grant execute on function public.send_tele(uuid, uuid, text) to authenticated;
grant execute on function public.mark_tele_read(uuid) to authenticated;

-- ── 출석 · 지갑 · 상점 · 선물 ──────────────────────────────────────
--   영전(코인)은 아래 함수로만 늘고 줄어요. 표에 직접 쓰는 건 막혀 있어요.
--   이 구역은 여러 번 실행해도 괜찮아요 (예전 상점 표가 있으면 새 칸만 더해요).
create table if not exists public.shop_items (
  id      text primary key,
  kind    text not null,
  name    text not null,
  price   int  not null check (price >= 0),
  value   text not null default '',
  descr   text not null default '',
  sort    int  not null default 0,
  active  boolean not null default true
);
alter table public.shop_items add column if not exists stats jsonb not null default '{}';   -- 칭호를 달면 오르는 스탯 {"근력": 3}
alter table public.shop_items add column if not exists max_per int;                           -- 한 사람이 받을 수 있는 최대 횟수
alter table public.shop_items add column if not exists stock int;                             -- 최대 몇 명이 가질 수 있는지 (비우거나 0이면 무제한)
alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (kind in ('title', 'tag', 'snack', 'ticket', 'boost', 'curse'));
alter table public.shop_items enable row level security;
drop policy if exists "shop read" on public.shop_items;
drop policy if exists "shop admin" on public.shop_items;
create policy "shop read" on public.shop_items for select to authenticated using (true);
create policy "shop admin" on public.shop_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
delete from public.shop_items where id in ('t_cat', 't_fire', 't_charm', 't_night', 't_ghost', 't_ward', 't_seal');   -- 예전 칭호
insert into public.shop_items (id, kind, name, price, value, descr, sort, max_per) values
  ('t01', 'title', '오빠', 50, '오빠', '', 1, null), ('t02', 'title', '애기', 50, '애기', '', 2, null),
  ('t03', 'title', '차기 가주', 50, '차기 가주', '', 3, null), ('t04', 'title', '천사', 50, '천사', '', 4, null),
  ('t05', 'title', '악마', 50, '악마', '', 5, null), ('t06', 'title', '고양이', 50, '고양이', '', 6, null),
  ('t07', 'title', '바보', 50, '바보', '', 7, null), ('t08', 'title', '멍청이', 50, '멍청이', '', 8, null),
  ('t09', 'title', '줴줴이야', 50, '줴줴이야', '', 9, null), ('t10', 'title', '엄..', 50, '엄..', '', 10, null),
  ('t11', 'title', '초딩', 50, '초딩', '', 11, null), ('t12', 'title', '어른', 50, '어른', '', 12, null),
  ('t13', 'title', '섹시한', 50, '섹시한', '', 13, null), ('t14', 'title', '귀여운', 50, '귀여운', '', 14, null),
  ('t15', 'title', '멋진', 50, '멋진', '', 15, null), ('t16', 'title', '예쁜', 50, '예쁜', '', 16, null),
  ('t17', 'title', '누나', 50, '누나', '', 17, null), ('t18', 'title', '망량의 아이돌', 50, '망량의 아이돌', '', 18, null),
  ('t19', 'title', '일진', 50, '일진', '', 19, null), ('t20', 'title', '찐따', 50, '찐따', '', 20, null),
  ('t21', 'title', '밤티', 50, '밤티', '', 21, null), ('t22', 'title', '장원영', 50, '장원영', '', 22, null),
  ('t23', 'title', '먼작귀', 50, '먼작귀', '', 23, null), ('t24', 'title', '씹탑', 50, '씹탑', '', 24, null),
  ('t25', 'title', '천상수', 50, '천상수', '', 25, null), ('t26', 'title', '강부치', 50, '강부치', '', 26, null),
  ('t27', 'title', '천상팸', 50, '천상팸', '', 27, null), ('t28', 'title', '남자 친구', 50, '남자 친구', '', 28, null),
  ('t29', 'title', '여자 친구', 50, '여자 친구', '', 29, null),
  -- value 의 {from} 자리에 선물한 사람 닉네임이 들어가요 (선물로만 받을 수 있어요)
  ('t30', 'title', '(보낸 사람) 남친', 50, '{from} 남친', '선물로만 받을 수 있어요. 선물한 사람의 닉네임이 칭호에 들어가요.', 30, null),
  ('t31', 'title', '(보낸 사람) 여친', 50, '{from} 여친', '선물로만 받을 수 있어요. 선물한 사람의 닉네임이 칭호에 들어가요.', 31, null),
  ('t32', 'title', '(보낸 사람) 꺼', 50, '{from} 꺼', '선물로만 받을 수 있어요. 선물한 사람의 닉네임이 칭호에 들어가요.', 32, null),
  ('t33', 'title', '개', 50, '개', '', 33, null), ('t34', 'title', '건드리지 마세요', 50, '건드리지 마세요', '', 34, null),
  ('t35', 'title', 'zzZ', 50, 'zzZ', '', 35, null),
  ('c_moon',  'tag',    '월백 이름표',   40, '#f4f3ff', '달빛처럼 하얀 이름표', 61, null),
  ('c_lav',   'tag',    '연보라 이름표', 40, '#c4b6ff', '고양이 털빛 연보라', 62, null),
  ('c_jade',  'tag',    '청자 이름표',   60, '#9fe0cf', '매듭 구슬의 옥빛', 63, null),
  ('c_plum',  'tag',    '홍매 이름표',   60, '#ffa3c8', '볼터치 같은 분홍', 64, null),
  ('c_gold',  'tag',    '금박 이름표',  120, '#f0d58a', '금박을 입힌 이름표', 65, null),
  ('s_churu', 'snack',  '츄르',          20, '', '로비 고양이에게 줄 수 있어요 (1개씩 사용)', 71, null),
  ('k_room',  'ticket', '룸메이트 지정권', 30, '', '룸메이트를 지정할 수 있는 권리예요. 사용할 땐 관리자에게 알려 주세요.', 81, null),
  ('k_beat',  'ticket', '심박권',       150, '', '오늘 무료 심박을 쓴 뒤에도 심박을 한 번 더 보낼 수 있어요. 보내면 1장씩 줄고, 다음 날로 쌓여요.', 80, null),
  ('b_stat',  'boost',  '스탯 증가권',  100, '', '캐릭터의 스탯 하나가 무작위로 +5 올라요. 한 사람당 10번까지.', 82, 10)
on conflict (id) do nothing;
update public.shop_items set sort = sort + 30 where kind <> 'title' and sort < 60;   -- 칭호가 늘어서 이름표 · 간식 · 이용권은 뒤로
-- 칭호는 한정 수량: 선물 전용({from})은 3명, 나머지는 1명 (관리자가 0으로 바꾸면 무제한 · 다시 실행해도 그대로)
update public.shop_items set stock = case when value like '%{from}%' then 3 else 1 end where kind = 'title' and stock is null and id <> 't36';
-- 고양이 호감도를 가득 채운 사람에게만 공개되는 칭호 (needs = 'cat_full' · 본인만 살 수 있어요 · 수량 무제한)
alter table public.shop_items add column if not exists needs text;
insert into public.shop_items (id, kind, name, price, value, descr, sort, max_per, stock, needs) values
  ('t36', 'title', '집사', 50, '집사', '로비 고양이의 호감도를 가득 채운 사람만 살 수 있어요. 선물은 안 돼요.', 36, null, 0, 'cat_full'),
  -- 파산권: 영전이 마이너스인 사람에게 선물로만 · 50% 확률로 빚 절반 탕감, 50% 확률로 빚 전부 탕감
  ('x_bankrupt', 'curse', '파산권', 300, '', '영전이 마이너스인 사람에게만 선물할 수 있어요. 50% 확률로 빚이 반으로 줄거나, 50% 확률로 빚이 다 없어져요.', 83, null, 0, null)
on conflict (id) do nothing;
update public.shop_items set descr = '영전이 마이너스인 사람에게만 선물할 수 있어요. 50% 확률로 빚이 반으로 줄거나, 50% 확률로 빚이 다 없어져요.' where id = 'x_bankrupt';
-- 가격 인상 (2026-10 개편): 칭호 500 · 나머지 ×10 (관리자가 상점 탭에서 바꾼 값도 이 값으로 덮어써요)
update public.shop_items set price = 500 where kind = 'title';
update public.shop_items set price = case id when 'c_moon' then 400 when 'c_lav' then 400 when 'c_jade' then 600 when 'c_plum' then 600 when 'c_gold' then 1200
  when 's_churu' then 200 when 'k_room' then 300 when 'k_beat' then 150 when 'b_stat' then 1000 when 'x_bankrupt' then 3000 else price end where kind <> 'title';
create table if not exists public.wallets (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  coins    int  not null default 0 check (coins >= 0),
  items    text[] not null default '{}',
  equip    jsonb not null default '{}',
  snacks   int  not null default 0 check (snacks >= 0),
  updated_at timestamptz not null default now()
);
alter table public.wallets add column if not exists tickets jsonb not null default '{}';   -- {"k_room": 1}
alter table public.wallets add column if not exists boosts  jsonb not null default '{}';   -- {"캐릭터id": {"근력": 5}}
alter table public.wallets add column if not exists boost_n int   not null default 0;      -- 받은 스탯 증가권 수
-- 로비 고양이 호감도 (cat_pet 함수로만 바뀌어요)
alter table public.wallets add column if not exists aff       int   not null default 0;     -- 0 ~ 100 · 계속 쌓여요
alter table public.wallets add column if not exists aff_day   date;                         -- 마지막으로 올린 날 (한국 시간)
alter table public.wallets add column if not exists aff_gain  int   not null default 0;     -- 그날 올린 양 (하루 +5까지)
alter table public.wallets add column if not exists aff_drop  date;                         -- 마지막으로 삐진 날 (하루 한 번)
alter table public.wallets add column if not exists aff_gifts int[] not null default '{}';  -- 이미 받은 선물 단계 (25 · 50 · 75)
alter table public.wallets add column if not exists cat_full  boolean not null default false; -- 100을 한 번이라도 채움 → '집사' 칭호 공개
-- 영전은 마이너스가 될 수 있어요 (두상팡에서 지면) — 예전의 0 이상 제한을 풀어요
alter table public.wallets drop constraint if exists wallets_coins_check;
alter table public.wallets enable row level security;
drop policy if exists "wallet own" on public.wallets;
create policy "wallet own" on public.wallets for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.wallets from anon, authenticated;
-- 다른 멤버도 볼 수 있는 부분만 (단 칭호 · 스탯 보너스 · 보유 영전 — 메인 화면 영전 순위 카드에 써요)
create or replace view public.wallet_public as select user_id, equip, boosts, coins from public.wallets where public.is_member();   -- 승인 대기 중인 사람에겐 안 보여요
revoke all on public.wallet_public from anon;
grant select on public.wallet_public to authenticated;
-- 물건마다 가진 사람 수 (품절 표시용 · 누가 가졌는지는 안 보여요)
create or replace view public.shop_sold as select i.id, count(*)::int as sold from public.wallets w, unnest(w.items) as i(id) where public.is_member() group by i.id;
revoke all on public.shop_sold from anon;
grant select on public.shop_sold to authenticated;

create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  nick       text not null,
  title      text,
  tag        text,
  comment    text not null default '' check (char_length(comment) <= 60),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
alter table public.attendance enable row level security;
drop policy if exists "attendance read" on public.attendance;
create policy "attendance read" on public.attendance for select to authenticated using (public.is_member());
revoke insert, update, delete on public.attendance from anon, authenticated;

-- 구매 · 선물 기록 (관리자만 보고, 3일 지나면 새 기록이 생길 때 지워져요)
create table if not exists public.shop_log (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('buy', 'gift', 'admin')),
  buyer      uuid references auth.users(id) on delete set null,
  buyer_nick text not null,
  to_user    uuid references auth.users(id) on delete set null,
  to_nick    text not null,
  item_id    text not null,
  item_name  text not null,
  price      int  not null,
  detail     text not null default '',
  created_at timestamptz not null default now()
);
alter table public.shop_log drop constraint if exists shop_log_kind_check;   -- 관리자 영전 지급(admin) 기록도 남겨요
alter table public.shop_log add constraint shop_log_kind_check check (kind in ('buy', 'gift', 'admin'));
alter table public.shop_log enable row level security;
drop policy if exists "shop log admin" on public.shop_log;
create policy "shop log admin" on public.shop_log for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.shop_log from anon, authenticated;

create or replace function public.wallet_json(w public.wallets) returns json language sql stable as $$
  select json_build_object('coins', w.coins, 'items', w.items, 'equip', w.equip, 'snacks', w.snacks,
    'tickets', w.tickets, 'boosts', w.boosts, 'boost_n', w.boost_n,
    'aff', w.aff, 'aff_day', w.aff_day, 'aff_gain', w.aff_gain, 'aff_drop', w.aff_drop, 'aff_gifts', w.aff_gifts, 'cat_full', w.cat_full);
$$;

create or replace function public.check_in(p_comment text) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); today date := (now() at time zone 'Asia/Seoul')::date; d date;
  streak int := 0; bonus int := 0; nick text; w wallets; t_title text; t_tag text;
begin
  if uid is null or not public.is_member() then raise exception '승인된 회원만 출석할 수 있어요.'; end if;
  if exists (select 1 from attendance where user_id = uid and day = today) then raise exception '오늘은 이미 출석했어요.'; end if;
  insert into wallets (user_id) values (uid) on conflict (user_id) do nothing;
  select * into w from wallets where user_id = uid for update;
  select nickname into nick from profiles where id = uid;
  select replace(value, '{from}', coalesce(w.equip->'from'->>id, '누군가')) into t_title from shop_items where id = w.equip->>'title' and kind = 'title';
  select value into t_tag from shop_items where id = w.equip->>'tag' and kind = 'tag';
  insert into attendance (user_id, day, nick, title, tag, comment)
  values (uid, today, coalesce(nick, '?'), t_title, t_tag, left(coalesce(trim(p_comment), ''), 60));
  d := today;
  while exists (select 1 from attendance where user_id = uid and day = d) loop streak := streak + 1; d := d - 1; end loop;
  -- 연속 1~7일째: 10 · 15 · 20 · 25 · 30 · 30 · 50 영전, 7일을 채우면 다시 1일째
  bonus := (array[10, 15, 20, 25, 30, 30, 50])[((streak - 1) % 7) + 1];
  update wallets set coins = coins + bonus, updated_at = now() where user_id = uid returning * into w;
  return json_build_object('gained', bonus, 'day', ((streak - 1) % 7) + 1, 'streak', streak, 'coins', w.coins);
end $$;

-- 사기 · 선물하기 (p_to 가 비어 있으면 나에게) · 칭호/이름표는 받는 사람에게 바로 달려요
drop function if exists public.buy_item(text);
create or replace function public.buy_item(p_id text, p_to uuid default null, p_char uuid default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); tgt uuid := coalesce(p_to, auth.uid()); it shop_items; w wallets; r wallets;
  bnick text; tnick text; cname text; st text; detail text := '';
  stats text[] := array['근력', '지력', '이성', '술력', '외모', '재력', '행운'];
begin
  if uid is null or not public.is_member() then raise exception '승인된 회원만 살 수 있어요.'; end if;
  select * into it from shop_items where id = p_id and active for update;   -- 동시에 사도 수량을 넘지 않게 잠가요
  if it.id is null then raise exception '없는 물건이에요.'; end if;
  if coalesce(it.stock, 0) > 0 and (select count(*) from wallets where p_id = any(items)) >= it.stock then raise exception '품절됐어요.'; end if;
  select nickname into tnick from profiles where id = tgt and approval = 'approved';
  if tnick is null then raise exception '받을 사람을 찾을 수 없어요.'; end if;
  select nickname into bnick from profiles where id = uid;
  insert into wallets (user_id) values (uid) on conflict (user_id) do nothing;
  insert into wallets (user_id) values (tgt) on conflict (user_id) do nothing;
  select * into w from wallets where user_id = uid for update;
  select * into r from wallets where user_id = tgt for update;
  if it.kind in ('title', 'tag') and p_id = any(r.items) then
    raise exception '%', case when tgt = uid then '이미 가지고 있어요.' else '받는 사람이 이미 가지고 있어요.' end;
  end if;
  if it.kind = 'title' and position('{from}' in it.value) > 0 and tgt = uid then raise exception '이 칭호는 선물로만 받을 수 있어요.'; end if;
  if it.kind = 'curse' and tgt = uid then raise exception '파산권은 선물로만 보낼 수 있어요.'; end if;
  if it.kind = 'curse' and r.coins >= 0 then raise exception '파산권은 영전이 마이너스인 사람에게만 보낼 수 있어요.'; end if;
  if it.needs = 'cat_full' and tgt <> uid then raise exception '이 칭호는 선물할 수 없어요.'; end if;
  if it.needs = 'cat_full' and not r.cat_full then raise exception '고양이 호감도를 가득 채워야 살 수 있어요.'; end if;
  if it.kind = 'boost' then
    select data->>'name' into cname from characters where id = p_char and owner_id = tgt;
    if not found then raise exception '스탯을 올릴 캐릭터를 골라 주세요.'; end if;
    if it.max_per is not null and r.boost_n >= it.max_per then raise exception '스탯 증가권은 한 사람당 %번까지예요.', it.max_per; end if;
  end if;
  if w.coins < it.price then raise exception '영전이 모자라요.'; end if;
  update wallets set coins = coins - it.price, updated_at = now() where user_id = uid;
  if it.kind in ('title', 'tag') then
    update wallets set items = array_append(items, p_id), equip = equip || jsonb_build_object(it.kind, p_id), updated_at = now() where user_id = tgt;
    if it.kind = 'title' and position('{from}' in it.value) > 0 then   -- 선물한 사람 닉네임 기억 (equip.from)
      update wallets set equip = equip || jsonb_build_object('from', coalesce(equip->'from', '{}'::jsonb) || jsonb_build_object(p_id, coalesce(bnick, '?'))) where user_id = tgt;
    end if;
  elsif it.kind = 'snack' then
    update wallets set snacks = snacks + 1, updated_at = now() where user_id = tgt;
  elsif it.kind = 'ticket' then
    update wallets set tickets = tickets || jsonb_build_object(p_id, coalesce((tickets->>p_id)::int, 0) + 1), updated_at = now() where user_id = tgt;
  elsif it.kind = 'boost' then
    st := stats[1 + floor(random() * array_length(stats, 1))::int];
    update wallets set boosts = boosts || jsonb_build_object(p_char::text,
        coalesce(boosts->(p_char::text), '{}'::jsonb) || jsonb_build_object(st, coalesce((boosts->(p_char::text)->>st)::int, 0) + 5)),
      boost_n = boost_n + 1, updated_at = now() where user_id = tgt;
    detail := coalesce(cname, '?') || ' · ' || st || ' +5';
  elsif it.kind = 'curse' then   -- 파산권: 50% 빚 절반 탕감 (-100 → -50) · 50% 빚 전부 탕감 (-100 → 0)
    if random() < .5 then
      update wallets set coins = coins + floor(-coins / 2.0)::int, updated_at = now() where user_id = tgt;
      detail := '빚 절반 탕감 (+' || floor(-r.coins / 2.0)::int || ')';
    else update wallets set coins = 0, updated_at = now() where user_id = tgt; detail := '빚 전부 탕감 · 0';
    end if;
  end if;
  delete from shop_log where created_at < now() - interval '3 days';   -- 3일 지난 기록 정리
  insert into shop_log (kind, buyer, buyer_nick, to_user, to_nick, item_id, item_name, price, detail)
  values (case when tgt = uid then 'buy' else 'gift' end, uid, coalesce(bnick, '?'), tgt, tnick, p_id, it.name, it.price, detail);
  select * into w from wallets where user_id = uid;
  return json_build_object('wallet', public.wallet_json(w), 'detail', detail);
end $$;

create or replace function public.equip_item(p_kind text, p_id text) returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w wallets;
begin
  if uid is null then raise exception '로그인이 필요해요.'; end if;
  if p_kind not in ('title', 'tag') then raise exception '장착할 수 없는 종류예요.'; end if;
  insert into wallets (user_id) values (uid) on conflict (user_id) do nothing;
  select * into w from wallets where user_id = uid for update;
  if p_id is not null and not (p_id = any(w.items)) then raise exception '가지고 있지 않은 물건이에요.'; end if;
  update wallets set equip = equip || jsonb_build_object(p_kind, p_id), updated_at = now() where user_id = uid returning * into w;
  return public.wallet_json(w);
end $$;

create or replace function public.use_snack() returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w wallets;
begin
  if uid is null then raise exception '로그인이 필요해요.'; end if;
  update wallets set snacks = snacks - 1, updated_at = now() where user_id = uid and snacks > 0 returning * into w;
  if w.user_id is null then raise exception '츄르가 없어요. 상점에서 살 수 있어요.'; end if;
  return public.wallet_json(w);
end $$;
-- 고양이 쓰다듬기: p_up = true → +1 (하루 +5까지, 날이 바뀌어도 호감도는 그대로 쌓여요)
--                  p_up = false → 삐짐 -2 (하루 한 번만)
-- 25 · 50 · 75 에 처음 닿으면 영전 10~50 선물 (단계마다 평생 한 번) · 100 이면 cat_full → '집사' 칭호 공개
-- 영전 · 호감도는 이 함수 안에서만 계산해요 → 사이트 코드를 고쳐서 불러도 하루 +5 를 못 넘어요
create or replace function public.cat_pet(p_up boolean) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); today date := (now() at time zone 'Asia/Seoul')::date; w wallets;
  gain int; gift int := 0; th int; unlocked boolean := false; changed int := 0;
begin
  if uid is null or not public.is_member() then raise exception '승인된 회원만 할 수 있어요.'; end if;
  insert into wallets (user_id) values (uid) on conflict (user_id) do nothing;
  select * into w from wallets where user_id = uid for update;
  gain := case when w.aff_day = today then w.aff_gain else 0 end;
  if p_up then
    if gain < 5 and w.aff < 100 then
      w.aff := w.aff + 1; changed := 1;
      foreach th in array array[25, 50, 75] loop
        if w.aff >= th and not (th = any(w.aff_gifts)) then
          w.aff_gifts := array_append(w.aff_gifts, th); gift := gift + 10 + floor(random() * 41)::int;
        end if;
      end loop;
      if w.aff >= 100 and not w.cat_full then unlocked := true; end if;
      update wallets set aff = w.aff, aff_day = today, aff_gain = gain + 1, aff_gifts = w.aff_gifts,
        cat_full = cat_full or unlocked, coins = coins + gift, updated_at = now() where user_id = uid returning * into w;
    end if;
  elsif w.aff_drop is distinct from today and w.aff > 0 then
    changed := -least(2, w.aff);
    update wallets set aff = aff + changed, aff_drop = today, updated_at = now() where user_id = uid returning * into w;
  end if;
  return json_build_object('wallet', public.wallet_json(w), 'gift', gift, 'unlocked', unlocked, 'changed', changed);
end $$;

-- 미니 게임 · 모아팡 (로비 전광판 → pang.html): 하루 한 판
--   걸 수 있는 영전 50 ~ 1000 · 난이도는 직접 골라요 (보통 · 매우 어려움 · 지옥 · 극악 — 목표 점수와 시간만 달라요)
--   배율은 시작할 때 서버가 몰래 뽑아요: ×1.5 70% · ×2 20% · ×4 5% · ×6 3% · ×10 2%
--   이기면 걸은 영전 × 배율을 받아요 (걸은 영전 포함 · 순이익 = 걸은 영전 × (배율 - 1))
--   지면 걸은 영전 × 같은 배율만큼 잃어요 (마이너스가 될 수도 있어요)
--   점수는 서버가 직접 계산해요: 브라우저는 '움직인 기록'만 보내고, 서버 함수 pang-finish 가 판 시드로 다시 돌려서 정산해요
--   끝내지 않고 나가면 6분 뒤 패배로 정산
--   판 기록은 그날만 남겨요: 날이 바뀌면 정산이 끝난 판은 지워져요 (하루 한 판 확인에는 오늘 기록만 필요해요)
create table if not exists public.pang_plays (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  bet        int  not null,
  started_at timestamptz not null default now(),
  done       boolean not null default false,
  score      int,
  win        boolean,
  delta      int,
  primary key (user_id, day)
);
alter table public.pang_plays add column if not exists target int not null default 3700;    -- 목표 점수
alter table public.pang_plays add column if not exists secs   int not null default 60;      -- 제한 시간(초)
alter table public.pang_plays add column if not exists level  text not null default 'normal';
alter table public.pang_plays add column if not exists glass  boolean not null default false; -- 모래시계가 떨어지는 난이도
alter table public.pang_plays add column if not exists seed   bigint not null default 0;    -- 판 배치 · 새로 떨어지는 캐릭터를 정하는 비밀 숫자
alter table public.pang_plays add column if not exists roll   numeric(4,1) not null default 1.5; -- 몰래 뽑은 배율
alter table public.pang_plays add column if not exists mult   numeric(4,1);
alter table public.pang_plays alter column mult type numeric(4,1) using mult::numeric;
do $$ begin   -- 예전 표에 남은 칸 정리 (있을 때만)
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pang_plays' and column_name = 'win_mult') then
    alter table public.pang_plays alter column win_mult drop not null, alter column lose_mult drop not null; end if;
end $$;
alter table public.pang_plays drop constraint if exists pang_plays_bet_check;
alter table public.pang_plays add constraint pang_plays_bet_check check (bet between 50 and 1000);
alter table public.pang_plays enable row level security;
revoke all on public.pang_plays from anon, authenticated;   -- 시드 · 배율이 보이면 안 되니 함수로만 읽어요
drop function if exists public.pang_tier(int);
-- 난이도 (site/assets/js/store.js 의 PANG_LEVELS 와 같은 표)
create or replace function public.pang_level(p_level text, out target int, out secs int, out glass boolean) language sql immutable as $$
  select case p_level when 'hard' then 4000 when 'hell' then 4000 when 'extreme' then 4400 else 3700 end,
         case p_level when 'hard' then 45 when 'hell' then 30 when 'extreme' then 25 else 60 end,
         p_level in ('hell', 'extreme');
$$;

create or replace function public.pang_settle(p_user uuid, p_day date, p_score int) returns json
language plpgsql security definer set search_path = public as $$
declare g pang_plays; w wallets; d int; won boolean;
begin
  select * into g from pang_plays where user_id = p_user and day = p_day for update;
  if g.done then raise exception '이미 정산된 게임이에요.'; end if;
  won := p_score >= g.target;
  -- 이기면 걸은 영전 × 배율을 받아요 (걸은 영전 포함) · 지면 걸은 영전 × 배율을 잃어요
  d := case when won then floor(g.bet * g.roll)::int - g.bet else -floor(g.bet * g.roll)::int end;
  insert into wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  update wallets set coins = coins + d, updated_at = now() where user_id = p_user returning * into w;
  update pang_plays set done = true, score = p_score, win = won, mult = g.roll, delta = d where user_id = p_user and day = p_day;
  return json_build_object('win', won, 'mult', g.roll, 'delta', d, 'coins', w.coins, 'score', p_score, 'target', g.target);
end $$;
revoke all on function public.pang_settle(uuid, date, int) from public, anon, authenticated;
grant execute on function public.pang_settle(uuid, date, int) to service_role;   -- 서버 함수 pang-finish 만 불러요

create or replace function public.pang_status() returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); today date := (now() at time zone 'Asia/Seoul')::date; g pang_plays;
begin
  if uid is null then return json_build_object('played', false); end if;
  -- 도중에 나간 판(자정을 넘긴 판 포함)은 패배로 정산
  for g in select * from pang_plays where user_id = uid and not done and now() - started_at > interval '6 minutes' loop
    perform public.pang_settle(uid, g.day, 0);
  end loop;
  delete from pang_plays where day < today and done;   -- 판 기록은 하루만 (정산 끝난 어제 판은 지워요)
  select * into g from pang_plays where user_id = uid and day = today;
  if g.user_id is null then return json_build_object('played', false); end if;
  return json_build_object('played', true, 'done', g.done, 'win', g.win, 'mult', g.mult, 'delta', g.delta, 'bet', g.bet, 'score', g.score, 'target', g.target, 'level', g.level, 'started_at', g.started_at);
end $$;

drop function if exists public.pang_start(int);
create or replace function public.pang_start(p_bet int, p_level text) returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); today date := (now() at time zone 'Asia/Seoul')::date; c int; r float; m numeric; t record; sd bigint;
begin
  if uid is null or not public.is_member() then raise exception '승인된 회원만 할 수 있어요.'; end if;
  if p_bet is null or p_bet < 50 or p_bet > 1000 then raise exception '영전은 50 ~ 1000 사이로 걸 수 있어요.'; end if;
  if p_level not in ('normal', 'hard', 'hell', 'extreme') then raise exception '난이도를 골라 주세요.'; end if;
  if exists (select 1 from pang_plays where user_id = uid and day = today) then raise exception '오늘은 이미 한 판 했어요. 내일 다시 와요.'; end if;
  select coins into c from wallets where user_id = uid;
  if coalesce(c, 0) < p_bet then raise exception '영전이 모자라요.'; end if;
  r := random() * 100; m := case when r < 70 then 1.5 when r < 90 then 2 when r < 95 then 4 when r < 98 then 6 else 10 end;
  sd := floor(random() * 2147483647)::bigint;
  delete from pang_plays where day < today and done;   -- 판 기록은 하루만 (정산 끝난 어제 판은 지워요)
  select * into t from public.pang_level(p_level);
  insert into pang_plays (user_id, day, bet, level, target, secs, glass, seed, roll) values (uid, today, p_bet, p_level, t.target, t.secs, t.glass, sd, m);
  -- 시드는 판을 그리려고 알려 줘요 (배율은 안 알려 줘요) · 점수는 서버가 이 시드로 다시 계산해요
  return json_build_object('secs', t.secs, 'target', t.target, 'glass', t.glass, 'seed', sd);
end $$;

-- 예전 방식(브라우저가 점수를 보내던 것)은 막아요 — 정산은 서버 함수 pang-finish 로만
drop function if exists public.pang_finish(int);
-- 관리자: 영전 지급 (음수면 회수 · 회수는 0 아래로 안 내려가요 · 빚이 있는 회원에게 지급하면 빚에서 그만큼 빠져요) · 상점 기록에 '지급'으로 남아요
create or replace function public.admin_give_coins(p_user uuid, p_amount int, p_note text default '') returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w wallets; anick text; tnick text;
begin
  if not public.is_admin() then raise exception '관리자만 할 수 있어요.'; end if;
  if coalesce(p_amount, 0) = 0 then raise exception '지급할 영전을 적어 주세요.'; end if;
  select nickname into tnick from profiles where id = p_user;
  if tnick is null then raise exception '회원을 찾을 수 없어요.'; end if;
  select nickname into anick from profiles where id = uid;
  insert into wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  update wallets set coins = case when p_amount > 0 then coins + p_amount else least(coins, greatest(0, coins + p_amount)) end, updated_at = now() where user_id = p_user returning * into w;
  delete from shop_log where created_at < now() - interval '3 days';
  insert into shop_log (kind, buyer, buyer_nick, to_user, to_nick, item_id, item_name, price, detail)
  values ('admin', uid, coalesce(anick, '?'), p_user, tnick, 'coins', case when p_amount > 0 then '영전 지급' else '영전 회수' end, p_amount, left(coalesce(p_note, ''), 60));
  return public.wallet_json(w);
end $$;
revoke all on function public.check_in(text), public.buy_item(text, uuid, uuid), public.equip_item(text, text), public.use_snack(), public.admin_give_coins(uuid, int, text) from anon, public;
grant execute on function public.check_in(text), public.buy_item(text, uuid, uuid), public.equip_item(text, text), public.use_snack(), public.admin_give_coins(uuid, int, text) to authenticated;

-- ── 보안 보강 (2026-10 점검) ─────────────────────────────────────
-- 글쓴이 이름(author)은 브라우저가 보낸 값 대신 언제나 주인의 닉네임으로 (다른 사람 · 관리자 사칭 막기)
create or replace function public.set_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare nick text;
begin
  if tg_op = 'UPDATE' and new.author is not distinct from old.author and new.owner_id is not distinct from old.owner_id then return new; end if;
  select nickname into nick from profiles where id = new.owner_id;
  new.author := coalesce(nick, new.author, '?');
  return new;
end $$;
drop trigger if exists characters_author on public.characters;
create trigger characters_author before insert or update on public.characters for each row execute function public.set_author();
drop trigger if exists notes_author on public.notes;
create trigger notes_author before insert or update on public.notes for each row execute function public.set_author();
drop trigger if exists links_author on public.links;
create trigger links_author before insert on public.links for each row execute function public.set_author();
drop trigger if exists npcs_author on public.npcs;
create trigger npcs_author before insert or update on public.npcs for each row execute function public.set_author();
-- 프로필 글자 수 제한 (아주 긴 닉네임으로 화면을 깨뜨리지 못하게 · 이미 있는 값은 검사하지 않아요)
alter table public.profiles drop constraint if exists profiles_len;
alter table public.profiles add constraint profiles_len check (char_length(nickname) between 1 and 20 and char_length(coalesce(title, '')) <= 40
  and char_length(coalesce(role, '')) <= 20 and char_length(coalesce(seal, '')) <= 20) not valid;

-- ── 캐릭터를 지우면 남은 흔적도 같이 정리 (관리자가 지울 때 · 회원 탈퇴로 캐릭터가 같이 지워질 때 모두) ──
--   다른 캐릭터의 연관 캐릭터 목록에서 빼고 · 소지품의 '선물한 · 관련 캐릭터'를 비우고 · 지갑의 그 캐릭터 스탯 증가 기록을 지워요
--   (쪽지 · NPC 의 연결은 표 설정(on delete set null)으로 이미 비워지고, 받은 심박은 그대로 남아요)
create or replace function public.strip_char_ref(j jsonb, k text) returns jsonb language sql immutable as $$
  select case when j is null then null else
    jsonb_set(jsonb_set(j, '{related}', coalesce((select jsonb_agg(e) from jsonb_array_elements(case when jsonb_typeof(j->'related') = 'array' then j->'related' else '[]'::jsonb end) e where e->>'id' is distinct from k), '[]'::jsonb)),
      '{items}', coalesce((select jsonb_agg(case when e->>'rel' = k then jsonb_set(e, '{rel}', '""') else e end) from jsonb_array_elements(case when jsonb_typeof(j->'items') = 'array' then j->'items' else '[]'::jsonb end) e), '[]'::jsonb)) end;
$$;
create or replace function public.cleanup_character() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text := old.id::text;
begin
  update characters set data = public.strip_char_ref(data, k), draft = public.strip_char_ref(draft, k)
    where id <> old.id and (position(k in data::text) > 0 or position(k in coalesce(draft::text, '')) > 0);
  update wallets set boosts = boosts - k where boosts ? k;
  return old;
end $$;
drop trigger if exists characters_cleanup on public.characters;
create trigger characters_cleanup after delete on public.characters for each row execute function public.cleanup_character();

-- ================================================================
--  첫 관리자 지정 — 본인이 먼저 가입한 뒤, 아래 이메일을 바꿔서 이 한 줄만 실행
-- ================================================================
-- (사이트 입장 화면에서 가입 신청한 뒤, '내아이디' 를 본인 아이디로 바꿔서 실행 → 관리자 + 가입 승인)
-- update public.profiles set grade = 'admin', approval = 'approved' where id = (select id from public.accounts where username = '내아이디');
