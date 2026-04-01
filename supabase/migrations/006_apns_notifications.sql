create type public.app_target as enum ('customer_ios', 'mommy_ios');
create type public.push_environment as enum ('sandbox', 'production');

alter type public.notification_provider add value if not exists 'apns';
alter type public.notification_type add value if not exists 'order_placed';

alter table public.device_tokens rename column fcm_token to device_token;
alter table public.device_tokens drop constraint if exists device_tokens_fcm_token_key;
alter table public.device_tokens drop constraint if exists device_tokens_device_token_key;
alter table public.device_tokens add column if not exists app_target public.app_target not null default 'customer_ios';
alter table public.device_tokens add column if not exists push_environment public.push_environment not null default 'production';
alter table public.device_tokens add constraint device_tokens_device_token_app_target_key unique (device_token, app_target);

alter table public.notifications add column if not exists app_target public.app_target not null default 'customer_ios';

create index if not exists idx_device_tokens_user_app_target on public.device_tokens(user_id, app_target);
create index if not exists idx_notifications_user_app_target_created_at on public.notifications(user_id, app_target, created_at desc);
