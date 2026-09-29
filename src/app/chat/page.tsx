import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/lib/notificationDisplay";

export const metadata = { title: "Your chats — CampusBin" };

export default async function ChatListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: conversations }, { data: unreadRows }, { data: recentMessages }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select(
          "id, created_at, listing:listings(id, title, images), buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url), seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)"
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("messages")
        .select("conversation_id")
        .is("read_at", null)
        .neq("sender_id", user.id),
      // One ordered pass over the messages RLS already lets this user see,
      // reduced to the newest per conversation below — a per-conversation
      // query would have been one round trip per row.
      supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id")
        .order("created_at", { ascending: false })
        // Bounded so this can't grow into fetching an entire message history
        // on every visit. A thread whose last message falls outside the window
        // simply falls back to showing the listing title, as before.
        .limit(500),
    ]);
  const unreadConversationIds = new Set(unreadRows?.map((r) => r.conversation_id));

  const lastMessageByConversation = new Map<
    string,
    { content: string; created_at: string; sender_id: string }
  >();
  for (const m of recentMessages ?? []) {
    if (!lastMessageByConversation.has(m.conversation_id)) {
      lastMessageByConversation.set(m.conversation_id, m);
    }
  }

  // Order by latest activity, the way every messaging app does. Ordering by
  // the conversation's own created_at buried a thread that just got a reply
  // under silent ones that happened to be started more recently.
  const sortedConversations = [...(conversations ?? [])].sort((a, b) => {
    const aTime = lastMessageByConversation.get(a.id)?.created_at ?? a.created_at;
    const bTime = lastMessageByConversation.get(b.id)?.created_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className="mx-auto w-full max-w-none px-3 py-4 sm:max-w-[min(94vw,72rem)] sm:px-4 sm:py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your chats</h1>

      {sortedConversations.length > 0 ? (
        <ul className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {sortedConversations.map((c) => {
            const otherPerson = c.buyer?.id === user.id ? c.seller : c.buyer;
            const isUnread = unreadConversationIds.has(c.id);
            const last = lastMessageByConversation.get(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/chat/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Avatar avatarUrl={otherPerson?.avatar_url} name={otherPerson?.full_name ?? "S"} size={40} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        isUnread
                          ? "font-bold text-slate-900 dark:text-slate-100"
                          : "font-semibold text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {otherPerson?.full_name ?? "Student"}
                    </p>
                    {/* The last message is what tells you whether a thread
                        needs you; the listing title is still one tap away and
                        was pushing the useful line off the row entirely. */}
                    <p
                      className={`truncate text-xs ${
                        isUnread
                          ? "font-medium text-slate-700 dark:text-slate-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {last
                        ? `${last.sender_id === user.id ? "You: " : ""}${last.content}`
                        : c.listing?.title}
                    </p>
                  </div>
                  {last && (
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
                      {timeAgo(last.created_at)}
                    </span>
                  )}
                  {isUnread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />}
                  {c.listing?.images?.[0] && (
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Image src={c.listing.images[0]} alt="" fill sizes="44px" className="object-cover" />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-3.5-.64L3 21l1.5-4.2A7.9 7.9 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          }
          title="No conversations yet"
          description="Message a seller from any listing to start a chat with them."
          actionHref="/browse"
          actionLabel="Browse listings"
        />
      )}
    </div>
  );
}
