insert into public.app_settings (singleton_key, currency_code, language_code, locale_identifier)
values ('global', 'EUR', 'de', 'de-DE')
on conflict (singleton_key) do update
set
  currency_code = excluded.currency_code,
  language_code = excluded.language_code,
  locale_identifier = excluded.locale_identifier;

insert into public.menu_categories (name, sort_order, is_active)
values
  ('Favorites', 1, true),
  ('Comfort Classics', 2, true),
  ('Soups & Sides', 3, true)
on conflict do nothing;

with categories as (
  select id, name from public.menu_categories
)
insert into public.menu_items (
  category_id,
  name,
  description,
  image_url,
  price_cents,
  prep_minutes,
  is_available,
  is_featured
)
values
  ((select id from categories where name = 'Favorites'), 'Pizza', 'Cheesy oven-baked pizza with a kid-friendly tomato sauce and stretchy mozzarella.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80', 1299, 20, true, true),
  ((select id from categories where name = 'Comfort Classics'), 'Mac & Cheese', 'Creamy elbow macaroni folded into a rich cheddar sauce and baked until golden.', 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=1200&q=80', 899, 15, true, true),
  ((select id from categories where name = 'Favorites'), 'Chicken Nuggets', 'Crispy all-white-meat nuggets served hot and perfect for dipping.', 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=1200&q=80', 799, 12, true, false),
  ((select id from categories where name = 'Comfort Classics'), 'Spaghetti & Meatballs', 'Tender meatballs with spaghetti and a slow-simmered marinara.', 'https://images.unsplash.com/photo-1622973536968-3ead9e780960?auto=format&fit=crop&w=1200&q=80', 1399, 22, true, true),
  ((select id from categories where name = 'Favorites'), 'Grilled Cheese', 'Butter-toasted sourdough with melted cheddar and mozzarella.', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80', 699, 10, true, false),
  ((select id from categories where name = 'Soups & Sides'), 'Tomato Soup', 'Velvety tomato soup finished with basil and a touch of cream.', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80', 599, 8, true, false)
on conflict do nothing;
