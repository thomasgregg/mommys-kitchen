alter table public.app_settings
add column if not exists language_code text not null default 'de' check (language_code ~ '^[a-z]{2}$');

update public.app_settings
set language_code = case
  when locale_identifier like 'de-%' then 'de'
  when locale_identifier like 'fr-%' then 'fr'
  when locale_identifier like 'it-%' then 'it'
  else 'en'
end
where language_code is null
   or language_code = '';
