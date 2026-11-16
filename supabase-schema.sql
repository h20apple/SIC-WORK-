-- SIC Sheet: run once in Supabase Dashboard > SQL Editor.
-- WARNING: Review and test these policies before using real workplace data.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'operator' check (role in ('operator','charge_hand','manager')),
  active boolean not null default true
);
create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  sheet_date text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_fields check (
    (status = 'draft' and approved_by is null and approved_at is null)
    or (status = 'approved' and approved_by is not null and approved_at is not null)
  )
);
create index if not exists sheets_owner_idx on public.sheets(owner_id);
create index if not exists sheets_date_idx on public.sheets(sheet_date);
alter table public.profiles enable row level security;
alter table public.sheets enable row level security;

-- SECURITY DEFINER helpers avoid recursive RLS on profiles.
create or replace function public.sic_role()
returns text language sql stable security definer
set search_path = '' as $$
 select p.role from public.profiles p
 where p.id = (select auth.uid()) and p.active = true
 limit 1
$$;
revoke all on function public.sic_role() from public;
grant execute on function public.sic_role() to authenticated;

create or replace function public.sic_active()
returns boolean language sql stable security definer
set search_path = '' as $$
 select exists(select 1 from public.profiles p
 where p.id = (select auth.uid()) and p.active = true)
$$;
revoke all on function public.sic_active() from public;
grant execute on function public.sic_active() to authenticated;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.sic_role() = 'manager');
-- Profile creation/role changes: ONLY via Supabase Dashboard / trusted admin.
-- No client INSERT/UPDATE/DELETE policies on profiles.

drop policy if exists "sheets read" on public.sheets;
create policy "sheets read" on public.sheets for select to authenticated
using (public.sic_active() and (owner_id = (select auth.uid()) or public.sic_role() in ('charge_hand','manager')));

drop policy if exists "sheets insert" on public.sheets;
create policy "sheets insert" on public.sheets for insert to authenticated
with check (public.sic_active() and owner_id = (select auth.uid())
  and status = 'draft' and approved_by is null and approved_at is null);

-- Updates need a trigger to protect immutable owner and approval metadata,
-- because RLS WITH CHECK alone cannot compare OLD and NEW rows.
create or replace function public.sic_guard_sheet_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare current_role text := public.sic_role();
begin
  if new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at then
    raise exception 'Cannot change owner or creation date';
  end if;
  if current_role <> 'manager' then
    if old.status <> 'draft' or new.status <> 'draft'
       or new.approved_by is not null or new.approved_at is not null then
      raise exception 'Only managers can approve or reopen';
    end if;
  else
    if new.status = 'approved' and old.status = 'draft' then
      new.approved_by := auth.uid();
      new.approved_at := now();
    elsif new.status = 'draft' and old.status = 'approved' then
      new.approved_by := null;
      new.approved_at := null;
    elsif new.status = old.status and
      (new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at) then
      raise exception 'Approval metadata is protected';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists sic_guard_sheet_update_trigger on public.sheets;
create trigger sic_guard_sheet_update_trigger before update on public.sheets
for each row execute function public.sic_guard_sheet_update();

drop policy if exists "sheets update" on public.sheets;
create policy "sheets update" on public.sheets for update to authenticated
using (public.sic_active() and (
  public.sic_role() = 'manager' or
  (status = 'draft' and (owner_id = (select auth.uid()) or public.sic_role() = 'charge_hand'))
))
with check (public.sic_active() and (
  public.sic_role() = 'manager' or
  (status = 'draft' and (owner_id = (select auth.uid()) or public.sic_role() = 'charge_hand'))
));
-- No DELETE policy: retain records unless an administrator handles retention.

-- Optional: enable realtime for sheet changes in Database > Publications.
-- If enabled, subscribers must also satisfy SELECT RLS.
