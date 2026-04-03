alter table public.tenant_settings
add column if not exists onboarding_menu_choice text
check (onboarding_menu_choice in ('sample', 'empty'));
