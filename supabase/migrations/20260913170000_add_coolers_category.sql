-- Coolers were originally proposed as an Appliances subcategory, but they're
-- common and distinct enough on a campus (every hostel room debates buying
-- one every summer) to warrant their own top-level category rather than
-- being buried one click deeper.
insert into public.categories (name, slug)
values ('Coolers', 'coolers')
on conflict (slug) do nothing;
