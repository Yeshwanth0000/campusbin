-- Deleting an account cascades through auth.users, but these two references
-- had no ON DELETE action, so an admin who had ever resolved a report or
-- logged a platform expense could not delete their own account (the delete
-- failed on the foreign key). Keep the historical rows, just drop the link.

alter table public.reports
  drop constraint reports_resolved_by_fkey,
  add constraint reports_resolved_by_fkey
    foreign key (resolved_by) references auth.users (id) on delete set null;

alter table public.platform_expenses
  drop constraint platform_expenses_created_by_fkey,
  add constraint platform_expenses_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;
