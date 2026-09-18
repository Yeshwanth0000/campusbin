import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "./HeaderNav";
import SearchIconButton from "./SearchIconButton";
import CommandPalette from "./CommandPalette";
import ThemeToggle from "./ThemeToggle";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";
import FloatingHeaderShell from "./FloatingHeaderShell";
import Logo from "./Logo";
import CollegeSwitcher from "./CollegeSwitcher";
import type { NotificationLike } from "@/lib/notificationDisplay";

export default async function Header() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: categories },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("categories").select("id, name, slug").order("name"),
  ]);

  let collegeName: string | null = null;
  let isAdmin = false;
  let isSuperadmin = false;
  let allColleges: { id: string; name: string }[] | null = null;
  let hasUnread = false;
  let unreadNotificationCount = 0;
  let recentNotifications: NotificationLike[] = [];
  if (user) {
    const [{ data: profile }, { count }, { count: notifCount }, { data: notifRows }, { data: collegesData }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("is_admin, is_superadmin, colleges(name)")
          .eq("id", user.id)
          .single(),
        supabase
          .from("messages")
          .select("id, conversations!inner(buyer_id, seller_id)", {
            count: "exact",
            head: true,
          })
          .is("read_at", null)
          .neq("sender_id", user.id)
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`, {
            foreignTable: "conversations",
          }),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null),
        supabase
          .from("notifications")
          .select("id, type, payload, read_at, created_at")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6),
        // Small, sitewide-static table — cheap enough to fetch unconditionally
        // rather than adding a second round-trip once we know is_superadmin.
        supabase.from("colleges").select("id, name").order("name"),
      ]);
    collegeName = profile?.colleges?.name ?? null;
    isAdmin = profile?.is_admin ?? false;
    isSuperadmin = profile?.is_superadmin ?? false;
    allColleges = collegesData ?? null;
    hasUnread = (count ?? 0) > 0;
    unreadNotificationCount = notifCount ?? 0;
    recentNotifications = notifRows ?? [];
  }

  return (
    <>
      <FloatingHeaderShell>
        <div className="flex w-full items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Logo size={28} className="rounded-[6px]" />
            <span className="text-xl font-bold text-brand">CampusBin</span>
            {collegeName && !isSuperadmin && (
              <span className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:inline">
                {collegeName}
              </span>
            )}
          </Link>

          {isSuperadmin && allColleges && (
            <CollegeSwitcher
              colleges={allColleges}
              className="hidden shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand dark:bg-slate-900 dark:text-slate-300 md:inline-block"
            />
          )}

          {user && (
            <div className="hidden flex-1 sm:flex">
              <CommandPalette categories={categories ?? []} />
            </div>
          )}

          <div className="ml-auto flex items-center gap-1">
            {user && <SearchIconButton />}
            {user && (
              <NotificationBell
                userId={user.id}
                unreadCount={unreadNotificationCount}
                recentNotifications={recentNotifications}
              />
            )}
            <ThemeToggle />
            <HeaderNav isLoggedIn={!!user} hasUnread={hasUnread} isAdmin={isAdmin} />
          </div>
        </div>
      </FloatingHeaderShell>

      {user && <BottomNav hasUnread={hasUnread} />}
    </>
  );
}
