create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (char_length(username::text) between 3 and 24),
  created_at timestamptz not null default now()
);

create table if not exists public.app_counters (
  key text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.app_counters (key, value)
values ('public_total', 0)
on conflict (key) do nothing;

create table if not exists public.user_scores (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  presses bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists user_scores_rank_idx on public.user_scores (presses desc, updated_at asc);

create table if not exists public.rate_limits (
  identifier_hash text primary key,
  last_pressed_at timestamptz not null
);
create index if not exists rate_limits_last_pressed_idx on public.rate_limits (last_pressed_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_counters_touch_updated_at on public.app_counters;
create trigger app_counters_touch_updated_at
before update on public.app_counters
for each row execute function public.touch_updated_at();

drop trigger if exists user_scores_touch_updated_at on public.user_scores;
create trigger user_scores_touch_updated_at
before update on public.user_scores
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  clean_name text;
  candidate text;
  tries int := 0;
begin
  base_name := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if base_name is null then
    base_name := 'lizard_' || substr(new.id::text, 1, 8);
  end if;

  clean_name := regexp_replace(base_name, '[^a-zA-Z0-9_]+', '_', 'g');
  clean_name := lower(clean_name);
  if char_length(clean_name) < 3 then
    clean_name := 'lizard_' || substr(new.id::text, 1, 8);
  end if;

  loop
    candidate := left(clean_name, 24);
    begin
      insert into public.profiles (id, username)
      values (new.id, candidate);
      exit;
    exception when unique_violation then
      tries := tries + 1;
      clean_name := left(clean_name, 18) || '_' || substr(extensions.gen_random_uuid()::text, 1, 5);
      if tries > 8 then
        raise exception 'unable to generate unique username';
      end if;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.press_lizard(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res jsonb;
begin
  execute 'select public.press_lizard_batch($1, $2)'
  into v_res
  using p_identifier, 1;

  return v_res;
end;
$$;

create or replace function public.press_lizard_batch(p_identifier text, p_count int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_effective_identifier text;
  v_count int;
  v_public_total bigint;
  v_user_total bigint;
begin
  v_count := coalesce(p_count, 0);
  if v_count < 1 or v_count > 50 then
    return jsonb_build_object('ok', false, 'error', 'Invalid press batch size.');
  end if;

  if auth.uid() is not null then
    v_effective_identifier := 'user:' || auth.uid()::text;
  else
    if p_identifier is null
      or char_length(trim(p_identifier)) < 12
      or char_length(trim(p_identifier)) > 128
      or p_identifier !~ '^guest:[A-Za-z0-9_-]+$' then
      return jsonb_build_object('ok', false, 'error', 'Invalid guest press identifier.');
    end if;
    v_effective_identifier := p_identifier;
  end if;

  update public.app_counters
  set value = value + v_count
  where key = 'public_total'
  returning value into v_public_total;

  if auth.uid() is not null then
    insert into public.user_scores (user_id, presses)
    values (auth.uid(), v_count)
    on conflict (user_id)
    do update set presses = public.user_scores.presses + v_count
    returning presses into v_user_total;
  end if;

  return jsonb_build_object(
    'ok', true,
    'public_total', coalesce(v_public_total, 0),
    'user_total', coalesce(v_user_total, 0)
  );
end;
$$;

create or replace function public.get_leaderboard(p_limit int default 10)
returns table (
  user_id uuid,
  username text,
  presses bigint
)
language sql
security definer
set search_path = public
as $$
  select
    s.user_id,
    p.username::text,
    s.presses
  from public.user_scores s
  join public.profiles p on p.id = s.user_id
  order by s.presses desc, p.created_at asc
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

alter table public.profiles enable row level security;
alter table public.app_counters enable row level security;
alter table public.user_scores enable row level security;
alter table public.rate_limits enable row level security;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read
on public.profiles for select
using (true);

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists app_counters_public_read on public.app_counters;
create policy app_counters_public_read
on public.app_counters for select
using (true);

drop policy if exists user_scores_public_read on public.user_scores;
create policy user_scores_public_read
on public.user_scores for select
using (true);

revoke all on public.rate_limits from anon, authenticated;
revoke insert, update, delete on public.app_counters from anon, authenticated;
revoke insert, update, delete on public.user_scores from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.app_counters, public.user_scores to anon, authenticated;
grant execute on function public.press_lizard(text) to anon, authenticated;
grant execute on function public.press_lizard_batch(text, int) to anon, authenticated;
grant execute on function public.get_leaderboard(int) to anon, authenticated;
