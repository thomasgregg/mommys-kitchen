alter table public.tenant_settings
add column if not exists settings_reviewed_at timestamptz;

alter table public.tenant_settings
add column if not exists onboarding_completed_at timestamptz;
