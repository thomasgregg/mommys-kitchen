create type public.tenant_status as enum ('active', 'suspended');
create type public.tenant_role as enum ('owner', 'admin', 'customer');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status public.tenant_status not null default 'active',
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.tenant_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, user_id)
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  currency_code text not null default 'EUR' check (currency_code ~ '^[A-Z]{3}$'),
  language_code text not null default 'de' check (language_code ~ '^[a-z]{2}$'),
  locale_identifier text not null default 'de-DE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index idx_tenants_default_singleton
on public.tenants (is_default)
where is_default = true;

create index idx_tenant_memberships_user_id on public.tenant_memberships(user_id);
create index idx_tenant_memberships_tenant_role on public.tenant_memberships(tenant_id, role);

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger tenant_memberships_set_updated_at
before update on public.tenant_memberships
for each row execute function public.set_updated_at();

create trigger tenant_settings_set_updated_at
before update on public.tenant_settings
for each row execute function public.set_updated_at();

insert into public.tenants (slug, name, status, is_default)
values ('mommys-kitchen', 'Mommy''s Kitchen', 'active', true)
on conflict (slug) do update
set
  name = excluded.name,
  status = excluded.status,
  is_default = excluded.is_default;

create or replace function public.get_default_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select id from public.tenants where is_default = true order by created_at asc limit 1),
    (select id from public.tenants order by created_at asc limit 1)
  );
$$;

alter table public.profiles
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.device_tokens
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.menu_categories
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.menu_items
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.orders
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.order_items
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.order_status_history
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.notifications
add column if not exists tenant_id uuid references public.tenants(id);

update public.profiles
set tenant_id = public.get_default_tenant_id()
where tenant_id is null;

update public.device_tokens
set tenant_id = coalesce(
  device_tokens.tenant_id,
  (select p.tenant_id from public.profiles p where p.id = device_tokens.user_id),
  public.get_default_tenant_id()
)
where tenant_id is null;

update public.menu_categories
set tenant_id = public.get_default_tenant_id()
where tenant_id is null;

update public.menu_items
set tenant_id = coalesce(
  menu_items.tenant_id,
  (select mc.tenant_id from public.menu_categories mc where mc.id = menu_items.category_id),
  public.get_default_tenant_id()
)
where tenant_id is null;

update public.orders
set tenant_id = coalesce(
  orders.tenant_id,
  (select p.tenant_id from public.profiles p where p.id = orders.user_id),
  public.get_default_tenant_id()
)
where tenant_id is null;

update public.order_items
set tenant_id = coalesce(
  order_items.tenant_id,
  (select o.tenant_id from public.orders o where o.id = order_items.order_id),
  public.get_default_tenant_id()
)
where tenant_id is null;

update public.order_status_history
set tenant_id = coalesce(
  order_status_history.tenant_id,
  (select o.tenant_id from public.orders o where o.id = order_status_history.order_id),
  public.get_default_tenant_id()
)
where tenant_id is null;

update public.notifications
set tenant_id = coalesce(
  notifications.tenant_id,
  (select o.tenant_id from public.orders o where o.id = notifications.order_id),
  (select p.tenant_id from public.profiles p where p.id = notifications.user_id),
  public.get_default_tenant_id()
)
where tenant_id is null;

alter table public.profiles
alter column tenant_id set default public.get_default_tenant_id(),
alter column tenant_id set not null;

alter table public.device_tokens
alter column tenant_id set default public.get_default_tenant_id(),
alter column tenant_id set not null;

alter table public.menu_categories
alter column tenant_id set default public.get_default_tenant_id(),
alter column tenant_id set not null;

alter table public.menu_items
alter column tenant_id set default public.get_default_tenant_id(),
alter column tenant_id set not null;

alter table public.orders
alter column tenant_id set default public.get_default_tenant_id(),
alter column tenant_id set not null;

alter table public.order_items
alter column tenant_id set default public.get_default_tenant_id(),
alter column tenant_id set not null;

alter table public.order_status_history
alter column tenant_id set default public.get_default_tenant_id(),
alter column tenant_id set not null;

alter table public.notifications
alter column tenant_id set default public.get_default_tenant_id(),
alter column tenant_id set not null;

alter table public.menu_categories
drop constraint if exists menu_categories_name_key;

alter table public.menu_items
drop constraint if exists menu_items_name_key;

alter table public.menu_categories
add constraint menu_categories_tenant_id_name_key unique (tenant_id, name);

alter table public.menu_items
add constraint menu_items_tenant_id_name_key unique (tenant_id, name);

drop index if exists public.idx_menu_categories_sort_order;
create index idx_menu_categories_tenant_sort_order
on public.menu_categories(tenant_id, sort_order)
where is_active = true;

drop index if exists public.idx_menu_items_category_id;
create index idx_menu_items_tenant_category_id
on public.menu_items(tenant_id, category_id);

drop index if exists public.idx_menu_items_available;
create index idx_menu_items_tenant_available
on public.menu_items(tenant_id, is_available)
where is_available = true;

drop index if exists public.idx_orders_user_id_created_at;
create index idx_orders_tenant_user_created_at
on public.orders(tenant_id, user_id, created_at desc);

drop index if exists public.idx_orders_status_created_at;
create index idx_orders_tenant_status_created_at
on public.orders(tenant_id, status, created_at desc);

drop index if exists public.idx_order_items_order_id;
create index idx_order_items_tenant_order_id
on public.order_items(tenant_id, order_id);

drop index if exists public.idx_order_status_history_order_id_created_at;
create index idx_order_status_history_tenant_order_created_at
on public.order_status_history(tenant_id, order_id, created_at desc);

drop index if exists public.idx_notifications_user_id_created_at;
create index idx_notifications_tenant_user_created_at
on public.notifications(tenant_id, user_id, created_at desc);

drop index if exists public.idx_notifications_order_id_created_at;
create index idx_notifications_tenant_order_created_at
on public.notifications(tenant_id, order_id, created_at desc);

insert into public.tenant_memberships (tenant_id, user_id, role)
select
  p.tenant_id,
  p.id,
  case
    when p.role = 'admin' then 'admin'::public.tenant_role
    else 'customer'::public.tenant_role
  end
from public.profiles p
on conflict (tenant_id, user_id) do update
set role = excluded.role;

insert into public.tenant_settings (
  tenant_id,
  currency_code,
  language_code,
  locale_identifier
)
select
  public.get_default_tenant_id(),
  a.currency_code,
  a.language_code,
  a.locale_identifier
from public.app_settings a
where a.singleton_key = 'global'
on conflict (tenant_id) do update
set
  currency_code = excluded.currency_code,
  language_code = excluded.language_code,
  locale_identifier = excluded.locale_identifier;

create or replace function public.sync_tenant_membership_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_memberships (tenant_id, user_id, role)
  values (
    coalesce(new.tenant_id, public.get_default_tenant_id()),
    new.id,
    case
      when new.role = 'admin' then 'admin'::public.tenant_role
      else 'customer'::public.tenant_role
    end
  )
  on conflict (tenant_id, user_id) do update
  set role = excluded.role;

  return new;
end;
$$;

drop trigger if exists profiles_sync_tenant_membership on public.profiles;
create trigger profiles_sync_tenant_membership
after insert or update of tenant_id, role on public.profiles
for each row execute function public.sync_tenant_membership_from_profile();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.get_default_tenant_id();
begin
  insert into public.profiles (id, tenant_id, full_name, phone)
  values (
    new.id,
    v_tenant_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on table public.tenants from anon;
revoke all on table public.tenant_memberships from anon;
revoke all on table public.tenant_settings from anon;

grant select on table public.tenants to authenticated;
grant select on table public.tenant_memberships to authenticated;
grant select on table public.tenant_settings to authenticated;
grant insert, update on table public.tenant_settings to authenticated;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_settings enable row level security;

create policy "tenants_members_can_read"
on public.tenants
for select
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = tenants.id
      and tm.user_id = auth.uid()
  )
  or public.is_admin()
);

create policy "tenant_memberships_read_own_or_admin"
on public.tenant_memberships
for select
using (user_id = auth.uid() or public.is_admin());

create policy "tenant_settings_members_can_read"
on public.tenant_settings
for select
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = tenant_settings.tenant_id
      and tm.user_id = auth.uid()
  )
);

create policy "tenant_settings_admin_manage"
on public.tenant_settings
for all
using (public.is_admin())
with check (public.is_admin());
