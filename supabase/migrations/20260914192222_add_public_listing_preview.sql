-- Link-preview bots (WhatsApp, etc.) fetch a shared listing URL with no
-- session, so RLS correctly hides the real row from them -- generateMetadata
-- was falling back to generic site branding for every single listing link.
-- This whitelists exactly three fields (title, price, first photo) for an
-- anonymous preview card. Nothing else -- no seller identity, no
-- description, no meetup spot -- is exposed. The photo itself was already
-- publicly fetchable by URL regardless (the listing-images storage bucket
-- is public), so this doesn't newly expose anything beyond what a crawler
-- could already reach if it had the image URL directly.
create or replace function public.get_public_listing_preview(p_listing_id uuid)
returns table (title text, price numeric, image text)
language sql
stable
security definer
set search_path = public
as $$
  select title, price, images[1] as image
  from public.listings
  where id = p_listing_id;
$$;

revoke all on function public.get_public_listing_preview(uuid) from public;
grant execute on function public.get_public_listing_preview(uuid) to anon, authenticated;
