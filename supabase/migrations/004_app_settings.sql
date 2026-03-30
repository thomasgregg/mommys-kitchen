create table public.app_settings (
  singleton_key text primary key default 'global' check (singleton_key = 'global'),
  currency_code text not null default 'EUR' check (currency_code ~ '^[A-Z]{3}$'),
  locale_identifier text not null default 'de-DE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

insert into public.app_settings (singleton_key, currency_code, locale_identifier)
values ('global', 'EUR', 'de-DE')
on conflict (singleton_key) do update
set
  currency_code = excluded.currency_code,
  locale_identifier = excluded.locale_identifier;

revoke all on table public.app_settings from anon;
grant select on table public.app_settings to authenticated;
grant insert, update on table public.app_settings to authenticated;

alter table public.app_settings enable row level security;

create policy "app_settings_authenticated_read"
on public.app_settings
for select
using (auth.role() = 'authenticated');

create policy "app_settings_admin_manage"
on public.app_settings
for all
using (public.is_admin())
with check (public.is_admin());
