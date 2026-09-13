-- Calculator was a "type" option buried inside Electronics -> Other, but
-- it's common enough on campus (every engineering student needs a
-- scientific calculator) to be its own top-level category, the same call
-- already made for Coolers.
insert into public.categories (name, slug)
values ('Calculators', 'calculators')
on conflict (slug) do nothing;

-- Move the two existing calculator listings that were filed under
-- Electronics before this category existed.
update public.listings
set category_id = (select id from public.categories where slug = 'calculators')
where id in (
  'd1674e52-93c1-47b9-819c-785de9dc008a', -- "Calci"
  '655a1ba6-a883-4c0f-a5ac-200d399cfcb1'  -- "Casio Scientific Calculator fx-991ES"
);
