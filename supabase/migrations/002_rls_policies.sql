alter table public.profiles enable row level security;
alter table public.device_tokens enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "device_tokens_own_read"
on public.device_tokens
for select
using (auth.uid() = user_id);

create policy "device_tokens_own_insert"
on public.device_tokens
for insert
with check (auth.uid() = user_id);

create policy "device_tokens_own_update"
on public.device_tokens
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "device_tokens_own_delete"
on public.device_tokens
for delete
using (auth.uid() = user_id);

create policy "menu_categories_authenticated_read"
on public.menu_categories
for select
using (auth.role() = 'authenticated');

create policy "menu_categories_admin_manage"
on public.menu_categories
for all
using (public.is_admin())
with check (public.is_admin());

create policy "menu_items_authenticated_read"
on public.menu_items
for select
using (auth.role() = 'authenticated');

create policy "menu_items_admin_manage"
on public.menu_items
for all
using (public.is_admin())
with check (public.is_admin());

create policy "orders_customer_read_own"
on public.orders
for select
using (auth.uid() = user_id);

create policy "orders_admin_read_all"
on public.orders
for select
using (public.is_admin());

create policy "order_items_customer_read_own"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

create policy "order_items_admin_read_all"
on public.order_items
for select
using (public.is_admin());

create policy "order_status_history_customer_read_own"
on public.order_status_history
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_status_history.order_id
      and o.user_id = auth.uid()
  )
);

create policy "order_status_history_admin_read_all"
on public.order_status_history
for select
using (public.is_admin());

create policy "notifications_customer_read_own"
on public.notifications
for select
using (auth.uid() = user_id);

create policy "notifications_admin_read_all"
on public.notifications
for select
using (public.is_admin());
