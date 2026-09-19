-- Removes the Fashion/clothing category entirely, per product decision to
-- not host clothing listings at all (sidesteps photo-moderation edge cases
-- around swimwear/underwear that a computer-vision threshold can't cleanly
-- resolve on its own). Only one listing referenced this category, and it
-- was leftover test data ("[TEST] Denim jacket, size M"), not a real
-- student's listing.

delete from public.listings where id = 'a18acb1e-b8d5-402b-bb75-8480575d75d8';
delete from public.categories where id = '98459c0f-8abb-4ebe-b25a-0ceb752872b4';
