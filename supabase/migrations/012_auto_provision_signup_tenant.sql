create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_existing_tenant_id uuid;
  v_existing_tenant_status public.tenant_status;
  v_raw_tenant_slug text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'tenant_slug', '')), '');
  v_raw_tenant_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'tenant_name', '')), '');
  v_create_tenant boolean := lower(coalesce(new.raw_user_meta_data ->> 'create_tenant', 'false')) in ('1', 'true', 'yes', 'on');
  v_tenant_slug text;
  v_tenant_name text;
  v_profile_role public.app_role := 'customer';
  v_membership_role public.tenant_role := 'customer';
  v_currency_code text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'currency_code', '')), '');
  v_language_code text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'language_code', '')), '');
  v_locale_identifier text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'locale_identifier', '')), '');
begin
  if v_raw_tenant_slug is not null then
    v_tenant_slug := trim(both '-' from regexp_replace(lower(v_raw_tenant_slug), '[^a-z0-9]+', '-', 'g'));
  end if;

  v_tenant_name := v_raw_tenant_name;

  if v_tenant_slug is not null and v_tenant_slug <> '' then
    select id
    into v_tenant_id
    from public.tenants
    where slug = v_tenant_slug
      and status = 'active'
    limit 1;

    if v_tenant_id is not null and v_create_tenant then
      raise exception 'Tenant slug already exists';
    end if;

    if v_tenant_id is null and v_create_tenant and v_tenant_name is null then
      raise exception 'Tenant name is required';
    end if;

    if v_tenant_id is null and v_tenant_name is not null then
      select id, status
      into v_existing_tenant_id, v_existing_tenant_status
      from public.tenants
      where slug = v_tenant_slug
      limit 1;

      if v_existing_tenant_id is not null then
        if v_existing_tenant_status <> 'active' then
          raise exception 'Tenant % is not active', v_tenant_slug;
        end if;

        if v_create_tenant then
          raise exception 'Tenant slug already exists';
        end if;

        v_tenant_id := v_existing_tenant_id;
      else
        insert into public.tenants (slug, name, status, is_default)
        values (v_tenant_slug, v_tenant_name, 'active', false)
        on conflict (slug) do nothing
        returning id into v_tenant_id;

        if v_tenant_id is null then
          select id
          into v_tenant_id
          from public.tenants
          where slug = v_tenant_slug
            and status = 'active'
          limit 1;
        end if;
      end if;

      insert into public.tenant_settings (
        tenant_id,
        currency_code,
        language_code,
        locale_identifier
      )
      values (
        v_tenant_id,
        coalesce(v_currency_code, 'EUR'),
        coalesce(v_language_code, 'de'),
        coalesce(v_locale_identifier, 'de-DE')
      )
      on conflict (tenant_id) do nothing;

      if v_existing_tenant_id is null then
        v_profile_role := 'admin';
        v_membership_role := 'owner';
      end if;
    end if;
  end if;

  v_tenant_id := coalesce(v_tenant_id, public.get_default_tenant_id());

  insert into public.profiles (id, tenant_id, full_name, phone, role)
  values (
    new.id,
    v_tenant_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    v_profile_role
  )
  on conflict (id) do update
    set
      tenant_id = excluded.tenant_id,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      phone = excluded.phone,
      role = excluded.role,
      updated_at = timezone('utc', now());

  insert into public.tenant_memberships (tenant_id, user_id, role)
  values (v_tenant_id, new.id, v_membership_role)
  on conflict (tenant_id, user_id) do update
    set role = excluded.role, updated_at = timezone('utc', now());

  return new;
end;
$$;
