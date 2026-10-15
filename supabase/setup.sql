-- Backup automatico app Allenamento: da incollare in Supabase > SQL Editor > Run
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sync_state (
  sync_id uuid primary key,
  secret_hash text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.sync_history (
  id bigint generated always as identity primary key,
  sync_id uuid not null references public.sync_state(sync_id) on delete cascade,
  day date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (sync_id, day)
);
alter table public.sync_state enable row level security;
alter table public.sync_history enable row level security;
revoke all on public.sync_state, public.sync_history from anon, authenticated;

create or replace function public.save_state(p_id uuid, p_secret text, p_data jsonb)
returns timestamptz language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_now timestamptz := now();
begin
  if length(p_secret) < 24 then raise exception 'secret too short'; end if;
  if pg_column_size(p_data) > 5000000 then raise exception 'payload too large'; end if;
  select secret_hash into v_hash from sync_state where sync_id = p_id;
  if v_hash is null then
    insert into sync_state(sync_id, secret_hash, data, updated_at) values (p_id, crypt(p_secret, gen_salt('bf')), p_data, v_now);
  elsif v_hash = crypt(p_secret, v_hash) then
    update sync_state set data = p_data, updated_at = v_now where sync_id = p_id;
  else
    raise exception 'unauthorized';
  end if;
  insert into sync_history(sync_id, day, data) values (p_id, current_date, p_data)
  on conflict (sync_id, day) do update set data = excluded.data, created_at = v_now;
  delete from sync_history where sync_id = p_id and id not in (select id from sync_history where sync_id = p_id order by day desc limit 60);
  return v_now;
end $$;

create or replace function public.load_state(p_id uuid, p_secret text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r record;
begin
  select * into r from sync_state where sync_id = p_id;
  if r is null or r.secret_hash <> crypt(p_secret, r.secret_hash) then raise exception 'not found'; end if;
  return jsonb_build_object('updated_at', r.updated_at, 'data', r.data);
end $$;

revoke all on function public.save_state(uuid, text, jsonb) from public;
revoke all on function public.load_state(uuid, text) from public;
grant execute on function public.save_state(uuid, text, jsonb) to anon;
grant execute on function public.load_state(uuid, text) to anon;
