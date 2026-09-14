import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markConversationRead } from "@/app/actions/chat";
import ChatThread from "./ChatThread";
import SafetyMenu from "@/components/SafetyMenu";
import Avatar from "@/components/Avatar";

const DEFAULT_TITLE = "CampusBin — Your Campus Marketplace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { title: DEFAULT_TITLE };

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "buyer_id, buyer:profiles!conversations_buyer_id_fkey(full_name), seller:profiles!conversations_seller_id_fkey(full_name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!conversation) return { title: DEFAULT_TITLE };

  const otherPerson = conversation.buyer_id === user.id ? conversation.seller : conversation.buyer;
  return {
    title: otherPerson?.full_name ? `${otherPerson.full_name} — CampusBin` : DEFAULT_TITLE,
  };
}

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // These three don't depend on each other's results — only on `id`, which
  // is already known — so they run concurrently instead of one round-trip
  // at a time. markConversationRead racing the messages select is fine:
  // ChatThread's realtime subscription picks up the read_at UPDATE moments
  // later regardless of which one lands first.
  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, listing:listings(id, title, price, images, condition, status), buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url), seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("messages")
      .select("id, content, sender_id, created_at, read_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    markConversationRead(id),
  ]);

  if (!conversation) notFound();
  if (conversation.buyer?.id !== user.id && conversation.seller?.id !== user.id) {
    notFound();
  }

  const otherPerson =
    conversation.buyer?.id === user.id ? conversation.seller : conversation.buyer;

  return (
    // These constants are the real chrome this page sits between, measured
    // rather than guessed. Phones: the site header hides itself on an open
    // conversation (FloatingHeaderShell), so only the 63px bottom nav is
    // left. sm: 62px header + 63px nav. lg: 62px header, no bottom nav.
    // dvh, not vh: vh is the mobile browser's tallest possible viewport
    // (address bar collapsed), so with the address bar visible the container
    // was taller than what's actually on screen — pushing the message input
    // below the fold until the page was scrolled. dvh tracks the real,
    // currently-visible viewport as the address bar shows or hides.
    <div className="mx-auto flex h-[calc(100dvh-63px)] w-full max-w-none flex-col px-3 py-3 sm:h-[calc(100dvh-126px)] sm:max-w-[min(94vw,72rem)] sm:px-4 sm:py-4 lg:h-[calc(100dvh-64px)]">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 sm:items-start">
        {/* Icon back-button replaces the "All chats" text line on phones —
            WhatsApp-style single-row header instead of two stacked lines,
            which was costing about 12px of height for no information the
            icon doesn't already carry. sm+ keeps the original text link,
            since there's room to spare and it reads better with a mouse. */}
        <Link
          href="/chat"
          aria-label="All chats"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <Avatar avatarUrl={otherPerson?.avatar_url} name={otherPerson?.full_name ?? "S"} size={40} className="shrink-0 sm:mt-0.5" />
        <div className="min-w-0 flex-1">
          <Link
            href="/chat"
            className="hidden text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 sm:block"
          >
            ← All chats
          </Link>
          <h1 className="truncate text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
            {otherPerson?.full_name ?? "Student"}
          </h1>
        </div>
        {otherPerson?.id && (
          <div className="sm:pt-3">
            <SafetyMenu userId={otherPerson.id} />
          </div>
        )}
      </div>

      <ChatThread
        conversationId={id}
        currentUserId={user.id}
        initialMessages={messages ?? []}
        listing={conversation.listing}
      />
    </div>
  );
}
