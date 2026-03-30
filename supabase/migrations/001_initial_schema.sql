create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');
create type public.order_status as enum (
  'placed',
  'accepted',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'rejected'
);
create type public.device_platform as enum ('ios');
create type public.notification_status as enum ('queued', 'sent', 'delivered', 'failed');
create type public.notification_provider as enum ('fcm');
create type public.notification_type as enum (
  'order_accepted',
  'order_preparing',
  'order_ready',
  'order_completed',
  'order_cancelled',
  'order_rejected'
);

create sequence if not exists public.order_number_seq start 1001;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  next_value bigint;
begin
  next_value := nextval('public.order_number_seq');
  return 'MK-' || next_value;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fcm_token text not null,
  platform public.device_platform not null default 'ios',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (fcm_token)
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  name text not null unique,
  description text not null,
  image_url text,
  price_cents integer not null check (price_cents >= 0),
  prep_minutes integer not null check (prep_minutes >= 0),
  is_available boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_number text not null unique default public.generate_order_number(),
  status public.order_status not null default 'placed',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text,
  estimated_ready_at timestamptz,
  placed_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  item_name_snapshot text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by_user_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  status public.notification_status not null default 'queued',
  provider public.notification_provider not null default 'fcm',
  external_id text,
  payload_json jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_profiles_role on public.profiles(role);
create index idx_device_tokens_user_id on public.device_tokens(user_id);
create index idx_menu_categories_sort_order on public.menu_categories(sort_order) where is_active = true;
create index idx_menu_items_category_id on public.menu_items(category_id);
create index idx_menu_items_available on public.menu_items(is_available) where is_available = true;
create index idx_orders_user_id_created_at on public.orders(user_id, created_at desc);
create index idx_orders_status_created_at on public.orders(status, created_at desc);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_status_history_order_id_created_at on public.order_status_history(order_id, created_at desc);
create index idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);
create index idx_notifications_order_id_created_at on public.notifications(order_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger device_tokens_set_updated_at
before update on public.device_tokens
for each row execute function public.set_updated_at();

create trigger menu_categories_set_updated_at
before update on public.menu_categories
for each row execute function public.set_updated_at();

create trigger menu_items_set_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'customer'::public.app_role);
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

create or replace function public.is_valid_order_transition(
  current_status public.order_status,
  next_status public.order_status,
  actor_role public.app_role
)
returns boolean
language plpgsql
immutable
as $$
begin
  if actor_role = 'customer' then
    return current_status = 'placed' and next_status = 'cancelled';
  end if;

  case current_status
    when 'placed' then
      return next_status in ('accepted', 'rejected', 'cancelled');
    when 'accepted' then
      return next_status in ('preparing', 'cancelled');
    when 'preparing' then
      return next_status in ('ready', 'cancelled');
    when 'ready' then
      return next_status = 'completed';
    else
      return false;
  end case;
end;
$$;

create or replace function public.create_order_for_user(
  p_user_id uuid,
  p_cart_items jsonb,
  p_notes text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_subtotal integer := 0;
  v_item jsonb;
  v_menu_item public.menu_items;
  v_quantity integer;
  v_estimated_ready timestamptz;
begin
  if p_cart_items is null or jsonb_typeof(p_cart_items) <> 'array' or jsonb_array_length(p_cart_items) = 0 then
    raise exception 'Cart must contain at least one item';
  end if;

  for v_item in select * from jsonb_array_elements(p_cart_items)
  loop
    v_quantity := greatest((v_item ->> 'quantity')::integer, 0);

    if v_quantity <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    select *
    into v_menu_item
    from public.menu_items
    where id = (v_item ->> 'menu_item_id')::uuid
      and is_available = true;

    if not found then
      raise exception 'Menu item % is unavailable', v_item ->> 'menu_item_id';
    end if;

    v_subtotal := v_subtotal + (v_menu_item.price_cents * v_quantity);
  end loop;

  select timezone('utc', now()) + make_interval(mins => coalesce(max(mi.prep_minutes), 15))
  into v_estimated_ready
  from jsonb_array_elements(p_cart_items) item
  join public.menu_items mi on mi.id = (item ->> 'menu_item_id')::uuid;

  insert into public.orders (
    user_id,
    status,
    subtotal_cents,
    total_cents,
    notes,
    estimated_ready_at,
    placed_at
  )
  values (
    p_user_id,
    'placed',
    v_subtotal,
    v_subtotal,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_estimated_ready,
    timezone('utc', now())
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_cart_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    select *
    into v_menu_item
    from public.menu_items
    where id = (v_item ->> 'menu_item_id')::uuid;

    insert into public.order_items (
      order_id,
      menu_item_id,
      quantity,
      unit_price_cents,
      item_name_snapshot
    )
    values (
      v_order.id,
      v_menu_item.id,
      v_quantity,
      v_menu_item.price_cents,
      v_menu_item.name
    );
  end loop;

  insert into public.order_status_history (
    order_id,
    status,
    changed_by_user_id,
    note
  )
  values (
    v_order.id,
    'placed',
    p_user_id,
    'Order placed'
  );

  return v_order;
end;
$$;

create or replace function public.apply_order_status_transition(
  p_order_id uuid,
  p_new_status public.order_status,
  p_changed_by_user_id uuid,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_actor_role public.app_role;
  v_now timestamptz := timezone('utc', now());
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  select role
  into v_actor_role
  from public.profiles
  where id = p_changed_by_user_id;

  if v_actor_role is null then
    raise exception 'Actor profile not found';
  end if;

  if v_actor_role = 'customer' and v_order.user_id <> p_changed_by_user_id then
    raise exception 'Customers may only modify their own orders';
  end if;

  if not public.is_valid_order_transition(v_order.status, p_new_status, v_actor_role) then
    raise exception 'Invalid order transition from % to % for role %', v_order.status, p_new_status, v_actor_role;
  end if;

  update public.orders
  set
    status = p_new_status,
    accepted_at = case when p_new_status = 'accepted' then v_now else accepted_at end,
    ready_at = case when p_new_status = 'ready' then v_now else ready_at end,
    completed_at = case when p_new_status = 'completed' then v_now else completed_at end,
    cancelled_at = case when p_new_status = 'cancelled' then v_now else cancelled_at end,
    rejected_at = case when p_new_status = 'rejected' then v_now else rejected_at end,
    estimated_ready_at = case
      when p_new_status = 'accepted' and estimated_ready_at is null then v_now + interval '20 minutes'
      else estimated_ready_at
    end
  where id = p_order_id
  returning * into v_order;

  insert into public.order_status_history (
    order_id,
    status,
    changed_by_user_id,
    note
  )
  values (
    p_order_id,
    p_new_status,
    p_changed_by_user_id,
    nullif(trim(coalesce(p_note, '')), '')
  );

  return v_order;
end;
$$;

revoke execute on function public.create_order_for_user(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.apply_order_status_transition(uuid, public.order_status, uuid, text) from public, anon, authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.device_tokens from anon;
revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;
revoke all on table public.order_status_history from anon;
revoke all on table public.notifications from anon;
revoke all on table public.menu_categories from anon;
revoke all on table public.menu_items from anon;

grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, updated_at) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.device_tokens to authenticated;
grant select on table public.menu_categories to authenticated;
grant select on table public.menu_items to authenticated;
grant insert, update on table public.menu_categories to authenticated;
grant insert, update on table public.menu_items to authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select on table public.order_status_history to authenticated;
grant select on table public.notifications to authenticated;
