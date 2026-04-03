create or replace function public.current_profile_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_tenant_role(p_tenant_id uuid)
returns public.tenant_role
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.tenant_memberships tm
  where tm.tenant_id = p_tenant_id
    and tm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_tenant_role(p_tenant_id) in ('owner', 'admin'), false);
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      case
        when public.current_tenant_role(public.current_profile_tenant_id()) in ('owner', 'admin') then 'admin'::public.app_role
        else 'customer'::public.app_role
      end
    ),
    coalesce(
      (select role from public.profiles where id = auth.uid()),
      'customer'::public.app_role
    )
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin'::public.app_role;
$$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "device_tokens_own_read" on public.device_tokens;
drop policy if exists "device_tokens_own_insert" on public.device_tokens;
drop policy if exists "device_tokens_own_update" on public.device_tokens;
drop policy if exists "device_tokens_own_delete" on public.device_tokens;
drop policy if exists "menu_categories_authenticated_read" on public.menu_categories;
drop policy if exists "menu_categories_admin_manage" on public.menu_categories;
drop policy if exists "menu_items_authenticated_read" on public.menu_items;
drop policy if exists "menu_items_admin_manage" on public.menu_items;
drop policy if exists "orders_customer_read_own" on public.orders;
drop policy if exists "orders_admin_read_all" on public.orders;
drop policy if exists "order_items_customer_read_own" on public.order_items;
drop policy if exists "order_items_admin_read_all" on public.order_items;
drop policy if exists "order_status_history_customer_read_own" on public.order_status_history;
drop policy if exists "order_status_history_admin_read_all" on public.order_status_history;
drop policy if exists "notifications_customer_read_own" on public.notifications;
drop policy if exists "notifications_admin_read_all" on public.notifications;

create policy "profiles_select_same_tenant"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_tenant_admin(tenant_id)
);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id and tenant_id = public.current_profile_tenant_id());

create policy "device_tokens_own_read"
on public.device_tokens
for select
using (
  auth.uid() = user_id
  and tenant_id = public.current_profile_tenant_id()
);

create policy "device_tokens_own_insert"
on public.device_tokens
for insert
with check (
  auth.uid() = user_id
  and tenant_id = public.current_profile_tenant_id()
);

create policy "device_tokens_own_update"
on public.device_tokens
for update
using (
  auth.uid() = user_id
  and tenant_id = public.current_profile_tenant_id()
)
with check (
  auth.uid() = user_id
  and tenant_id = public.current_profile_tenant_id()
);

create policy "device_tokens_own_delete"
on public.device_tokens
for delete
using (
  auth.uid() = user_id
  and tenant_id = public.current_profile_tenant_id()
);

create policy "menu_categories_tenant_read"
on public.menu_categories
for select
using (
  auth.role() = 'authenticated'
  and tenant_id = public.current_profile_tenant_id()
);

create policy "menu_categories_tenant_admin_manage"
on public.menu_categories
for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "menu_items_tenant_read"
on public.menu_items
for select
using (
  auth.role() = 'authenticated'
  and tenant_id = public.current_profile_tenant_id()
);

create policy "menu_items_tenant_admin_manage"
on public.menu_items
for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "orders_customer_read_own"
on public.orders
for select
using (
  auth.uid() = user_id
  and tenant_id = public.current_profile_tenant_id()
);

create policy "orders_tenant_admin_read_all"
on public.orders
for select
using (public.is_tenant_admin(tenant_id));

create policy "order_items_customer_read_own"
on public.order_items
for select
using (
  tenant_id = public.current_profile_tenant_id()
  and exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.tenant_id = order_items.tenant_id
      and o.user_id = auth.uid()
  )
);

create policy "order_items_tenant_admin_read_all"
on public.order_items
for select
using (public.is_tenant_admin(tenant_id));

create policy "order_status_history_customer_read_own"
on public.order_status_history
for select
using (
  tenant_id = public.current_profile_tenant_id()
  and exists (
    select 1
    from public.orders o
    where o.id = order_status_history.order_id
      and o.tenant_id = order_status_history.tenant_id
      and o.user_id = auth.uid()
  )
);

create policy "order_status_history_tenant_admin_read_all"
on public.order_status_history
for select
using (public.is_tenant_admin(tenant_id));

create policy "notifications_customer_read_own"
on public.notifications
for select
using (
  auth.uid() = user_id
  and tenant_id = public.current_profile_tenant_id()
);

create policy "notifications_tenant_admin_read_all"
on public.notifications
for select
using (public.is_tenant_admin(tenant_id));
