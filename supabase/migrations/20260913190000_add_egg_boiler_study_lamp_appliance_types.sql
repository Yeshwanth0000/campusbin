-- Egg Boiler joins Kitchen & Cooking, and a new Lighting group covers Study
-- Lamp -- these are code-only additions to categoryFields.ts's option
-- lists, nothing to migrate for the taxonomy itself.

-- One existing listing was filed under Electronics before "Study Lamp"
-- existed as an Appliances type -- move it and tag its type, the same
-- correction already made for the Calculators split. A second lamp
-- listing ("Study Lamp Table") stays in Furniture; it's a desk/lamp
-- combo, not a standalone appliance.
update public.listings
set category_id = (select id from public.categories where slug = 'appliances'),
    custom_fields = custom_fields || '{"type": "Study Lamp"}'::jsonb
where id = 'bf907b03-10aa-41a6-899a-e94c41568bcb'; -- "Study Lamp with USB port"
