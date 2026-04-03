create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_tenant_slug text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'tenant_slug', '')), '');
begin
  if v_tenant_slug is not null then
    select id
    into v_tenant_id
    from public.tenants
    where slug = v_tenant_slug
      and status = 'active';
  end if;

  v_tenant_id := coalesce(v_tenant_id, public.get_default_tenant_id());

  insert into public.profiles (id, tenant_id, full_name, phone)
  values (
    new.id,
    v_tenant_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update
    set
      tenant_id = excluded.tenant_id,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      phone = excluded.phone;

  return new;
end;
$$;

create or replace function public.provision_tenant(
  p_slug text,
  p_name text,
  p_owner_user_id uuid,
  p_owner_full_name text default null,
  p_owner_phone text default null,
  p_currency_code text default 'EUR',
  p_language_code text default 'de',
  p_locale_identifier text default 'de-DE'
)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_tenant public.tenants;
begin
  if v_slug = '' then
    raise exception 'Tenant slug is required';
  end if;

  if v_name = '' then
    raise exception 'Tenant name is required';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Tenant slug must use lowercase letters, numbers, and hyphens only';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_owner_user_id
  ) then
    raise exception 'Owner auth user not found';
  end if;

  if exists (
    select 1
    from public.tenants
    where slug = v_slug
  ) then
    raise exception 'Tenant slug already exists';
  end if;

  insert into public.tenants (slug, name, status, is_default)
  values (v_slug, v_name, 'active', false)
  returning * into v_tenant;

  insert into public.tenant_settings (
    tenant_id,
    currency_code,
    language_code,
    locale_identifier
  )
  values (
    v_tenant.id,
    p_currency_code,
    p_language_code,
    p_locale_identifier
  )
  on conflict (tenant_id) do update
    set
      currency_code = excluded.currency_code,
      language_code = excluded.language_code,
      locale_identifier = excluded.locale_identifier,
      updated_at = timezone('utc', now());

  update public.profiles
  set
    tenant_id = v_tenant.id,
    full_name = coalesce(nullif(trim(coalesce(p_owner_full_name, '')), ''), full_name),
    phone = coalesce(nullif(trim(coalesce(p_owner_phone, '')), ''), phone),
    role = 'admin',
    updated_at = timezone('utc', now())
  where id = p_owner_user_id;

  if not found then
    insert into public.profiles (id, tenant_id, full_name, phone, role)
    values (
      p_owner_user_id,
      v_tenant.id,
      nullif(trim(coalesce(p_owner_full_name, '')), ''),
      nullif(trim(coalesce(p_owner_phone, '')), ''),
      'admin'
    );
  end if;

  delete from public.tenant_memberships
  where user_id = p_owner_user_id;

  insert into public.tenant_memberships (tenant_id, user_id, role)
  values (v_tenant.id, p_owner_user_id, 'owner')
  on conflict (tenant_id, user_id) do update
    set role = 'owner', updated_at = timezone('utc', now());

  return v_tenant;
end;
$$;
