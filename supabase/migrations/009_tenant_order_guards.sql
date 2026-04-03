create or replace function public.current_user_tenant_id()
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
  v_tenant_id uuid;
begin
  if p_cart_items is null or jsonb_typeof(p_cart_items) <> 'array' or jsonb_array_length(p_cart_items) = 0 then
    raise exception 'Cart must contain at least one item';
  end if;

  select tenant_id
  into v_tenant_id
  from public.profiles
  where id = p_user_id;

  if v_tenant_id is null then
    raise exception 'User tenant not found';
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
      and tenant_id = v_tenant_id
      and is_available = true;

    if not found then
      raise exception 'Menu item % is unavailable', v_item ->> 'menu_item_id';
    end if;

    v_subtotal := v_subtotal + (v_menu_item.price_cents * v_quantity);
  end loop;

  select timezone('utc', now()) + make_interval(mins => coalesce(max(mi.prep_minutes), 15))
  into v_estimated_ready
  from jsonb_array_elements(p_cart_items) item
  join public.menu_items mi on mi.id = (item ->> 'menu_item_id')::uuid
  where mi.tenant_id = v_tenant_id;

  insert into public.orders (
    tenant_id,
    user_id,
    status,
    subtotal_cents,
    total_cents,
    notes,
    estimated_ready_at,
    placed_at
  )
  values (
    v_tenant_id,
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
    where id = (v_item ->> 'menu_item_id')::uuid
      and tenant_id = v_tenant_id;

    insert into public.order_items (
      tenant_id,
      order_id,
      menu_item_id,
      quantity,
      unit_price_cents,
      item_name_snapshot
    )
    values (
      v_tenant_id,
      v_order.id,
      v_menu_item.id,
      v_quantity,
      v_menu_item.price_cents,
      v_menu_item.name
    );
  end loop;

  insert into public.order_status_history (
    tenant_id,
    order_id,
    status,
    changed_by_user_id,
    note
  )
  values (
    v_tenant_id,
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
  v_actor_tenant_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  select role, tenant_id
  into v_actor_role, v_actor_tenant_id
  from public.profiles
  where id = p_changed_by_user_id;

  if v_actor_role is null then
    raise exception 'Actor profile not found';
  end if;

  if v_actor_tenant_id is null or v_actor_tenant_id <> v_order.tenant_id then
    raise exception 'Actor does not belong to this tenant';
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
    tenant_id,
    order_id,
    status,
    changed_by_user_id,
    note
  )
  values (
    v_order.tenant_id,
    p_order_id,
    p_new_status,
    p_changed_by_user_id,
    nullif(trim(coalesce(p_note, '')), '')
  );

  return v_order;
end;
$$;
