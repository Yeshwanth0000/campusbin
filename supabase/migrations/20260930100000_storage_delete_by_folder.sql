-- Step 1 of stopping photo uploads that skip moderation (step 2 is
-- 20260930110000_only_server_stores_photos).
--
-- Photos are moving to being stored by the server with the service-role key,
-- which leaves storage.objects.owner empty, so "users can delete their own
-- photos" can't keep matching on owner: a seller couldn't delete a listing's
-- photos, and replacing a profile picture would leave the old file behind.
-- Match on the folder instead. Every photo lives under its user's id, which
-- also covers today's owned files, so this is safe to apply before the upload
-- change ships.

drop policy if exists "users can delete their own listing images" on storage.objects;
create policy "users can delete their own listing images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "users can delete their own avatar" on storage.objects;
create policy "users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
