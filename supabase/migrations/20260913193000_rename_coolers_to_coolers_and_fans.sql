-- Fans move here from Appliances' Cooling & Comfort group, so the category
-- is renamed to reflect that. Slug stays "coolers" -- it's just the
-- internal identifier, not shown to users.
update public.categories
set name = 'Coolers & Fans'
where slug = 'coolers';
